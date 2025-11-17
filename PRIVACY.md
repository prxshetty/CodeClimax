# CodeClimax Privacy Policy

**Last Updated:** November 17, 2025

## Overview

CodeClimax is a browser extension that enhances your LeetCode experience by displaying celebration media when you successfully solve programming problems. This privacy policy explains how we handle your data.

## Data Collection

### What We Collect

**Local Storage Only:**
- Extension settings and preferences (enabled/disabled status, selected media)
- User-provided celebration media URLs (YouTube, Giphy, Tenor, Vimeo, direct image/video links)
- Media metadata (titles, thumbnails, timestamps) for organizing your celebrations
- Temporary cache data for improved performance

**What We DON'T Collect:**
- Personally identifiable information (name, email, address, etc.)
- Account credentials or passwords
- Financial information
- Location data
- Browsing history
- Personal communications
- Health information
- Authentication tokens

### How We Collect Data

We collect data only when you:
- Add celebration media URLs to your collection
- Change extension settings
- The extension detects a successful LeetCode submission (DOM observation only)

## Data Usage

### How Your Data Is Used

- **Display Celebrations**: Show your selected celebration media when you solve LeetCode problems
- **Manage Collection**: Organize and store your personal celebration media library
- **Extension Settings**: Remember your preferences for future sessions
- **Performance**: Cache media metadata to reduce loading times

### What We Don't Do With Your Data

- We do not sell your data to third parties
- We do not share your data with advertisers
- We do not use your data for profiling or analytics
- We do not transmit your data to external servers (except for media embedding)

## Data Storage

### Local Storage

All your data is stored locally in your browser using `chrome.storage.local`:
- **Maximum Storage**: 10MB per browser profile
- **Data Type**: JSON format containing settings and media metadata
- **Location**: Browser's local storage (not accessible to websites)

### Media URLs

When you add media URLs:
- The URLs and associated metadata are stored locally
- The extension validates URLs by making temporary HTTP requests to fetch metadata
- Actual media files are not downloaded or stored by the extension
- Media is displayed using iframes or img elements pointing to the original sources

## Data Security

### Security Measures

- All data remains on your local device
- No data is transmitted to CodeClimax servers
- Extension permissions are limited to necessary functionality
- Media URLs are validated before storage

### External Services

When using media from external platforms:
- **YouTube**: Videos are embedded using YouTube's iframe player
- **Giphy**: GIFs are displayed using direct image URLs
- **Tenor**: GIFs are displayed using direct image URLs
- **Vimeo**: Videos are embedded using Vimeo's iframe player

These services have their own privacy policies. CodeClimax does not collect or share data with these services beyond what's necessary for media embedding.

## Third-Party Services

### LeetCode Integration

- **Purpose**: Detect successful problem submissions
- **Data Access**: DOM observation of success indicators only
- **Scope**: Only on `leetcode.com` problem pages
- **No Collection**: No personal data or problem solutions are collected

### External Media Platforms

- **Purpose**: Embed user-selected celebration media
- **No API Keys**: We use public embedding methods
- **No Data Sharing**: No user data is shared with these platforms

## Your Rights

### Data Control

You have complete control over your data:
- **Access**: View all stored data in browser extension settings
- **Modify**: Edit or remove any celebration media
- **Export**: Export all your celebration data for backup
- **Delete**: Remove all data by uninstalling the extension
- **Clear**: Reset extension to default settings

### Browser Extensions

Data management is handled through standard Chrome extension APIs:
- Access extension settings through the extension popup
- Clear data through Chrome extension management
- Uninstall to remove all stored data permanently

## Data Retention

### Retention Period

- **Local Storage**: Data remains until you remove it
- **Cache**: Temporary metadata cached for 5-10 minutes for performance
- **Settings**: Stored indefinitely until changed by user
- **No Automatic Deletion**: Data doesn't expire unless you remove it

### Cleanup Options

The extension provides options to:
- Remove individual celebration items
- Clear old celebrations (older than 30 days, excluding favorites)
- Export data before deletion
- Reset to default settings

## Children's Privacy

CodeClimax is not directed to children under 13:
- We do not knowingly collect personal information from children
- If you believe a child has provided data, please contact us
- Parents can review and manage extension data through browser controls

## International Users

CodeClimax operates globally:
- Data is stored locally on your device regardless of location
- No cross-border data transfers occur
- No compliance with specific regional data protection laws needed for local storage

## Changes to This Policy

### Updates

- This policy may be updated to reflect changes in the extension
- Significant changes will be updated in the extension description
- The "Last Updated" date will be changed when modifications are made
- Users will be notified of major privacy changes through extension updates

### Version History

- **November 17, 2024**: Initial privacy policy creation

## Contact Information

### Questions and Concerns

For privacy-related questions about CodeClimax:
- **GitHub Repository**: [https://github.com/prxshetty/CodeClimax](https://github.com/prxshetty/CodeClimax)
- **Issues**: Report privacy concerns through GitHub Issues
- **Email**: Available through GitHub profile contact information

### Data Requests

To request access, modification, or deletion of your data:
- Use the extension's built-in data management features
- Contact us through GitHub for assistance
- Data is entirely under your control through local browser storage

---

**Privacy Commitment**

CodeClimax is committed to protecting your privacy. We believe in:
- Data minimization (collecting only what's necessary)
- Local storage (keeping data on your device)
- Transparency (clear explanation of our practices)
- User control (giving you complete control over your data)

This privacy policy is designed to be clear, comprehensive, and compliant with browser store requirements and privacy best practices.