// CodeClimax - LeetCode Celebration Extension
// background.js - Service worker for extension lifecycle and media processing

// Import TenorHandler utility
importScripts('utils/tenor.js');

class CodeClimaxBackground {
  constructor() {
    this.tenorHandler = new TenorHandler();
    this.init();
  }

  init() {
    console.log('CodeClimax background service worker initialized');

    // Set up default settings on installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.setupDefaults();
      }
    });

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });

    // Clean up old data periodically
    this.scheduleCleanup();
  }

  async setupDefaults() {
    const defaultSettings = {
      enabled: true
    };

    const defaultCelebrations = [
      {
        id: 'default-celebration-dicaprio-damn',
        type: 'gif',
        data: 'https://media.tenor.com/16466118.gif',
        duration: 8,
        name: 'Leonardo DiCaprio - Damn!',
        thumbnail: 'https://media.tenor.com/16466118.gif',
        isFavorite: false,
        uploadedAt: Date.now()
      }
    ];

    try {
      await chrome.storage.local.set({
        settings: defaultSettings,
        celebrations: defaultCelebrations
      });
      console.log('Default settings and celebrations initialized');
    } catch (error) {
      console.error('Error setting up defaults:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;

        case 'updateSettings':
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;

        case 'getCelebrations':
          const celebrations = await this.getCelebrations();
          sendResponse({ success: true, data: celebrations });
          break;

        case 'addCelebration':
          const addedCelebration = await this.addCelebration(request.celebration);
          sendResponse({ success: true, data: addedCelebration });
          break;

        case 'updateCelebration':
          await this.updateCelebration(request.id, request.updates);
          sendResponse({ success: true });
          break;

        case 'deleteCelebration':
          await this.deleteCelebration(request.id);
          sendResponse({ success: true });
          break;

        case 'validateYouTube':
          const validation = await this.validateYouTubeVideo(request.url);
          sendResponse(validation);
          break;

        case 'validateTenor':
          const tenorValidation = await this.validateTenorGif(request.url);
          sendResponse(tenorValidation);
          break;

        case 'getStorageUsage':
          const usage = await this.getStorageUsage();
          sendResponse({ success: true, data: usage });
          break;

        case 'exportData':
          const exportData = await this.exportUserData();
          sendResponse({ success: true, data: exportData });
          break;

        case 'importData':
          await this.importUserData(request.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {
      enabled: true
    };
  }

  async updateSettings(newSettings) {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    await chrome.storage.local.set({ settings: updatedSettings });
    return updatedSettings;
  }

  async getCelebrations() {
    const result = await chrome.storage.local.get(['celebrations']);
    return result.celebrations || [];
  }

  async addCelebration(celebration) {
    const celebrations = await this.getCelebrations();

    // Validate celebration data
    if (!celebration.type || !celebration.data) {
      throw new Error('Invalid celebration data');
    }

    // Check storage limits
    const storageUsage = await this.getStorageUsage();
    if (storageUsage.percentage > 90) {
      throw new Error('Storage limit approaching. Please delete some media first.');
    }

    // Add unique ID and timestamp
    const newCelebration = {
      id: celebration.id || this.generateId(),
      ...celebration,
      uploadedAt: celebration.uploadedAt || Date.now()
    };

    celebrations.push(newCelebration);
    await chrome.storage.local.set({ celebrations });

    return newCelebration;
  }

  async updateCelebration(id, updates) {
    const celebrations = await this.getCelebrations();
    const index = celebrations.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error('Celebration not found');
    }

    celebrations[index] = { ...celebrations[index], ...updates };
    await chrome.storage.local.set({ celebrations });
  }

  async deleteCelebration(id) {
    const celebrations = await this.getCelebrations();
    const filteredCelebrations = celebrations.filter(c => c.id !== id);

    if (celebrations.length === filteredCelebrations.length) {
      throw new Error('Celebration not found');
    }

    await chrome.storage.local.set({ celebrations: filteredCelebrations });
  }

  async validateYouTubeVideo(url) {
    try {
      const videoId = this.extractYouTubeID(url);
      if (!videoId) {
        return { valid: false, error: 'Invalid YouTube URL' };
      }

      // Fetch video metadata
      const response = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      );

      if (!response.ok) {
        return { valid: false, error: 'Could not fetch video information' };
      }

      const data = await response.json();

      return {
        valid: true,
        videoId,
        title: data.title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      };
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }

  extractYouTubeID(url) {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtube\.com\/v\/([^?]+)/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/, // YouTube Shorts support
      /music\.youtube\.com\/watch\?v=([^&]+)/
    ];

    console.log('Background: Processing YouTube URL:', url);

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('Background: Pattern matched:', pattern.toString(), 'Video ID:', match[1]);
        return match[1];
      }
    }

    console.log('Background: No patterns matched for URL:', url);
    return null;
  }

  async validateTenorGif(url) {
    try {
      console.log('Background: Processing Tenor URL:', url);

      // Use the TenorHandler utility to validate and extract GIF data
      const validation = await this.tenorHandler.validateTenorGif(url);

      if (validation.valid) {
        console.log('Background: Tenor GIF validation successful:', validation);
        return {
          valid: true,
          gifId: validation.gifId,
          title: validation.title,
          gifUrl: validation.gifUrl,
          thumbnailUrl: validation.thumbnailUrl,
          originalUrl: validation.originalUrl
        };
      } else {
        console.log('Background: Tenor GIF validation failed:', validation.error);
        return {
          valid: false,
          error: validation.error
        };
      }
    } catch (error) {
      console.error('Background: Error validating Tenor GIF:', error);
      return { valid: false, error: error.message };
    }
  }

  async getStorageUsage() {
    try {
      const result = await chrome.storage.local.getBytesInUse();
      const maxSize = 10 * 1024 * 1024; // 10MB default limit
      const percentage = (result / maxSize) * 100;

      return {
        bytesUsed: result,
        bytesTotal: maxSize,
        percentage: Math.round(percentage),
        formattedUsed: this.formatBytes(result),
        formattedTotal: this.formatBytes(maxSize)
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        bytesUsed: 0,
        bytesTotal: 10485760,
        percentage: 0,
        formattedUsed: '0 B',
        formattedTotal: '10 MB'
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async exportUserData() {
    try {
      const data = await chrome.storage.local.get(['settings', 'celebrations']);
      return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data
      };
    } catch (error) {
      throw new Error('Failed to export data');
    }
  }

  async importUserData(importData) {
    try {
      if (!importData.data) {
        throw new Error('Invalid import data format');
      }

      // Validate and merge data
      const currentData = await chrome.storage.local.get(['settings', 'celebrations']);

      const mergedSettings = {
        ...currentData.settings,
        ...importData.data.settings
      };

      const mergedCelebrations = [
        ...(currentData.celebrations || []),
        ...(importData.data.celebrations || [])
      ].filter((celebration, index, array) =>
        // Remove duplicates by ID
        array.findIndex(c => c.id === celebration.id) === index
      );

      await chrome.storage.local.set({
        settings: mergedSettings,
        celebrations: mergedCelebrations
      });

    } catch (error) {
      throw new Error('Failed to import data');
    }
  }

  handleStorageChange(changes, namespace) {
    if (namespace === 'local') {
      // Notify content scripts about setting changes
      if (changes.settings) {
        chrome.tabs.query({ url: 'https://leetcode.com/problems/*' }, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'settingsChanged',
              settings: changes.settings.newValue
            }).catch(() => {
              // Ignore errors for tabs that don't have content script
            });
          });
        });
      }
    }
  }

  scheduleCleanup() {
    // Clean up old data daily
    const cleanup = async () => {
      try {
        const celebrations = await this.getCelebrations();
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        // Remove old non-favorite celebrations to free up space
        const filteredCelebrations = celebrations.filter(celebration => {
          return celebration.isFavorite || celebration.uploadedAt > thirtyDaysAgo;
        });

        if (filteredCelebrations.length < celebrations.length) {
          await chrome.storage.local.set({ celebrations: filteredCelebrations });
          console.log(`Cleaned up ${celebrations.length - filteredCelebrations.length} old celebrations`);
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };

    // Run cleanup daily
    setInterval(cleanup, 24 * 60 * 60 * 1000);
  }

  generateId() {
    return 'codecclimax_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Initialize the background service
new CodeClimaxBackground();