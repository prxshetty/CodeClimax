class CodeClimaxContent {
  constructor() {
    this.isActive = true;
    this.lastSubmissionTime = 0;
    this.lastCelebrationTime = 0;
    this.isShowingCelebration = false;
    this.currentOverlay = null;
    this.lastSuccessUrl = null;
    this.submissionButtonClicked = false; // NEW: Track if user just submitted
    this.init();
  }

  async init() {
    // Check if extension is enabled
    const settings = await this.getSettings();
    if (!settings?.enabled) {
      return;
    }

    // Start monitoring for successful submissions
    this.monitorSubmissions();

    // NEW: Listen for submit button clicks (both mouse and keyboard)
    this.listenForSubmitButton();

    // Listen for navigation changes
    this.observePageChanges();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleExtension') {
        this.isActive = request.enabled;
        sendResponse({ success: true });
      } else if (request.action === 'toggleApiMonitoring') {
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

  // NEW: Listen for submit button clicks and keyboard shortcuts
  listenForSubmitButton() {
    // Method 1: Listen for clicks on the Submit button
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      // Check if Submit button was clicked
      const isSubmitButton = 
        target.textContent?.trim().toLowerCase() === 'submit' ||
        target.getAttribute('data-e2e-locator') === 'console-submit-button' ||
        target.closest('button')?.textContent?.trim().toLowerCase() === 'submit';
      
      if (isSubmitButton) {
        this.markSubmissionStarted();
      }
    }, true);

    // Method 2: Listen for keyboard shortcuts (Cmd+Enter / Ctrl+Enter)
    document.addEventListener('keydown', (event) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      const isSubmitShortcut = 
        (event.metaKey || event.ctrlKey) && 
        event.key === 'Enter';
      
      if (isSubmitShortcut) {
        this.markSubmissionStarted();
      }
    }, true);
  }

  // NEW: Mark that a submission was started
  markSubmissionStarted() {
    this.submissionButtonClicked = true;
    
    // Reset flag after 30 seconds (handles failed/incorrect submissions)
    setTimeout(() => {
      if (this.submissionButtonClicked) {
        this.submissionButtonClicked = false;
      }
    }, 30000);
  }

  observePageChanges() {
    // Reset state when navigating to a new problem
    const currentUrl = window.location.href;
    if (this.lastSuccessUrl && this.lastSuccessUrl !== currentUrl) {
      this.isShowingCelebration = false;
      this.currentOverlay = null;
      this.submissionButtonClicked = false; // NEW: Reset submit flag on navigation
    }

    // Watch for URL changes (SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const detector = this;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      // Reset flag when navigating to prevent stale state
      detector.submissionButtonClicked = false;
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      detector.submissionButtonClicked = false;
    };
    
    // Listen for browser back/forward
    window.addEventListener('popstate', () => {
      this.submissionButtonClicked = false;
      if (this.isShowingCelebration) {
        this.closeCurrentCelebration();
      }
    });
  }

  closeCurrentCelebration() {
    if (this.currentOverlay) {
      this.currentOverlay.remove();
      this.currentOverlay = null;
    }
    this.isShowingCelebration = false;
  }

  monitorSubmissions() {
    // Create a MutationObserver to watch for DOM changes (more efficient than polling)
    const observer = new MutationObserver((mutations) => {
      // Only check if there were actual node additions
      const hasAddedNodes = mutations.some(mutation => mutation.addedNodes.length > 0);
      
      if (hasAddedNodes) {
        this.checkForSuccessNotification();
      }
    });

    // Start observing the document body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'] // Watch for class changes (success indicators often change classes)
    });
  }

  checkForSuccessNotification() {
    // CRITICAL: Only detect if user just clicked submit
    // This prevents triggering on old submissions in history
    if (!this.submissionButtonClicked) {
      return; // Don't detect unless user just submitted
    }

    if (!this.isActive || this.isShowingCelebration) return;

    const now = Date.now();

    // Check if extension is enabled via toggle
    this.getSettings().then(settings => {
      if (settings.apiMonitoringEnabled === false) {
        return; // Skip if disabled by toggle
      }

      // Debounce - don't show multiple celebrations in quick succession
      if (now - this.lastSubmissionTime < 8000) return;

      // Look for various success indicators on LeetCode
      const successSelectors = [
        '[data-e2e-locator="submission-result"]',
        '.success__3Ai7',
        '[data-cy="submission-result"]',
        '.text-success',
        '#result-state',
        '[class*="success"]',
        '[class*="accepted"]'
      ];

      let successFound = false;

      for (const selector of successSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.toLowerCase();
          if (text.includes('accepted') || text.includes('success') || text.includes('passed')) {
            successFound = true;
            break;
          }
        }
      }

      // Check for normal problem success (specific check)
      const successTag = document.querySelector('.success__3Ai7');
      if (successTag && successTag.innerText.trim() === 'Success') {
        successFound = true;
      }

      // Check for explore section success (specific check)
      const resultState = document.getElementById('result-state');
      if (resultState &&
          resultState.className === 'text-success' &&
          resultState.innerText === 'Accepted') {
        successFound = true;
      }

      if (successFound) {
        this.submissionButtonClicked = false; // Reset flag immediately
        this.lastSubmissionTime = now;
        this.lastSuccessUrl = window.location.href;
        this.lastCelebrationTime = now;
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
      return;
    }

    try {
      this.isShowingCelebration = true;

      // Check if extension context is still valid
      if (!chrome.storage || !chrome.storage.local) {
        console.error('CodeClimax: Extension context invalidated');
        this.isShowingCelebration = false;
        return;
      }

      const { celebrations, settings } = await chrome.storage.local.get(['celebrations', 'settings']);

      // Only show user-uploaded media, skip if none available
      if (!celebrations?.length) {
        this.isShowingCelebration = false;
        return;
      }

      // Filter to only user-uploaded media (exclude default celebrations)
      const userUploaded = celebrations.filter(c => !c.id.startsWith('default-celebration-'));

      if (userUploaded.length === 0) {
        this.isShowingCelebration = false;
        return;
      }

      let selectedMedia;

      // First, check if user has specifically selected media that is user-uploaded
      if (settings?.selectedMedia) {
        selectedMedia = userUploaded.find(c => c.id === settings.selectedMedia);
      }

      // If no selected media found, prioritize favorited user-uploaded media
      if (!selectedMedia) {
        const favoriteUserMedia = userUploaded.find(c => c.isFavorite);

        if (favoriteUserMedia) {
          selectedMedia = favoriteUserMedia;
        } else {
          selectedMedia = userUploaded[0];
        }
      }

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
    this.isShowingCelebration = false;
  }

  createOverlay(media) {

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