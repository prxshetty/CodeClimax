class YouTubeHandler {
  constructor() {
    this.apiKey = null; // Optional: for advanced features
    this.cache = new Map(); // Cache for video metadata
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Extract YouTube video ID from various URL formats
   * @param {string} url - YouTube URL
   * @returns {string|null} Video ID or null if invalid
   */
  extractVideoID(url) {
    if (!url || typeof url !== 'string') {
      console.log('YouTubeHandler: Invalid URL type or empty');
      return null;
    }

    console.log('YouTubeHandler: Processing URL:', url);

    const patterns = [
      // Standard watch URL
      /youtube\.com\/watch\?v=([^&]+)/,
      // Short URL
      /youtu\.be\/([^?]+)/,
      // Embed URL
      /youtube\.com\/embed\/([^?]+)/,
      // v URL
      /youtube\.com\/v\/([^?]+)/,
      // Shortened watch URL
      /youtube\.com\/watch\?.*v=([^&]+)/,
      // Music URLs
      /music\.youtube\.com\/watch\?v=([^&]+)/,
      // YouTube Shorts (handles with or without parameters)
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('YouTubeHandler: Pattern matched:', pattern.toString(), 'Video ID:', match[1]);
        return match[1];
      }
    }

    console.log('YouTubeHandler: No patterns matched for URL:', url);
    return null;
  }

  /**
   * Validate YouTube URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid YouTube URL
   */
  isValidYouTubeURL(url) {
    return this.extractVideoID(url) !== null;
  }

  /**
   * Generate YouTube embed URL
   * @param {string} videoId - YouTube video ID
   * @param {Object} options - Embed options
   * @returns {string} Embed URL
   */
  generateEmbedURL(videoId, options = {}) {
    const params = new URLSearchParams();

    // Default options for celebrations
    const defaultOptions = {
      autoplay: 1,
      mute: 1,
      start: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      showinfo: 0,
      iv_load_policy: 3,
      disablekb: 0
    };

    const finalOptions = { ...defaultOptions, ...options };

    Object.entries(finalOptions).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }

  /**
   * Get thumbnail URL for a YouTube video
   * @param {string} videoId - YouTube video ID
   * @param {string} quality - Thumbnail quality (default, medium, high, maxres)
   * @returns {string} Thumbnail URL
   */
  getThumbnailURL(videoId, quality = 'medium') {
    const qualityMap = {
      default: 'default',
      medium: 'mqdefault',
      high: 'hqdefault',
      maxres: 'maxresdefault'
    };

    const suffix = qualityMap[quality] || qualityMap.medium;
    return `https://img.youtube.com/vi/${videoId}/${suffix}.jpg`;
  }

  /**
   * Fetch video metadata using noembed.com (free API)
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Video metadata
   */
  async fetchVideoMetadata(videoId) {
    // Check cache first
    const cacheKey = `metadata_${videoId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const metadata = {
        videoId,
        title: data.title || 'Unknown Title',
        author: data.author_name || 'Unknown Author',
        thumbnail: this.getThumbnailURL(videoId, 'medium'),
        duration: null, // noembed doesn't provide duration
        url: data.url || `https://www.youtube.com/watch?v=${videoId}`
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: metadata,
        timestamp: Date.now()
      });

      return metadata;
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      throw new Error(`Failed to fetch video metadata: ${error.message}`);
    }
  }

  /**
   * Validate YouTube video and return metadata
   * @param {string} url - YouTube URL
   * @returns {Promise<Object>} Validation result
   */
  async validateYouTubeVideo(url) {
    try {
      const videoId = this.extractVideoID(url);
      if (!videoId) {
        return {
          valid: false,
          error: 'Invalid YouTube URL format',
          videoId: null
        };
      }

      // Basic format validation
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return {
          valid: false,
          error: 'Invalid YouTube video ID format',
          videoId
        };
      }

      // Try to fetch metadata to verify video exists
      const metadata = await this.fetchVideoMetadata(videoId);

      return {
        valid: true,
        videoId,
        title: metadata.title,
        author: metadata.author,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        url: metadata.url
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        videoId: this.extractVideoID(url)
      };
    }
  }

  /**
   * Generate multiple thumbnail URLs for fallback
   * @param {string} videoId - YouTube video ID
   * @returns {Array} Array of thumbnail URLs in order of preference
   */
  getThumbnailFallbacks(videoId) {
    return [
      this.getThumbnailURL(videoId, 'maxres'),
      this.getThumbnailURL(videoId, 'high'),
      this.getThumbnailURL(videoId, 'medium'),
      this.getThumbnailURL(videoId, 'default')
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
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<string>} First accessible thumbnail URL
   */
  async getAccessibleThumbnail(videoId) {
    const fallbacks = this.getThumbnailFallbacks(videoId);

    for (const url of fallbacks) {
      if (await this.checkThumbnailAccessible(url)) {
        return url;
      }
    }

    // Return the default thumbnail as last resort
    return this.getThumbnailURL(videoId, 'default');
  }

  /**
   * Generate celebration embed HTML
   * @param {string} videoId - YouTube video ID
   * @param {Object} options - Embed options
   * @returns {string} HTML iframe embed
   */
  generateEmbedHTML(videoId, options = {}) {
    const embedUrl = this.generateEmbedURL(videoId, options);

    return `
      <iframe
        src="${embedUrl}"
        frameborder="0"
        allow="autoplay; encrypted-media"
        allowfullscreen
        style="width: 800px; height: 450px; max-width: 90vw; border: none; border-radius: 16px;"
      ></iframe>
    `;
  }

  /**
   * Get video duration using oembed endpoint (limited accuracy)
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<number|null>} Duration in seconds or null if unavailable
   */
  async getVideoDuration(videoId) {
    try {
      // YouTube oembed doesn't provide duration, so we'll return null
      // In a production environment, you might use the YouTube Data API
      return null;
    } catch (error) {
      console.error('Error getting video duration:', error);
      return null;
    }
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
      oldestEntry: Math.min(...Array.from(this.cache.values()).map(v => v.timestamp))
    };
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Generate YouTube watch URL from video ID
   * @param {string} videoId - YouTube video ID
   * @param {number} startTime - Start time in seconds (optional)
   * @returns {string} Watch URL
   */
  generateWatchURL(videoId, startTime = 0) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    return startTime > 0 ? `${url}&t=${startTime}` : url;
  }

  /**
   * Parse YouTube playlist URL
   * @param {string} url - YouTube playlist URL
   * @returns {Object|null} Playlist info or null
   */
  parsePlaylistURL(url) {
    const patterns = [
      /youtube\.com\/playlist\?list=([^&]+)/,
      /youtube\.com\/watch\?.*list=([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return {
          playlistId: match[1],
          type: 'playlist'
        };
      }
    }

    return null;
  }

  /**
   * Check if URL is a YouTube playlist
   * @param {string} url - URL to check
   * @returns {boolean} True if playlist URL
   */
  isPlaylistURL(url) {
    return this.parsePlaylistURL(url) !== null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = YouTubeHandler;
} else if (typeof window !== 'undefined') {
  window.YouTubeHandler = YouTubeHandler;
}

// Create singleton instance
const youtubeHandler = new YouTubeHandler();