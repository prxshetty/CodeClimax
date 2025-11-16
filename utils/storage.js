// CodeClimax - LeetCode Celebration Extension
// storage.js - Chrome storage wrapper utilities

class CodeClimaxStorage {
  constructor() {
    this.storageArea = chrome.storage.local;
    this.defaultSettings = {
      enabled: true
    };
  }

  /**
   * Get data from storage
   * @param {string|Array|Object} keys - Keys to retrieve
   * @returns {Promise<Object>} Retrieved data
   */
  async get(keys = null) {
    try {
      const result = await this.storageArea.get(keys);
      return result;
    } catch (error) {
      console.error('Storage get error:', error);
      throw new Error(`Failed to retrieve data from storage: ${error.message}`);
    }
  }

  /**
   * Set data in storage
   * @param {Object} items - Items to store
   * @returns {Promise<void>}
   */
  async set(items) {
    try {
      await this.storageArea.set(items);
    } catch (error) {
      console.error('Storage set error:', error);
      throw new Error(`Failed to store data: ${error.message}`);
    }
  }

  /**
   * Remove data from storage
   * @param {string|Array} keys - Keys to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    try {
      await this.storageArea.remove(keys);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw new Error(`Failed to remove data: ${error.message}`);
    }
  }

  /**
   * Clear all data from storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.storageArea.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw new Error(`Failed to clear storage: ${error.message}`);
    }
  }

  /**
   * Get bytes in use for specific keys
   * @param {string|Array} keys - Keys to check (optional)
   * @returns {Promise<number>} Bytes in use
   */
  async getBytesInUse(keys = null) {
    try {
      return await this.storageArea.getBytesInUse(keys);
    } catch (error) {
      console.error('Storage getBytesInUse error:', error);
      throw new Error(`Failed to get storage usage: ${error.message}`);
    }
  }

  /**
   * Get settings with defaults applied
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    try {
      const result = await this.get(['settings']);
      return { ...this.defaultSettings, ...result.settings };
    } catch (error) {
      console.error('Error getting settings:', error);
      return { ...this.defaultSettings };
    }
  }

  /**
   * Update settings
   * @param {Object} newSettings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      await this.set({ settings: updatedSettings });
      return updatedSettings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Get celebrations
   * @returns {Promise<Array>} Array of celebrations
   */
  async getCelebrations() {
    try {
      const result = await this.get(['celebrations']);
      return result.celebrations || [];
    } catch (error) {
      console.error('Error getting celebrations:', error);
      return [];
    }
  }

  /**
   * Add a new celebration
   * @param {Object} celebration - Celebration object
   * @returns {Promise<Object>} Added celebration
   */
  async addCelebration(celebration) {
    try {
      const celebrations = await this.getCelebrations();

      // Validate celebration
      if (!celebration.id) {
        celebration.id = this.generateId();
      }

      if (!celebration.uploadedAt) {
        celebration.uploadedAt = Date.now();
      }

      // Check for duplicates
      const existingIndex = celebrations.findIndex(c => c.id === celebration.id);
      if (existingIndex !== -1) {
        throw new Error('Celebration with this ID already exists');
      }

      celebrations.push(celebration);
      await this.set({ celebrations });

      return celebration;
    } catch (error) {
      console.error('Error adding celebration:', error);
      throw error;
    }
  }

  /**
   * Update an existing celebration
   * @param {string} id - Celebration ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated celebration
   */
  async updateCelebration(id, updates) {
    try {
      const celebrations = await this.getCelebrations();
      const index = celebrations.findIndex(c => c.id === id);

      if (index === -1) {
        throw new Error('Celebration not found');
      }

      celebrations[index] = { ...celebrations[index], ...updates };
      await this.set({ celebrations });

      return celebrations[index];
    } catch (error) {
      console.error('Error updating celebration:', error);
      throw error;
    }
  }

