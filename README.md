<div align="center">
  <img src="assets/icon-128.png" alt="CodeClimax Logo" width="120">
</div>

# CodeClimax 

A Chrome extension that celebrates your problem-solving successes with custom media. When you solve a LeetCode problem, the extension detects your success and displays a celebration overlay with your chosen media.


<table>
  <tr>
    <td>
      <img src="assets/screenshots/popup-demo.png" width="350" />
    </td>
    <td>
      <img src="https://github.com/user-attachments/assets/d0019f57-6466-4b1a-98b1-c303f71d39ca" width="350" />
    </td>
  </tr>
</table>


---

## ✨ Features

### 🎬 Media Support
- **YouTube Videos**: Add clips from any YouTube video
- **Vimeo Videos**: Add high-quality video clips from Vimeo
- **Tenor GIFs**: Add high-quality GIFs from Tenor
- **Giphy GIFs**: Add animated GIFs from Giphy
- **Easy Selection**: Choose specific media for celebrations with one click


### ⚡ Easy to Use
- **Single URL Input**: One input field for all supported media platforms
- **Click to Select**: Simply click on any media to select it for celebrations
- **One-Click Management**: Easy edit, delete, and organize functionality
- **Multi-Browser Support**: Works on Chrome, Edge, Brave, and Firefox

---

## 🚀 Installation

### Quick Install (Recommended for most users)

1. **Download the extension**
   ```bash
   git clone https://github.com/prxshetty/CodeClimax.git
   cd CodeClimax
   ```

2. **Choose your browser below** and follow the specific instructions

---

### 🌐 Google Chrome / Microsoft Edge

**Step 1: Open Extensions Page**
- **Chrome**: Go to `chrome://extensions/`
- **Edge**: Go to `edge://extensions/`
- Or use menu: Three dots → More tools → Extensions

**Step 2: Enable Developer Mode**
- Toggle **"Developer mode"** in top right corner
- This enables loading unpacked extensions

**Step 3: Load the Extension**
- Click **"Load unpacked"** button
- Navigate to and select the `CodeClimax` folder
- Click "Select Folder"

**Step 4: Verify Installation**
- Look for CodeClimax icon in your browser toolbar
- If you don't see it: Click puzzle piece icon → Pin CodeClimax
- Click the icon to open settings panel

---

### 🦊 Mozilla Firefox

**Step 1: Open Debug Mode**
- Go to `about:debugging`
- Click **"This Firefox"** in the left sidebar

**Step 2: Load Temporary Add-on**
- Click **"Load Temporary Add-on"**
- Navigate to the `CodeClimax` folder
- Select any file in the folder (like `manifest.json`)

**Step 3: Note for Firefox**
- The extension will only work for the current session
- For permanent installation, you'll need to sign the extension
- Consider using Chrome/Edge for better compatibility

---

### 🧪 Brave Browser

**Step 1: Open Extensions**
- Go to `brave://extensions/`
- Or: Menu → Extensions

**Step 2: Enable Developer Mode**
- Toggle **"Developer mode"** switch

**Step 3: Load Extension**
- Click **"Load unpacked"**
- Select the `CodeClimax` folder
- Extension will be installed

---

### 🔧 Installation Troubleshooting

**"Extension not allowed" Error**
- Ensure you're loading a folder, not individual files
- Check that `manifest.json` exists in the folder
- Try different browser (Chrome/Edge recommended)

**"Package is invalid" Error**
- Verify all files are downloaded
- Check `manifest.json` syntax
- Ensure no files are corrupted

**Icon Not Visible**
- Click puzzle piece icon in toolbar
- Find CodeClimax and click the pin icon
- Extension should now appear in toolbar

---

### ✅ Verification Steps

After installation, verify everything works:

1. **Icon Check**: CodeClimax icon appears in toolbar
2. **Popup Opens**: Click icon → settings panel opens
3. **URL Input**: You can paste URLs in the input field
4. **Test Media**: Try adding a YouTube or Tenor URL
5. **LeetCode Test**: Visit a LeetCode problem page

**Ready to Go! 🎉**
Your CodeClimax extension is now installed and ready to celebrate your coding victories!

---

## 📖 How to Use

### Adding Your First Celebration

1. **Open CodeClimax Settings**
   - Click the CodeClimax icon in your Chrome toolbar
   - The settings panel will open

