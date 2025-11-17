class VimeoHandler {
    constructor() {
      this.cache = new Map();
      this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    }
  
    /**
     * Extract Vimeo video ID from various URL formats
     * @param {string} url - Vimeo URL
     * @returns {string|null} Video ID or null if invalid
     */
    extractVideoId(url) {
      if (!url || typeof url !== 'string') {
        console.log('VimeoHandler: Invalid URL type or empty');
        return null;
      }
  
      console.log('VimeoHandler: Processing URL:', url);
  
      // Vimeo URL patterns
      const patterns = [
        // Standard Vimeo URL
        /vimeo\.com\/(\d+)/,
        // Vimeo with additional paths
        /vimeo\.com\/video\/(\d+)/,
        // Vimeo showcase/channels
        /vimeo\.com\/channels\/[^/]+\/(\d+)/,
        // Vimeo groups
        /vimeo\.com\/groups\/[^/]+\/videos\/(\d+)/,
        // Vimeo player embed URL
        /player\.vimeo\.com\/video\/(\d+)/,
        // Unlisted video with hash
        /vimeo\.com\/(\d+)\/[a-zA-Z0-9]+/
      ];
  
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          console.log('VimeoHandler: Pattern matched:', pattern.toString(), 'Video ID:', match[1]);
          return match[1];
        }
      }
  
      console.log('VimeoHandler: No patterns matched for URL:', url);
      return null;
    }
  
    /**
     * Extract hash from unlisted Vimeo URLs
     * @param {string} url - Vimeo URL
     * @returns {string|null} Hash or null
     */
    extractHash(url) {
      const hashPattern = /vimeo\.com\/\d+\/([a-zA-Z0-9]+)/;
      const match = url.match(hashPattern);
      return match ? match[1] : null;
    }
  
    /**
     * Validate Vimeo URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid Vimeo URL
     */
    isValidVimeoURL(url) {
      return this.extractVideoId(url) !== null;
    }
  
    /**
     * Generate player embed URL
     * @param {string} videoId - Vimeo video ID
     * @param {Object} options - Player options
     * @returns {string} Embed URL
     */
    generateEmbedURL(videoId, options = {}) {
      const params = new URLSearchParams();
  
      // Default options for celebrations
      const defaultOptions = {
        autoplay: 1,
        muted: 0,
        loop: 0,
        controls: 1,
        title: 0,
        byline: 0,
        portrait: 0,
        quality: 'auto'
      };
  
      const finalOptions = { ...defaultOptions, ...options };
  
      Object.entries(finalOptions).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, value.toString());
        }
      });
  
      // Check if there's a hash for unlisted videos
      const hash = finalOptions.hash || '';
      const hashParam = hash ? `?h=${hash}&` : '?';
  
      return `https://player.vimeo.com/video/${videoId}${hashParam}${params.toString()}`;
    }
  
    /**
     * Get thumbnail URL for Vimeo video
     * @param {string} videoId - Vimeo video ID
     * @returns {string} Thumbnail URL (requires API call for actual thumbnail)
     */
    getThumbnailURL(videoId) {
      // Vimeo thumbnails require oEmbed API call
      // Return a placeholder for now
      return `https://vumbnail.com/${videoId}.jpg`;
    }
  
    /**
     * Fetch video metadata using oEmbed
     * @param {string} videoId - Vimeo video ID
     * @returns {Promise<Object>} Video metadata
     */
    async fetchVideoMetadata(videoId) {
      const cacheKey = `metadata_${videoId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }
  
      try {
        const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
  
        const data = await response.json();
  
        const metadata = {
          videoId,
          title: data.title || `Vimeo Video ${videoId}`,
          thumbnail: data.thumbnail_url || this.getThumbnailURL(videoId),
          duration: data.duration || 0,
          author: data.author_name || 'Unknown',
          width: data.width || 640,
          height: data.height || 360
        };
  
        this.cache.set(cacheKey, {
          data: metadata,
          timestamp: Date.now()
        });
  
        return metadata;
      } catch (error) {
        console.error('Error fetching Vimeo metadata:', error);
        
        // Return basic metadata on error
        return {
          videoId,
          title: `Vimeo Video ${videoId}`,
          thumbnail: this.getThumbnailURL(videoId),
          duration: 0
        };
      }
    }
  
    /**
     * Validate Vimeo video and return metadata
     * @param {string} url - Vimeo URL
     * @returns {Promise<Object>} Validation result
     */
    async validateVimeoVideo(url) {
      try {
        const videoId = this.extractVideoId(url);
        if (!videoId) {
          return {
            valid: false,
            error: 'Invalid Vimeo URL format',
            videoId: null
          };
        }
  
        // Basic format validation - Vimeo IDs are numeric
        if (!/^\d+$/.test(videoId)) {
          return {
            valid: false,
            error: 'Invalid Vimeo video ID format',
            videoId
          };
        }
  
        const hash = this.extractHash(url);
        const metadata = await this.fetchVideoMetadata(videoId);
  
        return {
          valid: true,
          videoId,
          hash,
          title: metadata.title,
          thumbnail: metadata.thumbnail,
          duration: metadata.duration,
          author: metadata.author
        };
      } catch (error) {
        return {
          valid: false,
          error: error.message,
          videoId: this.extractVideoId(url)
        };
      }
    }
  
    /**
     * Generate embed HTML for Vimeo video
     * @param {string} videoId - Vimeo video ID
     * @param {Object} options - Embed options
     * @returns {string} HTML embed code
     */
    generateEmbedHTML(videoId, options = {}) {
      const embedUrl = this.generateEmbedURL(videoId, options);
  
      return `
        <iframe
          src="${embedUrl}"
          frameborder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
          style="width: 800px; height: 450px; max-width: 90vw; border: none; border-radius: 8px;"
        ></iframe>
      `;
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
        timeout: this.cacheTimeout
      };
    }
  
    /**
     * Clear all cached data
     */
    clearCache() {
      this.cache.clear();
    }
  }
  
  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VimeoHandler;
  } else if (typeof window !== 'undefined') {
    window.VimeoHandler = VimeoHandler;
  }
  
  // Create singleton instance
  const vimeoHandler = new VimeoHandler();