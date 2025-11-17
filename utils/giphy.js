class GiphyHandler {
  constructor() {
    this.apiKey = null; // Optional: for advanced features
    this.cache = new Map(); // Cache for GIF metadata
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Extract Giphy ID from various URL formats
   * @param {string} url - Giphy URL
   * @returns {string|null} Giphy ID or null if invalid
   */
  extractGiphyID(url) {
    if (!url || typeof url !== 'string') {
      console.log('GiphyHandler: Invalid URL type or empty');
      return null;
    }

    console.log('GiphyHandler: Processing URL:', url);

    // Parse URL into parts
    const parts = url.split('/');
    const hostname = parts[2] || '';
    const pathParts = parts.slice(3);

    // Handle different URL formats
    if (hostname.includes('giphy.com')) {
      // https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXI2MjhkanlpZHRobWlrY2d0Y2J2b3pjYTl2eDZzZDdwdnd4OTM2cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SaX384PjtDl2U/giphy.gif
      if (hostname.startsWith('media') && pathParts[0] === 'media') {
        // Complex media URL format: media/v1.XXX/SaX384PjtDl2U/giphy.gif
        if (pathParts[1].startsWith('v1.') && pathParts[2] && pathParts[3] === 'giphy.gif') {
          const actualId = pathParts[2];
          console.log('GiphyHandler: Extracted ID from complex media URL:', actualId);
          return actualId;
        }

        // Simpler format: media/SaX384PjtDl2U/giphy.gif
        if (pathParts[1] && pathParts[2] === 'giphy.gif') {
          const id = pathParts[1];
          console.log('GiphyHandler: Extracted ID from simple media URL:', id);
          return id;
        }
      }

      // https://giphy.com/gifs/some-description-SaX384PjtDl2U or /gifs/SaX384PjtDl2U
      if (pathParts[0] === 'gifs' && pathParts.length >= 2) {
        const lastPart = pathParts[pathParts.length - 1];
        const potentialId = lastPart.replace(/-/g, ''); // Remove dashes
        if (/^[a-zA-Z0-9_]{6,25}$/.test(potentialId)) {
          console.log('GiphyHandler: Extracted ID from gifs URL:', potentialId);
          return potentialId;
        }
        // If that doesn't work, try the original last part
        if (/^[a-zA-Z0-9_-]{6,25}$/.test(lastPart)) {
          console.log('GiphyHandler: Extracted raw ID from gifs URL:', lastPart);
          return lastPart;
        }
      }
    }

    // Handle i.giphy.com URLs: https://i.giphy.com/SaX384PjtDl2U.gif
    if (hostname === 'i.giphy.com' && pathParts.length >= 1) {
      const lastPart = pathParts[pathParts.length - 1];
      const id = lastPart.replace('.gif', '');
      if (/^[a-zA-Z0-9_-]{6,25}$/.test(id)) {
        console.log('GiphyHandler: Extracted ID from i.giphy.com URL:', id);
        return id;
      }
    }

    // Handle gph.is short URLs
    if (hostname === 'gph.is' && pathParts[0] === 'g' && pathParts[1]) {
      const id = pathParts[1];
      if (/^[a-zA-Z0-9_-]{6,25}$/.test(id)) {
        console.log('GiphyHandler: Extracted ID from gph.is URL:', id);
        return id;
      }
    }

    console.log('GiphyHandler: No patterns matched for URL:', url);
    return null;
  }

  /**
   * Validate Giphy URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid Giphy URL
   */
  isValidGiphyURL(url) {
    return this.extractGiphyID(url) !== null;
  }

  /**
   * Generate direct GIF URL from Giphy ID
   * @param {string} giphyId - Giphy ID
   * @param {Object} options - Options for the URL
   * @returns {string} Direct GIF URL
   */
  generateGifURL(giphyId, options = {}) {
    const { size = 'original' } = options;
    const sizeMap = {
      'original': 'gif',
      'downsized': '200w.gif',
      'fixed_height': '200.gif',
      'fixed_width': '200w.gif'
    };

    const suffix = sizeMap[size] || sizeMap.original;
    return `https://i.giphy.com/${giphyId}.${suffix}`;
  }

  /**
   * Get thumbnail URL for a Giphy GIF
   * @param {string} giphyId - Giphy ID
   * @param {string} size - Thumbnail size (200, 100, 64)
   * @returns {string} Thumbnail URL
   */
  getThumbnailURL(giphyId, size = '200') {
    return `https://media0.giphy.com/media/${giphyId}/200_s.gif`;
  }

  /**
   * Fetch GIF metadata using noembed.com (free API)
   * @param {string} giphyId - Giphy ID
   * @returns {Promise<Object>} GIF metadata
   */
  async fetchGifMetadata(giphyId) {
    // Check cache first
    const cacheKey = `metadata_${giphyId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Try to construct a standard Giphy URL for noembed
      const giphyUrl = `https://giphy.com/gifs/${giphyId}`;
      const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(giphyUrl)}`;

      const response = await fetch(noembedUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const metadata = {
        giphyId,
        title: data.title || 'Giphy GIF',
        author: data.author_name || 'Giphy User',
        thumbnail: this.getThumbnailURL(giphyId, '200'),
        gifUrl: this.generateGifURL(giphyId, 'original'),
        url: data.url || giphyUrl
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: metadata,
        timestamp: Date.now()
      });

      return metadata;
    } catch (error) {
      console.error('Error fetching Giphy metadata:', error);

      // Fallback to basic metadata if API fails
      const fallbackMetadata = {
        giphyId,
        title: `Giphy: ${giphyId}`,
        author: 'Giphy User',
        thumbnail: this.getThumbnailURL(giphyId, '200'),
        gifUrl: this.generateGifURL(giphyId, 'original'),
        url: `https://giphy.com/gifs/${giphyId}`
      };

      return fallbackMetadata;
    }
  }

  /**
   * Validate Giphy GIF and return metadata
   * @param {string} url - Giphy URL
   * @returns {Promise<Object>} Validation result
   */
  async validateGiphyGif(url) {
    try {
      const giphyId = this.extractGiphyID(url);
      if (!giphyId) {
        return {
          valid: false,
          error: 'Invalid Giphy URL format',
          giphyId: null
        };
      }

      // Basic format validation - Giphy IDs are typically 6-25 characters
      if (!/^[a-zA-Z0-9_-]{6,25}$/.test(giphyId)) {
        return {
          valid: false,
          error: 'Invalid Giphy ID format',
          giphyId
        };
      }

      // Try to fetch metadata to verify GIF exists
      const metadata = await this.fetchGifMetadata(giphyId);

      return {
        valid: true,
        giphyId,
        title: metadata.title,
        author: metadata.author,
        thumbnail: metadata.thumbnail,
        gifUrl: metadata.gifUrl,
        url: metadata.url
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        giphyId: this.extractGiphyID(url)
      };
    }
  }

  /**
   * Generate multiple thumbnail URLs for fallback
   * @param {string} giphyId - Giphy ID
   * @returns {Array} Array of thumbnail URLs in order of preference
   */
  getThumbnailFallbacks(giphyId) {
    return [
      this.getThumbnailURL(giphyId, '200'),
      `https://media1.giphy.com/media/${giphyId}/200_s.gif`,
      `https://media2.giphy.com/media/${giphyId}/200_s.gif`
    ];
  }

  /**
   * Check if a thumbnail URL is accessible
   * @param {string} url - Thumbnail URL to check
   * @returns {Promise<boolean>} True if accessible
   */
  async checkThumbnailAccessible(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get first accessible thumbnail URL
   * @param {string} giphyId - Giphy ID
   * @returns {Promise<string>} First accessible thumbnail URL
   */
  async getAccessibleThumbnail(giphyId) {
    const fallbacks = this.getThumbnailFallbacks(giphyId);

    for (const url of fallbacks) {
      if (await this.checkThumbnailAccessible(url)) {
        return url;
      }
    }

    // Return the default thumbnail as last resort
    return this.getThumbnailURL(giphyId, '200');
  }

  /**
   * Clean up cache entries older than timeout
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      oldestEntry: this.cache.size > 0 ? Math.min(...Array.from(this.cache.values()).map(v => v.timestamp)) : null
    };
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Generate Giphy embed HTML
   * @param {string} giphyId - Giphy ID
   * @param {Object} options - Embed options
   * @returns {string} HTML img embed
   */
  generateEmbedHTML(giphyId, options = {}) {
    const { width = 400, height = 400 } = options;
    const gifUrl = this.generateGifURL(giphyId, 'original');

    return `
      <img
        src="${gifUrl}"
        alt="Giphy GIF"
        style="width: ${width}px; height: auto; max-width: 90vw; border-radius: 16px;"
        onerror="this.src='https://i.giphy.com/${giphyId}.gif'"
      />
    `;
  }

  /**
   * Get direct Giphy share URL
   * @param {string} giphyId - Giphy ID
   * @returns {string} Share URL
   */
  generateShareURL(giphyId) {
    return `https://giphy.com/gifs/${giphyId}`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GiphyHandler;
} else if (typeof window !== 'undefined') {
  window.GiphyHandler = GiphyHandler;
}

// Create singleton instance
const giphyHandler = new GiphyHandler();