2. **Add Media**
   - Find a YouTube video, Vimeo video, Tenor GIF, or Giphy GIF you like
   - Copy the URL (examples below)
   - Paste it into the URL field
   - Click "Add"

3. **Select for Celebrations**
   - Click on any media item in your library to select it
   - Selected items will have a yellow border and checkmark
   - That's it! Your selection will now play when you solve problems

### Supported URLs

**YouTube Videos:**
- `https://youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://youtube.com/shorts/dQw4w9WgXcQ`
- `https://youtube.com/embed/dQw4w9WgXcQ`

**Tenor GIFs:**
- `https://tenor.com/view/excited-celebration-dance-gif-12345678`

**Giphy GIFs:**
- `https://giphy.com/gifs/excited-celebration-dance-12345678`
- `https://gph.is/excited-celebration-dance`

**Vimeo Videos:**
- `https://vimeo.com/123456789`
- `https://player.vimeo.com/video/123456789`

### Managing Your Library

**Delete Media:**
- Click the 🗑️ delete button on any media item
- The media will be immediately removed from your library (no confirmation needed)

**Clear All:**
- Click the trash icon in the Media Library header
- This removes all media except the default celebration
- Useful for starting fresh

---

## 🎯 How It Works

### Success Detection
CodeClimax automatically detects when you successfully solve a LeetCode problem using:

1. **DOM Monitoring**: Watches for success indicators on the page
2. **Smart Detection**: Recognizes "Accepted", "Success", and "Passed" messages
3. **Prevention of Duplicates**: Avoids showing multiple celebrations for the same problem

### Media Selection Logic
When you solve a problem, CodeClimax chooses celebration media in this order:

1. **User Selected**: If you explicitly selected media, it plays first
2. **User Uploads**: Any media you've uploaded
3. **Default**: The classic DiCaprio celebration

### Storage
- All media and settings are stored locally in your browser
- No data is sent to external servers
- Your privacy is protected

---

## 🛠️ Troubleshooting

### Extension Not Working
**Problem**: Celebrations don't appear when solving problems
**Solutions**:
1. Make sure you're on a LeetCode problem page (`leetcode.com/problems/*`)
2. Check that the extension is enabled (no errors in Chrome extensions page)
3. Refresh the LeetCode page after installing the extension
4. Try solving a simple problem to test

### Media Not Adding
**Problem**: "Error adding media" message
**Solutions**:
1. Check that the URL is correct (copy/paste directly from YouTube/Tenor)
2. Make sure the video/GIF is public and accessible
3. Try a different URL to test
4. Check your internet connection

### Media Not Playing
**Problem**: Black screen or media doesn't load
**Solutions**:
1. Check your internet connection
2. Try selecting a different media item
3. Clear the extension data and re-add media
4. Some YouTube videos may have restrictions - try another one

### Reset Extension
If everything else fails:
1. Open CodeClimax settings
2. Click the trash icon to clear all media
3. Refresh LeetCode pages
4. Re-add your media

---

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Reporting Issues
1. Check existing issues on GitHub
2. Create a detailed bug report
3. Include:
   - Chrome version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Feature Requests
1. Check if already requested
2. Describe the feature clearly
3. Explain why it would be useful
4. Provide examples if possible

### Code Contributions
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📋 Changelog

### Version 1.1.0 (Latest)
- **Removed Confirmation Dialog**: Individual media items now delete immediately when clicking the 🗑️ button
- **Added Giphy Support**: Import GIFs from Giphy URLs
- **Added Vimeo Support**: Import video clips from Vimeo URLs
- **Enhanced URL Support**: Expanded URL validation for all supported platforms

### Version 1.0.0
- Initial release with YouTube and Tenor support
- Basic media library management
- LeetCode success detection
- Celebration overlay system

---

## 🔒 Privacy Policy

Your privacy is important to us. CodeClimax is designed to be privacy-focused:

- **Local Storage Only**: All data is stored locally in your browser
- **No Personal Data Collection**: We don't collect personal information, browsing history, or transmit data to servers
- **User Control**: You have complete control over your celebration media and settings
- **Transparency**: Full transparency about what data is stored and why

**Read our full [Privacy Policy](PRIVACY.md)** for detailed information about data handling and your rights.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE)

---


