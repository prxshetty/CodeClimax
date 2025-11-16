// CodeClimax - LeetCode Celebration Extension
// content.js - Injected into LeetCode problem pages

class CodeClimaxContent {
  constructor() {
    this.isActive = true;
    this.lastSubmissionTime = 0;
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

    // Check URL changes periodically
    setInterval(checkUrlChange, 1000);

    // Also listen to popstate for navigation
    window.addEventListener('popstate', checkUrlChange);
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

    // Debounce - don't show multiple celebrations in quick succession
    if (now - this.lastSubmissionTime < 8000) return;

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
      console.log('CodeClimax: Triggering celebration');
      this.showCelebration();
    }
  }

  interceptNetworkRequests() {
    // Override fetch to intercept API responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      try {
        const url = args[0];
        if (typeof url === 'string' && url.includes('/submit/') && response.ok) {
          const clone = response.clone();
          const data = await clone.json();

          if (data.status === 10 || data.status_msg === 'Accepted') {
            this.showCelebration();
          }
        }
      } catch (error) {
        // Silently ignore network parsing errors
      }

      return response;
    };
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

      const { celebrations, settings } = await chrome.storage.local.get(['celebrations', 'settings']);

      console.log('CodeClimax: Available celebrations:', celebrations);
      console.log('CodeClimax: Settings:', settings);

      // Show default celebration if no custom media
      if (!celebrations?.length) {
        console.log('CodeClimax: No celebrations found, showing default');
        this.showDefaultCelebration();
        return;
      }

      let selectedMedia;

      // First, check if user has specifically selected media
      if (settings?.selectedMedia) {
        selectedMedia = celebrations.find(c => c.id === settings.selectedMedia);
        if (selectedMedia) {
          console.log('CodeClimax: Using user-selected media:', selectedMedia.name);
        }
      }

      // If no selected media found, use smart selection logic
      if (!selectedMedia) {
        // Prioritize user-uploaded content over default celebration
        const userUploaded = celebrations.filter(c => !c.id.startsWith('default-celebration-'));
        const favoriteUserMedia = userUploaded.find(c => c.isFavorite);
        const favoriteMedia = celebrations.find(c => c.isFavorite);

        if (favoriteUserMedia) {
          selectedMedia = favoriteUserMedia;
          console.log('CodeClimax: Using favorite user-uploaded media');
        } else if (userUploaded.length > 0) {
          selectedMedia = userUploaded[0];
          console.log('CodeClimax: Using first user-uploaded media');
        } else if (favoriteMedia) {
          selectedMedia = favoriteMedia;
          console.log('CodeClimax: Using favorite default media');
        } else {
          selectedMedia = celebrations[0];
          console.log('CodeClimax: Using first available media');
        }
      }

      console.log('CodeClimax: Available celebrations count:', celebrations.length);
      console.log('CodeClimax: Selected celebration media:', selectedMedia);

      // Validate media before attempting to display
      if (!this.validateMedia(selectedMedia)) {
        console.error('CodeClimax: Selected media failed validation, falling back to default');
        this.showDefaultCelebration();
        return;
      }

      try {
        this.createOverlay(selectedMedia);
      } catch (overlayError) {
        console.error('CodeClimax: Error creating overlay for custom media:', overlayError);
        this.isShowingCelebration = false;
        this.showDefaultCelebration();
      }
    } catch (error) {
      console.error('Error showing celebration:', error);
      this.isShowingCelebration = false;
      this.showDefaultCelebration();
    }
  }

  showDefaultCelebration() {
    // Don't show if already displaying a celebration
    if (this.isShowingCelebration) {
      console.log('CodeClimax: Default celebration already showing, skipping');
      return;
    }

    // Simple text celebration as fallback
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 50px;
      border-radius: 20px;
      font-size: 32px;
      font-weight: bold;
      z-index: 999999;
      animation: fadeIn 0.5s ease;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    overlay.innerHTML = `
      <div>🎉 Problem Solved! 🎉</div>
      <div style="font-size: 18px; margin-top: 10px; font-weight: normal;">Click to close</div>
    `;

    // Store reference
    this.currentOverlay = overlay;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);

    // Close function
    const closeOverlay = () => {
      console.log('CodeClimax: Closing default celebration overlay');
      this.isShowingCelebration = false;
      this.currentOverlay = null;

      overlay.style.animation = 'fadeOut 0.5s ease forwards';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        if (style.parentNode) {
          style.remove();
        }
      }, 500);
    };

    // Click to close
    overlay.addEventListener('click', closeOverlay);

    document.body.appendChild(overlay);

    // Auto-remove after 3 seconds
    const autoCloseTimer = setTimeout(() => {
      if (this.currentOverlay === overlay) {
        console.log('CodeClimax: Auto-closing default celebration');
        closeOverlay();
      }
    }, 3000);

    // Cleanup timer if overlay is manually closed
    overlay.addEventListener('remove', () => {
      clearTimeout(autoCloseTimer);
    });
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

    switch (media.type) {
      case 'image':
      case 'gif':
        mediaElement = `
          <img
            src="${media.data}"
            alt="Celebration"
            style="display: block; max-width: 100%; max-height: 90vh; object-fit: contain; background: #f0f0f0;"
            onerror="this.onerror=null; this.style.background='#ffcccc'; this.alt='Failed to load image'; console.error('CodeClimax: Failed to load image:', '${media.data}'); this.style.display='none'; this.parentElement.innerHTML+='<div style=\\"color: white; text-align: center; padding: 40px; font-family: Arial, sans-serif;\\"><h3>Celebration Media Failed to Load</h3><p>The GIF or image could not be loaded. This might be due to:<br>- Expired Tenor GIF link<br>- Network issues<br>- Blocked resource<br><br>Please try uploading your own celebration media!</p></div>';"
            onload="if(this.naturalWidth === 0 || this.naturalHeight === 0) { this.onerror(); } else { console.log('CodeClimax: Image loaded successfully:', '${media.data}'); }"
          />
        `;
        break;

      case 'video':
        mediaElement = `
          <video autoplay muted loop style="display: block; max-width: 100%; max-height: 90vh; object-fit: contain;">
            <source src="${media.data}" type="video/mp4">
          </video>
        `;
        break;

      case 'youtube':
        mediaElement = `
          <iframe
            src="https://www.youtube.com/embed/${media.data}?autoplay=1&mute=0&start=0&end=10&controls=1&rel=0&modestbranding=1"
            frameborder="0"
            allow="autoplay; encrypted-media"
            allowfullscreen
            style="width: 800px; height: 450px; max-width: 90vw; border: none;"
          ></iframe>
        `;
        break;
    }

    mediaContainer.innerHTML = mediaElement;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      transition: background 0.2s;
      z-index: 10;
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
      closeBtn.style.background = 'rgba(255,255,255,0.3)';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.2)';
    });

    mediaContainer.appendChild(closeBtn);
    overlay.appendChild(mediaContainer);

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
        autoCloseTime = 12000; // 12 seconds for YouTube (with controls)
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