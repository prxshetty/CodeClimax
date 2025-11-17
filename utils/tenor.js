class TenorHandler {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Extract Tenor GIF ID from various URL formats
   * @param {string} url - Tenor URL
   * @returns {string|null} GIF ID or null if invalid
   */
  extractGifID(url) {
    if (!url || typeof url !== 'string') {
      console.log('TenorHandler: Invalid URL type or empty');
      return null;
    }

    console.log('TenorHandler: Processing URL:', url);

    // Tenor URL patterns
    const patterns = [
      // Standard Tenor view URL
      /tenor\.com\/view\/([^/?]+)/,
      // Tenor GIF URLs with additional parameters
      /tenor\.com\/view\/([^/?]+)\?/,
      // Short Tenor URLs
      /tenor\.com\/([^-]+)-([^/?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('TenorHandler: Pattern matched:', pattern.toString(), 'GIF ID:', match[1]);
        return match[1];
      }
    }

    console.log('TenorHandler: No patterns matched for URL:', url);
    return null;
  }

  /**
   * Validate Tenor URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid Tenor URL
   */
  isValidTenorURL(url) {
    return this.extractGifID(url) !== null;
  }

  /**
   * Fetch Tenor GIF metadata and convert to usable format
   * @param {string} url - Tenor URL
   * @returns {Promise<Object>} GIF metadata with direct media URLs
   */
  async fetchTenorGif(url) {
    const gifId = this.extractGifID(url);

    if (!gifId) {
      throw new Error('Invalid Tenor URL format');
    }

    // Check cache first
    const cacheKey = `tenor_${gifId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    let metadata = null;

    try {
      // Method 1: Fetch the Tenor page to extract GIF URL
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract GIF data from the page
      const gifData = this.extractGifFromPage(html, url);

      if (gifData && gifData.gifUrl) {
        metadata = {
          gifId,
          title: gifData.title || 'Tenor GIF',
          gifUrl: gifData.gifUrl,
          thumbnailUrl: gifData.thumbnailUrl || gifData.gifUrl,
          duration: gifData.duration || null,
          tags: gifData.tags || [],
          originalUrl: url
        };
      }
    } catch (pageError) {
      console.warn('Failed to fetch from Tenor page, trying API fallback:', pageError.message);
    }

    // Method 2: Try to use a direct URL construction as fallback
    if (!metadata) {
      try {
        // Try common Tenor URL patterns
        const fallbackUrls = [
          `https://media.tenor.com/${gifId}.gif`,
          `https://c.tenor.com/${gifId}.gif`,
          `https://media1.tenor.com/images/${gifId}.gif`
        ];

        // Test each URL to see if it works
        for (const testUrl of fallbackUrls) {
          try {
            const testResponse = await fetch(testUrl, { method: 'HEAD' });
            if (testResponse.ok) {
              metadata = {
                gifId,
                title: 'Tenor GIF',
                gifUrl: testUrl,
                thumbnailUrl: testUrl,
                duration: null,
                tags: [],
                originalUrl: url
              };
              console.log('Found working GIF URL via fallback:', testUrl);
              break;
            }
          } catch (urlError) {
            // Continue to next URL
            continue;
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback URL construction failed:', fallbackError.message);
      }
    }

    if (!metadata) {
      throw new Error('Could not extract GIF data from Tenor page and all fallbacks failed');
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data: metadata,
      timestamp: Date.now()
    });

    return metadata;
  }

  /**
   * Extract GIF data from Tenor page HTML
   * @param {string} html - Page HTML content
   * @param {string} originalUrl - Original Tenor URL
   * @returns {Object|null} Extracted GIF data
   */
  extractGifFromPage(html, originalUrl) {
    try {
      // Try multiple methods to extract GIF URL

      // Method 1: Look for JSON data in script tags
      const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+});/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const gifData = this.extractFromInitialState(data);
          if (gifData) return gifData;
        } catch (e) {
          console.log('Failed to parse initial state:', e);
        }
      }

      // Method 2: Look for JSON data in script tags with different pattern
      const jsonMatch2 = html.match(/window\.__PRELOADED_STATE__\s*=\s*({.+});/);
      if (jsonMatch2) {
        try {
          const data = JSON.parse(jsonMatch2[1]);
          const gifData = this.extractFromInitialState(data);
          if (gifData) return gifData;
        } catch (e) {
          console.log('Failed to parse preloaded state:', e);
        }
      }

      // Method 3: Look for GIF URLs in meta tags
      const gifUrlMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (gifUrlMatch) {
        let gifUrl = gifUrlMatch[1];
        // Make sure we're getting the actual GIF, not a thumbnail
        if (!gifUrl.includes('.gif')) {
          // Try to construct the direct GIF URL from the thumbnail URL
          gifUrl = gifUrl.replace(/-tenor\.gif$/, '.gif');
        }
        return {
          gifUrl: gifUrl,
          thumbnailUrl: gifUrlMatch[1],
          title: this.extractTitleFromPage(html)
        };
      }

      // Method 4: Look for direct GIF URLs with better patterns
      const directGifPatterns = [
        /"url":"([^"]+\.gif[^"]*)"/,
        /"gif":"([^"]+\.gif[^"]*)"/,
        /"mediaurl":"([^"]+\.gif[^"]*)"/,
        /"src":"([^"]+media\.tenor\.com[^"]+\.gif[^"]*)"/
      ];

      for (const pattern of directGifPatterns) {
        const directGifMatch = html.match(pattern);
        if (directGifMatch) {
          let gifUrl = directGifMatch[1];
          // Unescape encoded characters
          gifUrl = gifUrl.replace(/\\u002F/g, '/').replace(/\\/g, '');
          return {
            gifUrl: gifUrl,
            thumbnailUrl: gifUrl,
            title: this.extractTitleFromPage(html)
          };
        }
      }

      // Method 5: Look for Tenor media URLs with specific patterns
      const tenorUrlMatch = html.match(/https?:\/\/media\.tenor\.com\/[^"'\s]+\.gif/g);
      if (tenorUrlMatch && tenorUrlMatch.length > 0) {
        // Get the first (largest) GIF URL found
        const gifUrl = tenorUrlMatch[0];
        return {
          gifUrl: gifUrl,
          thumbnailUrl: gifUrl,
          title: this.extractTitleFromPage(html)
        };
      }

      // Method 6: Fallback - try to extract from data attributes
      const dataMatch = html.match(/data-gif-url="([^"]+)"/);
      if (dataMatch) {
        return {
          gifUrl: dataMatch[1],
          thumbnailUrl: dataMatch[1],
          title: this.extractTitleFromPage(html)
        };
      }

      console.log('No GIF URL found in Tenor page');
      return null;
    } catch (error) {
      console.error('Error extracting GIF data:', error);
      return null;
    }
  }

  /**
   * Extract GIF data from Tenor's initial state
   * @param {Object} stateData - Parsed initial state data
   * @returns {Object|null} Extracted GIF data
   */
  extractFromInitialState(stateData) {
    try {
      // Navigate through the state structure to find GIF data
      let gifData = null;

      // Try different paths where GIF data might be stored
      const possiblePaths = [
        stateData?.gifs?.single,
        stateData?.gif,
        stateData?.singleGif,
        stateData?.data?.gif
      ];

      for (const path of possiblePaths) {
        if (path && path.media) {
          gifData = path;
          break;
        }
      }

      if (!gifData || !gifData.media) {
        return null;
      }

      // Extract the best quality GIF URL
      const mediaArray = Object.values(gifData.media);
      const bestMedia = mediaArray.find(media => media && media.url) || mediaArray[0];

      if (!bestMedia || !bestMedia.url) {
        return null;
      }

      return {
        gifUrl: bestMedia.url,
        thumbnailUrl: bestMedia.preview || bestMedia.url,
        title: gifData.title || gifData.description || 'Tenor GIF',
        duration: bestMedia.duration,
        tags: gifData.tags || []
      };
    } catch (error) {
      console.error('Error extracting from initial state:', error);
      return null;
    }
  }

  /**
   * Extract title from page HTML
   * @param {string} html - Page HTML content
   * @returns {string} Extracted title
   */
  extractTitleFromPage(html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (titleMatch) {
      let title = titleMatch[1];
      // Clean up title
      title = title.replace(/\s*-\s*Tenor.*$/i, '');
      title = title.replace(/\s*GIF.*$/i, '');
      return title.trim();
    }
    return 'Tenor GIF';
  }

  /**
   * Validate Tenor GIF and return metadata
   * @param {string} url - Tenor URL
   * @returns {Promise<Object>} Validation result
   */
  async validateTenorGif(url) {
    try {
      const gifId = this.extractGifID(url);
      if (!gifId) {
        return {
          valid: false,
          error: 'Invalid Tenor URL format',
          gifId: null
        };
      }

      // Basic format validation
      if (!/^[a-zA-Z0-9_-]+$/.test(gifId)) {
        return {
          valid: false,
          error: 'Invalid Tenor GIF ID format',
          gifId
        };
      }

      // Try to fetch GIF metadata
      const metadata = await this.fetchTenorGif(url);

      return {
        valid: true,
        gifId,
        title: metadata.title,
        gifUrl: metadata.gifUrl,
        thumbnailUrl: metadata.thumbnailUrl,
        duration: metadata.duration,
        originalUrl: url
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        gifId: this.extractGifID(url)
      };
    }
  }

  /**
   * Generate direct embed HTML for Tenor GIF
   * @param {Object} metadata - GIF metadata
   * @returns {string} HTML embed code
   */
  generateEmbedHTML(metadata) {
    return `
      <img
        src="${metadata.gifUrl}"
        alt="${metadata.title}"
        style="display: block; max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px;"
      />
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TenorHandler;
} else if (typeof window !== 'undefined') {
  window.TenorHandler = TenorHandler;
}

// Create singleton instance
const tenorHandler = new TenorHandler();