  /**
   * Delete a celebration
   * @param {string} id - Celebration ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteCelebration(id) {
    try {
      const celebrations = await this.getCelebrations();
      const originalLength = celebrations.length;

      const filteredCelebrations = celebrations.filter(c => c.id !== id);

      if (filteredCelebrations.length === originalLength) {
        return false; // Not found
      }

      await this.set({ celebrations: filteredCelebrations });
      return true;
    } catch (error) {
      console.error('Error deleting celebration:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} Storage usage details
   */
  async getStorageUsage() {
    try {
      const bytesUsed = await this.getBytesInUse();
      const maxBytes = 10 * 1024 * 1024; // 10MB default limit for chrome.storage.local
      const percentage = (bytesUsed / maxBytes) * 100;

      return {
        bytesUsed,
        bytesTotal: maxBytes,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        formattedUsed: this.formatBytes(bytesUsed),
        formattedTotal: this.formatBytes(maxBytes)
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

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate celebration object
   * @param {Object} celebration - Celebration to validate
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validateCelebration(celebration) {
    const errors = [];

    if (!celebration.type) {
      errors.push('Type is required');
    }

    if (!celebration.data) {
      errors.push('Data is required');
    }

    if (!celebration.name || celebration.name.trim() === '') {
      errors.push('Name is required');
    }

    if (celebration.duration && (celebration.duration < 1 || celebration.duration > 30)) {
      errors.push('Duration must be between 1 and 30 seconds');
    }

    const validTypes = ['image', 'gif', 'video', 'youtube'];
    if (celebration.type && !validTypes.includes(celebration.type)) {
      errors.push('Invalid type. Must be one of: ' + validTypes.join(', '));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize celebration data for storage
   * @param {Object} celebration - Celebration to sanitize
   * @returns {Object} Sanitized celebration
   */
  sanitizeCelebration(celebration) {
    const sanitized = {
      id: celebration.id || this.generateId(),
      type: celebration.type,
      data: celebration.data,
      duration: Math.max(1, Math.min(30, parseInt(celebration.duration) || 5)),
      name: (celebration.name || 'Untitled').toString().substring(0, 100),
      thumbnail: celebration.thumbnail || null,
      isFavorite: Boolean(celebration.isFavorite),
      uploadedAt: celebration.uploadedAt || Date.now()
    };

    // Clean up any extra properties
    const allowedKeys = ['id', 'type', 'data', 'duration', 'name', 'thumbnail', 'isFavorite', 'uploadedAt'];
    Object.keys(sanitized).forEach(key => {
      if (!allowedKeys.includes(key)) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return 'codecclimax_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Export all data
   * @returns {Promise<Object>} Export data
   */
  async exportData() {
    try {
      const data = await this.get(['settings', 'celebrations']);
      return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          settings: data.settings || this.defaultSettings,
          celebrations: data.celebrations || []
        }
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Import data
   * @param {Object} importData - Data to import
   * @param {Object} options - Import options
   * @returns {Promise<void>}
   */
  async importData(importData, options = {}) {
    try {
      if (!importData || !importData.data) {
        throw new Error('Invalid import data format');
      }

      const { settings, celebrations } = importData.data;

      // Validate and merge settings
      if (settings) {
        const mergedSettings = { ...this.defaultSettings, ...settings };
        await this.set({ settings: mergedSettings });
      }

      // Validate and import celebrations
      if (celebrations && Array.isArray(celebrations)) {
        const existingCelebrations = await this.getCelebrations();
        const newCelebrations = [];

        for (const celebration of celebrations) {
          // Validate celebration
          const validation = this.validateCelebration(celebration);
          if (!validation.valid) {
            console.warn('Skipping invalid celebration:', validation.errors);
            continue;
          }

          // Sanitize celebration
          const sanitized = this.sanitizeCelebration(celebration);

          // Check for duplicates (unless overwrite is enabled)
          if (!options.overwrite) {
            const existing = existingCelebrations.find(c => c.id === sanitized.id);
            if (existing) {
              // Generate new ID to avoid conflicts
              sanitized.id = this.generateId();
            }
          }

          newCelebrations.push(sanitized);
        }

        // Merge celebrations
        const mergedCelebrations = options.overwrite
          ? newCelebrations
          : [...existingCelebrations, ...newCelebrations];

        await this.set({ celebrations: mergedCelebrations });
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   * @param {Object} options - Cleanup options
   * @returns {Promise<number>} Number of items cleaned up
   */
  async cleanup(options = {}) {
    try {
      const { daysOld = 30, keepFavorites = true } = options;
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

      const celebrations = await this.getCelebrations();
      const originalCount = celebrations.length;

      const filteredCelebrations = celebrations.filter(celebration => {
        if (keepFavorites && celebration.isFavorite) {
          return true;
        }
        return celebration.uploadedAt > cutoffTime;
      });

      if (filteredCelebrations.length < originalCount) {
        await this.set({ celebrations: filteredCelebrations });
      }

      return originalCount - filteredCelebrations.length;
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeClimaxStorage;
} else if (typeof window !== 'undefined') {
  window.CodeClimaxStorage = CodeClimaxStorage;
}