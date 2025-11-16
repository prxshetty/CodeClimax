// CodeClimax - LeetCode Celebration Extension
// popup.js - Clean media management interface

class CodeClimaxPopup {
  constructor() {
    this.celebrations = [];
    this.settings = {};
    this.init();
  }

  async init() {
    console.log('CodeClimax popup initialized');

    try {
      await this.loadData();
      this.setupEventListeners();
      this.renderUI();
    } catch (error) {
      console.error('Error initializing popup:', error);
      this.showToast('Error initializing extension', 'error');
    }
  }

  async loadData() {
    const result = await chrome.storage.local.get(['settings', 'celebrations']);
    this.settings = result.settings || {
      enabled: true,
      selectedMedia: null
    };
    this.celebrations = result.celebrations || [];
  }

  async saveData() {
    await chrome.storage.local.set({
      settings: this.settings,
      celebrations: this.celebrations
    });
  }

  setupEventListeners() {
    // Single URL input for both YouTube and Tenor
    document.getElementById('addMedia').addEventListener('click', () => {
      this.handleMediaAdd();
    });

    document.getElementById('mediaUrl').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleMediaAdd();
      }
    });

    // Clear all media
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all celebration media? This cannot be undone.')) {
        this.clearAllMedia();
      }
    });
  }

  renderUI() {
    // Render media library
    this.renderMediaLibrary();
  }

  renderMediaLibrary() {
    const mediaGrid = document.getElementById('mediaGrid');
    const emptyState = document.getElementById('emptyState');

    if (this.celebrations.length === 0) {
      mediaGrid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    mediaGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    mediaGrid.innerHTML = this.celebrations.map(celebration => `
      <div class="media-item ${celebration.isFavorite ? 'favorite' : ''} ${celebration.id === this.settings.selectedMedia ? 'selected' : ''}" data-id="${celebration.id}">
        <div class="media-thumbnail">
          ${this.getThumbnailHTML(celebration)}
        </div>
        <div class="media-info">
          <div class="media-name">${celebration.name}</div>
          <div class="media-meta">
            <span class="media-type">${celebration.type}</span>
            <span class="media-duration">${celebration.duration}s</span>
            ${celebration.isFavorite ? '<span class="favorite-star">⭐</span>' : ''}
            ${celebration.id === this.settings.selectedMedia ? '<span class="selected-indicator">✓</span>' : ''}
          </div>
        </div>
        <div class="media-actions">
          <button class="media-action-btn delete" data-id="${celebration.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');

    // Add click handlers for media selection
    mediaGrid.querySelectorAll('.media-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't select if clicking on action buttons
        if (!e.target.closest('.media-actions')) {
          this.selectMedia(item.dataset.id);
        }
      });
    });

    // Add click handlers for delete buttons
    mediaGrid.querySelectorAll('.media-action-btn.delete').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMedia(button.dataset.id);
      });
    });
  }

  getThumbnailHTML(celebration) {
    switch (celebration.type) {
      case 'youtube':
        return `<img src="${celebration.thumbnail}" alt="${celebration.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
      case 'image':
      case 'gif':
        return `<img src="${celebration.thumbnail || celebration.data}" alt="${celebration.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
      case 'video':
        return '🎬';
      default:
        return '📁';
    }
  }

  async handleMediaAdd() {
    const url = document.getElementById('mediaUrl').value.trim();
    if (!url) {
      this.showToast('Please enter a YouTube or Tenor URL', 'warning');
      return;
    }

    try {
      // Determine the type based on URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        await this.handleYouTubeAdd(url);
      } else if (url.includes('tenor.com')) {
        await this.handleTenorAdd(url);
      } else {
        throw new Error('Invalid URL. Please enter a YouTube or Tenor URL.');
      }
    } catch (error) {
      this.showToast(`Error adding media: ${error.message}`, 'error');
    }
  }

  async handleYouTubeAdd(url) {
    // Send validation request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'validateYouTube',
      url: url
    });

    if (!response.valid) {
      throw new Error(response.error);
    }

    // Create YouTube celebration
    const celebration = {
      id: this.generateId(),
      type: 'youtube',
      data: response.videoId,
      duration: 10,
      name: `YouTube: ${response.title || response.videoId}`,
      thumbnail: response.thumbnail,
      isFavorite: false,
      uploadedAt: Date.now()
    };

    this.celebrations.push(celebration);
    await this.saveData();
    this.renderMediaLibrary();

    document.getElementById('mediaUrl').value = '';
    this.showToast('YouTube video added successfully', 'success');
  }

  async handleTenorAdd(url) {
    // Send validation request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'validateTenor',
      url: url
    });

    if (!response.valid) {
      throw new Error(response.error);
    }

    // Create Tenor GIF celebration
    const celebration = {
      id: this.generateId(),
      type: 'gif',
      data: response.gifUrl,
      duration: 8,
      name: `Tenor: ${response.title || response.gifId}`,
      thumbnail: response.thumbnailUrl,
      isFavorite: false,
      uploadedAt: Date.now()
    };

    this.celebrations.push(celebration);
    await this.saveData();
    this.renderMediaLibrary();

    document.getElementById('mediaUrl').value = '';
    this.showToast('Tenor GIF added successfully', 'success');
  }

  async selectMedia(id) {
    // Toggle selection if already selected
    if (this.settings.selectedMedia === id) {
      this.settings.selectedMedia = null;
    } else {
      this.settings.selectedMedia = id;
    }

    await this.saveData();
    this.renderMediaLibrary();

    const message = this.settings.selectedMedia
      ? 'Media selected for celebrations'
      : 'Media selection cleared';
    this.showToast(message, 'success');
  }

  
  async deleteMedia(id) {
    if (!confirm('Are you sure you want to delete this celebration?')) return;

    const index = this.celebrations.findIndex(c => c.id === id);
    if (index !== -1) {
      this.celebrations.splice(index, 1);

      // Clear selection if this media was selected
      if (this.settings.selectedMedia === id) {
        this.settings.selectedMedia = null;
      }

      await this.saveData();
      this.renderMediaLibrary();
      this.showToast('Media deleted successfully', 'success');
    }
  }

  async clearAllMedia() {
    this.celebrations = [];
    this.settings.selectedMedia = null;

    // Keep the default DiCaprio celebration
    const defaultCelebration = {
      id: 'default-celebration-dicaprio-damn',
      type: 'gif',
      data: 'https://media.tenor.com/16466118.gif',
      duration: 8,
      name: 'Leonardo DiCaprio - Damn!',
      thumbnail: 'https://media.tenor.com/16466118.gif',
      isFavorite: false,
      uploadedAt: Date.now()
    };

    this.celebrations.push(defaultCelebration);
    await this.saveData();
    this.renderMediaLibrary();
    this.showToast('All media cleared successfully', 'success');
  }

  generateId() {
    return 'codecclimax_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toast.className = 'toast ' + type;
    toastMessage.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

// Initialize popup when DOM is ready
const popup = new CodeClimaxPopup();