class CodeClimaxContent {
  constructor() {
    this.isActive = true;
    this.lastSubmissionTime = 0;
    this.lastCelebrationTime = 0;
    this.isShowingCelebration = false;
    this.currentOverlay = null;
    this.lastSuccessUrl = null;
    this.init();
  }

  async init() {
    console.log('CodeClimax initialized');

    // Check if extension is enabled
    const settings = await this.getSettings();
    if (!settings?.enabled) {
      console.log('CodeClimax is disabled');
      return;
    }

    // Start monitoring for successful submissions
    this.monitorSubmissions();

    // Listen for navigation changes
    this.observePageChanges();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleExtension') {
        this.isActive = request.enabled;
        sendResponse({ success: true });
      } else if (request.action === 'toggleApiMonitoring') {
        console.log('CodeClimax: Celebration detection toggled:', request.enabled);
        sendResponse({ success: true });
      }
    });
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      return result.settings || {
        enabled: true,
        randomize: true,
        defaultDuration: 5,
        autoPlay: true,
        volume: 0.5
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }

  observePageChanges() {
    // Reset state when navigating to a new problem
    const currentUrl = window.location.href;
    if (this.lastSuccessUrl && this.lastSuccessUrl !== currentUrl) {
      console.log('CodeClimax: URL changed, resetting celebration state');
      this.isShowingCelebration = false;
      this.currentOverlay = null;
    }

    // Listen for navigation changes
    let lastUrl = currentUrl;
    const checkUrlChange = () => {
      if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        if (this.isShowingCelebration) {
          console.log('CodeClimax: Navigation detected, closing any active celebration');
          this.closeCurrentCelebration();
        }
        this.isShowingCelebration = false;
        this.currentOverlay = null;
        // Don't reset lastSuccessUrl here - let success detection handle it
      }
    };

    // Note: Removed URL-based celebration closing to prevent celebrations from closing immediately
    // Celebrations now rely on their auto-close timers and manual dismissal only
  }

  closeCurrentCelebration() {
    if (this.currentOverlay) {
      this.currentOverlay.remove();
      this.currentOverlay = null;
    }
    this.isShowingCelebration = false;
  }

  monitorSubmissions() {
    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          this.checkForSuccessNotification();
        }
      });
    });

    // Start observing the document body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check periodically as a fallback
    setInterval(() => {
      this.checkForSuccessNotification();
    }, 3000); // Increased interval to reduce checks
  }

  checkForSuccessNotification() {
    if (!this.isActive || this.isShowingCelebration) return;

    const now = Date.now();

    // Check if extension is enabled via toggle
    this.getSettings().then(settings => {
      if (settings.apiMonitoringEnabled === false) {
        return; // Skip if disabled by toggle
      }

      // Debounce - don't show multiple celebrations in quick succession
      if (now - this.lastSubmissionTime < 8000) return;

      // Time-based protection - don't show celebrations too frequently (prevents old submissions from triggering)
      if (now - this.lastCelebrationTime < 30000) {
        console.log('CodeClimax: Skipping celebration - shown too recently');
        return;
      }

      // Check current URL to avoid duplicate triggers on same page
      const currentUrl = window.location.href;
      if (this.lastSuccessUrl === currentUrl) {
        return;
      }

      // Look for various success indicators on LeetCode
      const successSelectors = [
        '[data-e2e-locator="submission-result"]',
        '.success__3Ai7',
        '[data-cy="submission-result"]',
        '.text-success',
        '[class*="success"]',
        '[class*="accepted"]'
      ];

      let successFound = false;
      let successText = '';

      for (const selector of successSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.toLowerCase();
          if (text.includes('accepted') || text.includes('success') || text.includes('passed')) {
            successFound = true;
            successText = text;
            console.log('CodeClimax: Success detected via selector:', selector, 'Text:', text);
            break;
          }
        }
      }

      // Also check for the green success banner
      const successBanner = document.querySelector('[class*="success"]');
      if (successBanner && successBanner.textContent.toLowerCase().includes('accepted')) {
        successFound = true;
        successText = successBanner.textContent;
        console.log('CodeClimax: Success detected via banner:', successText);
      }

      if (successFound) {
        this.lastSubmissionTime = now;
        this.lastSuccessUrl = currentUrl;
        this.lastCelebrationTime = now;
        console.log('CodeClimax: Triggering celebration');
        this.showCelebration();
      }
    });
  }

  validateMedia(media) {
    if (!media) {
      console.error('CodeClimax: Media object is null or undefined');
      return false;
    }

    if (!media.type || !media.data) {
      console.error('CodeClimax: Media object missing required type or data property');
      return false;
    }

    const validTypes = ['image', 'gif', 'video', 'youtube'];
    if (!validTypes.includes(media.type)) {
      console.error('CodeClimax: Invalid media type:', media.type);
      return false;
    }

    if (typeof media.data !== 'string' || media.data.trim() === '') {
      console.error('CodeClimax: Media data is not a valid string');
      return false;
    }

    return true;
  }

  async showCelebration() {
    // Don't show if already displaying a celebration
    if (this.isShowingCelebration) {
      console.log('CodeClimax: Celebration already showing, skipping');
      return;
    }

    try {
      this.isShowingCelebration = true;
      console.log('CodeClimax: Starting celebration display');

      // Check if extension context is still valid
      if (!chrome.storage || !chrome.storage.local) {
        console.error('CodeClimax: Extension context invalidated');
        this.isShowingCelebration = false;
        return;
      }

      const { celebrations, settings } = await chrome.storage.local.get(['celebrations', 'settings']);

      console.log('CodeClimax: Available celebrations:', celebrations);
      console.log('CodeClimax: Settings:', settings);

      // Only show user-uploaded media, skip if none available
      if (!celebrations?.length) {
        console.log('CodeClimax: No celebrations found, skipping celebration');
        this.isShowingCelebration = false;
        return;
      }

      // Filter to only user-uploaded media (exclude default celebrations)
      const userUploaded = celebrations.filter(c => !c.id.startsWith('default-celebration-'));

      if (userUploaded.length === 0) {
        console.log('CodeClimax: No user-uploaded media found, skipping celebration');
        this.isShowingCelebration = false;
        return;
      }

      let selectedMedia;

      // First, check if user has specifically selected media that is user-uploaded
      if (settings?.selectedMedia) {
        selectedMedia = userUploaded.find(c => c.id === settings.selectedMedia);
        if (selectedMedia) {
          console.log('CodeClimax: Using user-selected media:', selectedMedia.name);
        }
      }

      // If no selected media found, prioritize favorited user-uploaded media
      if (!selectedMedia) {
        const favoriteUserMedia = userUploaded.find(c => c.isFavorite);

        if (favoriteUserMedia) {
          selectedMedia = favoriteUserMedia;
          console.log('CodeClimax: Using favorite user-uploaded media');
        } else {
          selectedMedia = userUploaded[0];
          console.log('CodeClimax: Using first available user-uploaded media');
        }
      }

      console.log('CodeClimax: Available celebrations count:', celebrations.length);
      console.log('CodeClimax: Selected celebration media:', selectedMedia);

      // Validate media before attempting to display
      if (!this.validateMedia(selectedMedia)) {
        console.error('CodeClimax: Selected media failed validation, skipping celebration');
        this.isShowingCelebration = false;
        return;
      }

      try {
        this.createOverlay(selectedMedia);
      } catch (overlayError) {
        console.error('CodeClimax: Error creating overlay for custom media:', overlayError);
        this.isShowingCelebration = false;
      }
    } catch (error) {
      // Handle extension context invalidation gracefully
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.error('CodeClimax: Extension context invalidated during celebration');
        this.isActive = false;
        this.isShowingCelebration = false;
        return;
      }

      console.error('CodeClimax: Unexpected error showing celebration:', error);
      this.isShowingCelebration = false;
    }
  }

  showDefaultCelebration() {
    // Don't show anything if no user-uploaded media is available
    console.log('CodeClimax: No user-uploaded media available, skipping celebration');
    this.isShowingCelebration = false;
  }

  createOverlay(media) {
    console.log('CodeClimax: Creating overlay for media:', media);

    if (!media || !media.type || !media.data) {
      console.error('CodeClimax: Invalid media object:', media);
      throw new Error('Invalid media object');
    }

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'codecclimax-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
    `;

    // Store reference to current overlay
    this.currentOverlay = overlay;

    // Create media container
    const mediaContainer = document.createElement('div');
    mediaContainer.style.cssText = `
      position: relative;
      z-index: 1;
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    let mediaElement = '';

    // Debug logging to help troubleshoot GIF display issues
    console.log('CodeClimax: Rendering media:', {
      type: media.type,
      data: media.data,
      name: media.name,
      thumbnail: media.thumbnail
    });

    switch (media.type) {
      case 'image':
      case 'gif':
        mediaElement = `
          <img
            src="${media.data}"
            alt="Celebration"
            style="display: block; max-width: 100%; max-height: 90vh; object-fit: contain; background: #f0f0f0;"
            loading="eager"
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
          />
          <div style="display: none; padding: 20px; color: white; text-align: center; background: rgba(0,0,0,0.8); border-radius: 8px;">
            <p style="margin: 0; font-size: 16px;">Failed to load celebration media</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.7;">Please check the media URL</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.5;">URL: ${media.data.substring(0, 50)}${media.data.length > 50 ? '...' : ''}</p>
          </div>
        `;
        break;

      case 'video':
        // Check if this is an iframe embed (Vimeo) or direct video file
        if (media.data.includes('player.vimeo.com') || media.data.includes('vimeo.com')) {
          mediaElement = `
            <iframe
              src="${media.data}"
              frameborder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
              style="width: 800px; height: 450px; max-width: 90vw; border: none; border-radius: 8px;"
            ></iframe>
          `;
        } else {
          mediaElement = `
            <video autoplay muted loop style="display: block; max-width: 100%; max-height: 90vh; object-fit: contain;">
              <source src="${media.data}" type="video/mp4">
            </video>
          `;
        }
        break;

      case 'youtube':
        mediaElement = `
          <iframe
            src="https://www.youtube.com/embed/${media.data}?autoplay=1&mute=0&start=0&controls=1&rel=0&modestbranding=1"
            frameborder="0"
            allow="autoplay; encrypted-media"
            allowfullscreen
            style="width: 800px; height: 450px; max-width: 90vw; border: none;"
          ></iframe>
        `;
        break;
    }

    mediaContainer.innerHTML = mediaElement;

    // Add close button positioned at top right of viewport
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    closeBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0,0,0,0.6);
      border: 2px solid rgba(255,255,255,0.3);
      cursor: pointer;
      transition: all 0.2s;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    `;

    // Close function
    const closeOverlay = () => {
      console.log('CodeClimax: Closing celebration overlay');
      this.isShowingCelebration = false;
      this.currentOverlay = null;

      overlay.classList.add('fade-out');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        if (style.parentNode) {
          style.remove();
        }
      }, 500);
    };

    closeBtn.addEventListener('click', closeOverlay);

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(0,0,0,0.8)';
      closeBtn.style.borderColor = 'rgba(255,255,255,0.5)';
      closeBtn.style.transform = 'scale(1.1)';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(0,0,0,0.6)';
      closeBtn.style.borderColor = 'rgba(255,255,255,0.3)';
      closeBtn.style.transform = 'scale(1)';
    });

    overlay.appendChild(mediaContainer);
    overlay.appendChild(closeBtn);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        to { opacity: 0; }
      }
      .codecclimax-overlay.fade-out {
        animation: fadeOut 0.5s ease forwards;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Auto-remove after reasonable time (media plays naturally, user controls when to close)
    let autoCloseTime;
    switch (media.type) {
      case 'image':
        autoCloseTime = 5000; // 5 seconds for images
        break;
      case 'gif':
        autoCloseTime = 8000; // 8 seconds for GIFs (let them loop)
        break;
      case 'video':
        autoCloseTime = 15000; // 15 seconds for videos
        break;
      case 'youtube':
        autoCloseTime = 30000; // 30 seconds for YouTube (let users enjoy the video)
        break;
      default:
        autoCloseTime = 5000;
    }

    const autoCloseTimer = setTimeout(() => {
      if (this.currentOverlay === overlay) {
        console.log('CodeClimax: Auto-closing celebration after', autoCloseTime, 'ms');
        closeOverlay();
      }
    }, autoCloseTime);

    // Click on backdrop to dismiss
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        clearTimeout(autoCloseTimer);
        closeOverlay();
      }
    });

    // Cleanup timer if overlay is manually closed
    overlay.addEventListener('remove', () => {
      clearTimeout(autoCloseTimer);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CodeClimaxContent();
  });
} else {
  new CodeClimaxContent();
}