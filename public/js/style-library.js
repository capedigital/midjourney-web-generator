// --- Style Library Framework ---
// Function to download web images to local thumbs directory
async function downloadImageToLocal(imageUrl, profileId) {
    try {
        logger.debug('Attempting to download:', imageUrl);
        
        // Handle Cloudflare CDN URLs and other complex URLs
        let fetchUrl = imageUrl;
        let headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };
        
        // For Cloudflare CDN URLs, try to extract the original URL
        if (imageUrl.includes('cdn-cgi/image/')) {
            const match = imageUrl.match(/\/https:\/\/(.+)$/);
            if (match) {
                const originalUrl = 'https://' + match[1];
                logger.debug('Extracted original URL:', originalUrl);
                // Try original URL first
                fetchUrl = originalUrl;
            }
        }
        
        let response;
        let blob;
        
        // Try multiple approaches
        const attempts = [
            // Attempt 1: Original or extracted URL with full headers
            { url: fetchUrl, mode: 'cors', headers },
            // Attempt 2: Original CDN URL with full headers
            { url: imageUrl, mode: 'cors', headers },
            // Attempt 3: Proxy approach (if available)
            { url: imageUrl, mode: 'no-cors', headers: {} },
            // Attempt 4: Basic fetch
            { url: fetchUrl, mode: 'cors', headers: { 'User-Agent': headers['User-Agent'] } }
        ];
        
        for (let i = 0; i < attempts.length; i++) {
            const attempt = attempts[i];
            logger.debug(`Attempt ${i + 1}:`, attempt.url);
            
            try {
                response = await fetch(attempt.url, {
                    method: 'GET',
                    mode: attempt.mode,
                    headers: attempt.headers,
                    credentials: 'omit',
                    referrer: 'no-referrer'
                });
                
                if (response.ok || (attempt.mode === 'no-cors' && response.type === 'opaque')) {
                    blob = await response.blob();
                    if (blob && blob.size > 0) {
                        logger.debug(`Success with attempt ${i + 1}, blob size:`, blob.size);
                        break;
                    }
                }
            } catch (error) {
                logger.debug(`Attempt ${i + 1} failed:`, error.message);
                continue;
            }
        }
        
        if (!blob || blob.size === 0) {
            throw new Error('All download attempts failed or returned empty blob');
        }
        
        // Determine file extension
        const contentType = response?.headers?.get('content-type') || blob.type || 'image/jpeg';
        let extension = 'jpg';
        
        if (contentType.includes('png')) extension = 'png';
        else if (contentType.includes('gif')) extension = 'gif';
        else if (contentType.includes('webp')) extension = 'webp';
        else if (contentType.includes('svg')) extension = 'svg';
        
        const filename = `${profileId}_${Date.now()}.${extension}`;
        
        // Convert blob to base64 for storage
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                if (dataUrl && dataUrl.length > 100) {
                    try {
                        localStorage.setItem(`thumb_${filename}`, dataUrl);
                        logger.debug('Successfully stored image as:', filename);
                        resolve(filename);
                    } catch (storageError) {
                        console.error('Storage error:', storageError);
                        reject(new Error('Failed to store image in localStorage'));
                    }
                } else {
                    reject(new Error('Invalid image data received'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read image data'));
            reader.readAsDataURL(blob);
        });
        
    } catch (error) {
        console.error('Download error details:', error);
        
        // Provide more specific error messages
        if (error.message.includes('CORS')) {
            throw new Error(`CORS error: This image URL (${imageUrl}) doesn't allow downloads from this domain. Try using a direct image URL instead.`);
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error(`Network error: Could not reach the image server. Check if the URL is accessible: ${imageUrl}`);
        } else {
            throw new Error(`Download failed: ${error.message}`);
        }
    }
}

function saveProfiles(profiles) {
  localStorage.setItem('profileLibrary', JSON.stringify(profiles));
}
function loadProfiles() {
  return JSON.parse(localStorage.getItem('profileLibrary') || '[]');
}
function renderProfileLibrary() {
  const profiles = loadProfiles();
  const grid = document.getElementById('profile-library');
  if (!grid) return;
  grid.innerHTML = profiles.length ? profiles.map(profile => {
    // Handle different thumbnail types
    let thumbnailSrc;
    if (profile.thumbnail.startsWith('http')) {
      // Web URL
      thumbnailSrc = profile.thumbnail;
    } else if (profile.thumbnail.includes('_')) {
      // Downloaded image stored in localStorage
      const dataUrl = localStorage.getItem(`thumb_${profile.thumbnail}`);
      thumbnailSrc = dataUrl || `./thumbs/${profile.thumbnail}`;
    } else {
      // Local file in thumbs folder
      thumbnailSrc = `./thumbs/${profile.thumbnail}`;
    }
    
    // Determine profile type and styling
    const profileType = profile.type || 'profile';
    const isProfile = profileType === 'profile';
    const typeIcon = isProfile ? 'fas fa-user' : 'fas fa-palette';
    const typeColor = isProfile ? '#4a90e2' : '#5cb85c';
    const typeBadge = isProfile ? 'P' : 'S';
    const typeLabel = isProfile ? '--p profile' : '--sref style';
    
    return `
    <div class="profile-card" style="border-left: 3px solid ${typeColor};">
      <div style="position: absolute; top: 8px; right: 8px; background: ${typeColor}; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
        ${typeBadge}
      </div>
      <img src="${thumbnailSrc}" alt="${profile.name}" class="profile-thumb" onerror="this.src='./thumbs/default.png'">
      <div class="profile-info">
        <strong>${profile.name}</strong>
        <div style="font-size: 11px; margin: 2px 0;">
          <i class="${typeIcon}" style="color: ${typeColor}; margin-right: 4px;"></i>
          ${typeLabel}
        </div>
        <div class="profile-id">${profile.id}</div>
        <p style="font-size: 12px; margin: 4px 0;">${profile.description || ''}</p>
      </div>
      <button type="button" class="edit-profile-btn" data-profile-id="${profile.id}">Edit</button>
      <button type="button" class="delete-profile-btn" data-profile-id="${profile.id}">Delete</button>
      <button type="button" class="copy-code-btn" data-profile-id="${profile.id}" data-profile-type="${profileType}" style="background: ${typeColor}; color: white; border: none; padding: 10px 23px; margin: 10px; border-radius: 50px; font-size: 11px; cursor: pointer;">
        <i class="fas fa-copy"></i> Copy ${typeLabel}
      </button>
    </div>
    `;
  }).join('') : '<div>No profiles yet.</div>';
  
  // Bind event handlers after rendering
  bindProfileEventHandlers();
}

// Bind event handlers for edit/delete buttons
function bindProfileEventHandlers() {
  const grid = document.getElementById('profile-library');
  if (!grid) return;
  
  // Remove existing listeners to prevent duplicates
  grid.removeEventListener('click', handleProfileButtonClick);
  grid.addEventListener('click', handleProfileButtonClick);
}

function handleProfileButtonClick(e) {
  const profileId = e.target.dataset.profileId;
  if (!profileId) return;
  
  if (e.target.classList.contains('edit-profile-btn')) {
    editProfile(profileId);
  } else if (e.target.classList.contains('delete-profile-btn')) {
    deleteProfile(profileId);
  } else if (e.target.classList.contains('copy-code-btn')) {
    copyProfileCode(profileId, e.target.dataset.profileType);
  }
}

function setupAddProfileButton() {
    const addProfileBtn = document.getElementById('add-profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileModalTitle = document.getElementById('profile-modal-title');
    const profileForm = document.getElementById('profile-form');
    const browseBtn = document.getElementById('browse-thumbs');
    const thumbnailBrowser = document.getElementById('thumbnail-browser');
    
    // Setup profile type radio buttons
    setupProfileTypeToggle();
    
    if (addProfileBtn) {
        addProfileBtn.onclick = function() {
            if (profileModal) profileModal.style.display = 'flex';
            if (profileModalTitle) profileModalTitle.textContent = 'Add Profile';
            if (profileForm) profileForm.reset();
            if (thumbnailBrowser) thumbnailBrowser.style.display = 'none';
            
            // Hide thumbnail preview when adding new profile
            const thumbnailPreview = document.getElementById('thumbnail-preview');
            if (thumbnailPreview) thumbnailPreview.style.display = 'none';
            
            // Reset to default profile type
            document.getElementById('profile-type-p').checked = true;
            updateProfileIdPlaceholder();
        };
    }
    
    // Setup browse button for native file picker
    if (browseBtn) {
        browseBtn.onclick = async function() {
            try {
                // Use Electron's native file dialog
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('show-open-dialog', {
                    title: 'Select Thumbnail Image',
                    defaultPath: './thumbs',
                    filters: [
                        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });
                
                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    
                    // Populate the input field with the full file path
                    const thumbnailInput = document.getElementById('profile-thumbnail');
                    if (thumbnailInput) {
                        thumbnailInput.value = filePath;
                    }
                }
            } catch (error) {
                console.error('Error opening file dialog:', error);
                // Fallback to web-based browser if native dialog fails
                if (thumbnailBrowser) {
                    if (thumbnailBrowser.style.display === 'none') {
                        thumbnailBrowser.style.display = 'block';
                        loadThumbsBrowser();
                    } else {
                        thumbnailBrowser.style.display = 'none';
                    }
                }
            }
        };
    }
    
    const profileCancelBtn = document.getElementById('profile-cancel');
    if (profileCancelBtn) {
        profileCancelBtn.onclick = function() {
            if (profileModal) profileModal.style.display = 'none';
        };
    }
    
    if (profileForm) {
        profileForm.onsubmit = async function(e) {
            e.preventDefault();
            const id = document.getElementById('profile-id')?.value;
            const name = document.getElementById('profile-name')?.value;
            let thumbnail = document.getElementById('profile-thumbnail')?.value;
            const description = document.getElementById('profile-description')?.value;
            const profileType = document.querySelector('input[name="profile-type"]:checked')?.value || 'profile';
            
            // Intelligently handle thumbnail: download if URL, process path if local file
            if (thumbnail && thumbnail.startsWith('http')) {
                try {
                    const localFilename = await downloadImageToLocal(thumbnail, id);
                    thumbnail = localFilename; // Use local filename instead of URL
                } catch (error) {
                    console.error('Failed to download image:', error);
                    alert('Failed to download image. Using original URL.');
                }
            } else if (thumbnail && (thumbnail.includes('/') || thumbnail.includes('\\'))) {
                // If it's a full path, extract just the filename for storage
                const filename = thumbnail.split('/').pop() || thumbnail.split('\\').pop();
                thumbnail = filename;
            }
            
            if (profileModal) profileModal.style.display = 'none';
            const profiles = loadProfiles();
            const existingProfileIndex = profiles.findIndex(p => p.id === id);
            const profileData = { id, name, thumbnail, description, type: profileType };
            
            if (existingProfileIndex > -1) {
              profiles[existingProfileIndex] = profileData;
            } else {
              profiles.push(profileData);
            }
            saveProfiles(profiles);
            renderProfileLibrary();
            updatePersonalizationDropdown(); // Update the dropdown when profiles change
          };
    }
}

// Setup thumbnail selection toggle
function setupThumbnailToggle() {
    const urlOption = document.getElementById('thumbnail-url-option');
    const fileOption = document.getElementById('thumbnail-file-option');
    const refreshBtn = document.getElementById('refresh-thumbs');
    
    if (urlOption) urlOption.addEventListener('change', toggleThumbnailSection);
    if (fileOption) fileOption.addEventListener('change', toggleThumbnailSection);
    if (refreshBtn) refreshBtn.addEventListener('click', loadThumbsBrowser);
}

function toggleThumbnailSection() {
    const urlSection = document.getElementById('thumbnail-url-section');
    const fileSection = document.getElementById('thumbnail-file-section');
    const urlOption = document.getElementById('thumbnail-url-option');
    
    if (urlOption && urlOption.checked) {
        if (urlSection) urlSection.style.display = 'block';
        if (fileSection) fileSection.style.display = 'none';
    } else {
        if (urlSection) urlSection.style.display = 'none';
        if (fileSection) fileSection.style.display = 'block';
        loadThumbsBrowser();
    }
}

// Load and display files from thumbs directory
async function loadThumbsBrowser() {
    const browser = document.getElementById('thumbs-browser');
    if (!browser) return;
    
    try {
        const mockFiles = await getMockThumbsFiles();
        
        if (mockFiles.length === 0) {
            browser.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">No images found in thumbs directory.<br><small>Place .jpg, .png, .gif files in the /thumbs folder</small></div>';
            return;
        }
        
        browser.innerHTML = mockFiles.map(file => `
            <div class="file-item" data-filename="${file}" style="display:flex; align-items:center; padding:6px; cursor:pointer; border-radius:3px; margin-bottom:4px;">
                <img src="./thumbs/${file}" style="width:30px; height:30px; object-fit:cover; border-radius:3px; margin-right:8px;" onerror="this.style.display='none'">
                <span style="flex:1; font-size:12px;">${file}</span>
            </div>
        `).join('');
        
        // Add click handlers to populate the input field
        browser.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove previous selection
                browser.querySelectorAll('.file-item').forEach(i => i.style.backgroundColor = '');
                // Highlight selected
                item.style.backgroundColor = '#e3f2fd';
                // Populate the input field with filename
                const thumbnailInput = document.getElementById('profile-thumbnail');
                if (thumbnailInput) {
                    thumbnailInput.value = item.dataset.filename;
                }
                // Hide the browser after selection
                const thumbnailBrowser = document.getElementById('thumbnail-browser');
                if (thumbnailBrowser) {
                    thumbnailBrowser.style.display = 'none';
                }
            });
        });
        
    } catch (error) {
        browser.innerHTML = '<div style="color:red;">Error loading thumbs directory</div>';
    }
}

// Get thumbnail value based on selected option
function getThumbnailValue() {
    const urlOption = document.getElementById('thumbnail-url-option');
    
    if (urlOption && urlOption.checked) {
        return document.getElementById('profile-thumbnail')?.value || '';
    } else {
        const browser = document.getElementById('thumbs-browser');
        return browser?.getAttribute('data-selected') || '';
    }
}

// Setup profile type radio button handlers
function setupProfileTypeToggle() {
    const profileTypeP = document.getElementById('profile-type-p');
    const profileTypeSref = document.getElementById('profile-type-sref');
    
    if (profileTypeP) profileTypeP.addEventListener('change', updateProfileIdPlaceholder);
    if (profileTypeSref) profileTypeSref.addEventListener('change', updateProfileIdPlaceholder);
}

// Update placeholder and label based on profile type
function updateProfileIdPlaceholder() {
    const profileIdInput = document.getElementById('profile-id');
    const profileIdLabel = document.getElementById('profile-id-label');
    const isProfile = document.getElementById('profile-type-p')?.checked;
    
    if (profileIdInput && profileIdLabel) {
        if (isProfile) {
            profileIdLabel.textContent = 'Profile ID';
            profileIdInput.placeholder = 'e.g., myprofile1';
        } else {
            profileIdLabel.textContent = 'Style Reference Code';
            profileIdInput.placeholder = 'e.g., 2007748773';
        }
    }
}

// Mock function to simulate reading thumbs directory
async function getMockThumbsFiles() {
    // In a real Electron app, you'd use:
    // const fs = require('fs');
    // return fs.readdirSync('./thumbs').filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    // For now, return a mock list - you can expand this
    const commonFiles = [
        'default.png',
        'character1.jpg',
        'style1.png',
        'portrait.jpg'
    ];
    
    // Test if files actually exist by trying to load them
    const existingFiles = [];
    for (const file of commonFiles) {
        try {
            const response = await fetch(`./thumbs/${file}`, { method: 'HEAD' });
            if (response.ok) {
                existingFiles.push(file);
            }
        } catch (e) {
            // File doesn't exist, skip
        }
    }
    
    return existingFiles;
}
function editProfile(id) {
  const profiles = loadProfiles();
  const profile = profiles.find(p => p.id === id);
  if (!profile) return;
  
  document.getElementById('profile-id').value = profile.id;
  document.getElementById('profile-name').value = profile.name;
  document.getElementById('profile-thumbnail').value = profile.thumbnail;
  document.getElementById('profile-description').value = profile.description;
  document.getElementById('profile-modal-title').textContent = 'Edit Profile';
  
  // Set profile type (default to 'profile' for backward compatibility)
  const profileType = profile.type || 'profile';
  if (profileType === 'sref') {
    document.getElementById('profile-type-sref').checked = true;
  } else {
    document.getElementById('profile-type-p').checked = true;
  }
  updateProfileIdPlaceholder();
  
  // Show thumbnail preview if thumbnail exists
  const thumbnailPreview = document.getElementById('thumbnail-preview');
  const thumbnailPreviewImage = document.getElementById('thumbnail-preview-image');
  
  if (profile.thumbnail && thumbnailPreview && thumbnailPreviewImage) {
    // Handle different thumbnail types
    let thumbnailSrc;
    if (profile.thumbnail.startsWith('http')) {
      // Web URL
      thumbnailSrc = profile.thumbnail;
    } else if (profile.thumbnail.includes('_')) {
      // Downloaded image stored in localStorage
      const dataUrl = localStorage.getItem(`thumb_${profile.thumbnail}`);
      thumbnailSrc = dataUrl || `./thumbs/${profile.thumbnail}`;
    } else {
      // Local file in thumbs folder
      thumbnailSrc = `./thumbs/${profile.thumbnail}`;
    }
    
    thumbnailPreviewImage.src = thumbnailSrc;
    thumbnailPreviewImage.onerror = () => {
      thumbnailPreview.style.display = 'none';
    };
    thumbnailPreview.style.display = 'block';
  } else if (thumbnailPreview) {
    thumbnailPreview.style.display = 'none';
  }
  
  document.getElementById('profile-modal').style.display = 'flex';
  
  // Hide browser initially
  const thumbnailBrowser = document.getElementById('thumbnail-browser');
  if (thumbnailBrowser) thumbnailBrowser.style.display = 'none';
}

// Load and display files from thumbs directory
async function loadThumbsBrowser() {
    const browser = document.getElementById('thumbs-browser');
    if (!browser) return;
    
    try {
        const mockFiles = await getMockThumbsFiles();
        
        if (mockFiles.length === 0) {
            browser.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">No images found in thumbs directory.<br><small>Place .jpg, .png, .gif files in the /thumbs folder</small></div>';
            return;
        }
        
        browser.innerHTML = mockFiles.map(file => `
            <div class="file-item" data-filename="${file}" style="display:flex; align-items:center; padding:6px; cursor:pointer; border-radius:3px; margin-bottom:4px;">
                <img src="./thumbs/${file}" style="width:30px; height:30px; object-fit:cover; border-radius:3px; margin-right:8px;" onerror="this.style.display='none'">
                <span style="flex:1; font-size:12px;">${file}</span>
            </div>
        `).join('');
        
        // Add click handlers to populate the input field
        browser.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove previous selection
                browser.querySelectorAll('.file-item').forEach(i => i.style.backgroundColor = '');
                // Highlight selected
                item.style.backgroundColor = '#e3f2fd';
                // Populate the input field with filename
                const thumbnailInput = document.getElementById('profile-thumbnail');
                if (thumbnailInput) {
                    thumbnailInput.value = item.dataset.filename;
                }
                // Hide the browser after selection
                const thumbnailBrowser = document.getElementById('thumbnail-browser');
                if (thumbnailBrowser) {
                    thumbnailBrowser.style.display = 'none';
                }
            });
        });
        
    } catch (error) {
        browser.innerHTML = '<div style="color:red;">Error loading thumbs directory</div>';
    }
}

function deleteProfile(id) {
  if (!confirm('Delete this profile?')) return;
  let profiles = loadProfiles();
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles(profiles);
  renderProfileLibrary();
  updatePersonalizationDropdown(); // Update the dropdown when profiles change
}

// Copy profile code to clipboard
function copyProfileCode(profileId, profileType) {
  const prefix = profileType === 'sref' ? '--sref' : '--p';
  const codeText = `${prefix} ${profileId}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(codeText).then(() => {
    // Show success feedback
    const btn = document.querySelector(`[data-profile-id="${profileId}"].copy-code-btn`);
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      btn.style.background = '#5cb85c';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = profileType === 'sref' ? '#5cb85c' : '#4a90e2';
      }, 1500);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
    // Fallback: show the code in an alert
    alert(`Copy this code: ${codeText}`);
  });
}
// Update the Personalization Profiles dropdown in the Prompt Generation module
function updatePersonalizationDropdown() {
    // The dropdown is now replaced with a visual selector
    // We'll keep this function for backward compatibility but focus on the modal
    setupProfileSelector();
}

// Global variable to track selected profiles
let selectedProfiles = [];

// Setup the profile selector modal and button
function setupProfileSelector() {
    const openBtn = document.getElementById('open-profile-selector');
    const modal = document.getElementById('profile-selector-modal');
    const closeBtn = document.getElementById('close-profile-selector');
    const clearBtn = document.getElementById('clear-all-profiles');
    const applyBtn = document.getElementById('apply-profile-selection');
    
    if (openBtn) {
        openBtn.onclick = () => {
            if (modal) {
                modal.style.display = 'flex';
                renderProfileSelectorGrid();
            }
        };
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (modal) modal.style.display = 'none';
        };
    }
    
    if (clearBtn) {
        clearBtn.onclick = () => {
            selectedProfiles = [];
            renderProfileSelectorGrid();
            updateSelectedDisplay();
        };
    }
    
    if (applyBtn) {
        applyBtn.onclick = () => {
            updateSelectedDisplay();
            if (modal) modal.style.display = 'none';
        };
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
}

// Render the profile grid in the selector modal
function renderProfileSelectorGrid() {
    const grid = document.getElementById('profile-selector-grid');
    if (!grid) return;
    
    const profiles = loadProfiles();
    
    if (profiles.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 40px;">No profiles created yet.<br><small>Create profiles in the Style Library first.</small></div>';
        return;
    }
    
    grid.innerHTML = profiles.map(profile => {
        // Handle different thumbnail types
        let thumbnailSrc;
        if (profile.thumbnail.startsWith('http')) {
            thumbnailSrc = profile.thumbnail;
        } else if (profile.thumbnail.includes('_')) {
            const dataUrl = localStorage.getItem(`thumb_${profile.thumbnail}`);
            thumbnailSrc = dataUrl || `./thumbs/${profile.thumbnail}`;
        } else {
            thumbnailSrc = `./thumbs/${profile.thumbnail}`;
        }
        
        // Determine profile type and styling
        const profileType = profile.type || 'profile';
        const isProfile = profileType === 'profile';
        const typeColor = isProfile ? '#4a90e2' : '#5cb85c';
        const typeLabel = isProfile ? '--p' : '--sref';
        const isSelected = selectedProfiles.some(p => p.id === profile.id);
        
        return `
        <div class="profile-selector-item" data-profile-id="${profile.id}" style="
            border: 2px solid ${isSelected ? typeColor : '#555'};
            border-radius: 6px;
            padding: 8px;
            text-align: center;
            cursor: pointer;
            background: ${isSelected ? typeColor + '20' : '#2a2a2a'};
            transition: all 0.2s ease;
        ">
            <img src="${thumbnailSrc}" style="
                width: 80px;
                height: 60px;
                object-fit: cover;
                border-radius: 4px;
                margin-bottom: 6px;
                border: 1px solid #444;
            " onerror="this.src='./thumbs/default.png'">
            <div style="font-size: 10px; color: ${typeColor}; font-weight: bold; margin-bottom: 2px;">
                ${typeLabel} ${profile.id}
            </div>
            <div style="font-size: 11px; color: #ccc; line-height: 1.2;">
                ${profile.name}
            </div>
        </div>
        `;
    }).join('');
    
    // Add click handlers to profile items
    grid.querySelectorAll('.profile-selector-item').forEach(item => {
        item.addEventListener('click', () => {
            const profileId = item.dataset.profileId;
            const profile = profiles.find(p => p.id === profileId);
            if (!profile) return;
            
            // Toggle selection
            const existingIndex = selectedProfiles.findIndex(p => p.id === profileId);
            if (existingIndex > -1) {
                // Remove from selection
                selectedProfiles.splice(existingIndex, 1);
            } else {
                // Add to selection
                selectedProfiles.push(profile);
            }
            
            // Re-render grid to update visual state
            renderProfileSelectorGrid();
            updateSelectorCount();
        });
        
        // Hover effects
        item.addEventListener('mouseenter', () => {
            if (!item.dataset.profileId) return;
            const profile = profiles.find(p => p.id === item.dataset.profileId);
            if (!profile) return;
            
            const profileType = profile.type || 'profile';
            const typeColor = profileType === 'profile' ? '#4a90e2' : '#5cb85c';
            const isSelected = selectedProfiles.some(p => p.id === profile.id);
            
            if (!isSelected) {
                item.style.borderColor = typeColor + '80';
                item.style.background = typeColor + '10';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            if (!item.dataset.profileId) return;
            const profile = profiles.find(p => p.id === item.dataset.profileId);
            if (!profile) return;
            
            const profileType = profile.type || 'profile';
            const typeColor = profileType === 'profile' ? '#4a90e2' : '#5cb85c';
            const isSelected = selectedProfiles.some(p => p.id === profile.id);
            
            if (!isSelected) {
                item.style.borderColor = '#555';
                item.style.background = '#2a2a2a';
            }
        });
    });
    
    updateSelectorCount();
}

// Update the selected count in the modal
function updateSelectorCount() {
    const countEl = document.getElementById('selector-selected-count');
    if (countEl) {
        countEl.textContent = `${selectedProfiles.length} selected`;
    }
}

// Update the main display showing selected profiles
function updateSelectedDisplay() {
    const countEl = document.getElementById('selected-profiles-count');
    const displayEl = document.getElementById('selected-profiles-display');
    const listEl = document.getElementById('selected-profiles-list');
    
    if (countEl) {
        if (selectedProfiles.length === 0) {
            countEl.textContent = 'None selected';
        } else {
            countEl.textContent = `${selectedProfiles.length} selected`;
        }
    }
    
    if (displayEl && listEl) {
        if (selectedProfiles.length === 0) {
            displayEl.style.display = 'none';
        } else {
            displayEl.style.display = 'block';
            listEl.innerHTML = selectedProfiles.map(profile => {
                const profileType = profile.type || 'profile';
                const typeColor = profileType === 'profile' ? '#4a90e2' : '#5cb85c';
                const typeLabel = profileType === 'profile' ? '--p' : '--sref';
                
                return `
                <div style="
                    background: ${typeColor}20;
                    border: 1px solid ${typeColor};
                    border-radius: 12px;
                    padding: 2px 6px;
                    font-size: 10px;
                    color: ${typeColor};
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                ">
                    <span>${typeLabel} ${profile.id}</span>
                    <button onclick="removeSelectedProfile('${profile.id}')" style="
                        background: none;
                        border: none;
                        color: ${typeColor};
                        cursor: pointer;
                        padding: 0;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 8px;
                    ">&times;</button>
                </div>
                `;
            }).join('');
        }
    }
    
    // Update parameter preview when profiles change
    if (window.updateParameterPreview) {
        window.updateParameterPreview();
    }
}

// Remove a profile from selection
window.removeSelectedProfile = function(profileId) {
    selectedProfiles = selectedProfiles.filter(p => p.id !== profileId);
    updateSelectedDisplay();
    
    // Update parameter preview
    if (window.updateParameterPreview) {
        window.updateParameterPreview();
    }
};

// Get selected profile parameters for prompt generation
window.getSelectedProfileParameters = function() {
    // Group profiles by type
    const pProfiles = [];
    const srefProfiles = [];
    
    selectedProfiles.forEach(profile => {
        const profileType = profile.type || 'profile';
        if (profileType === 'sref') {
            srefProfiles.push(profile.id);
        } else {
            pProfiles.push(profile.id);
        }
    });
    
    const params = [];
    
    // Add single --p parameter with all profile IDs
    if (pProfiles.length > 0) {
        params.push(`--p ${pProfiles.join(' ')}`);
    }
    
    // Add single --sref parameter with all style reference IDs
    if (srefProfiles.length > 0) {
        params.push(`--sref ${srefProfiles.join(' ')}`);
    }
    
    return params.join(' ');
};

// Create a custom dropdown with thumbnail support
function createCustomDropdown() {
    const originalDropdown = document.getElementById('personalization-profiles');
    if (!originalDropdown || document.getElementById('custom-profiles-dropdown')) return;
    
    // Hide original dropdown
    originalDropdown.style.display = 'none';
    
    // Create custom dropdown container
    const customContainer = document.createElement('div');
    customContainer.id = 'custom-profiles-dropdown';
    customContainer.style.cssText = `
        position: relative;
        width: 100%;
        border: 1px solid #555;
        border-radius: 4px;
        background: #2c2c2c;
        color: #fff;
        cursor: pointer;
    `;
    
    // Create display area
    const displayArea = document.createElement('div');
    displayArea.style.cssText = `
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 20px;
        color: #fff;
    `;
    displayArea.innerHTML = '<span>None</span>';
    
    // Create dropdown arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid #ccc;
    `;
    
    // Create options list
    const optionsList = document.createElement('div');
    optionsList.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #2c2c2c;
        border: 1px solid #555;
        border-top: none;
        border-radius: 0 0 4px 4px;
        max-height: 200px;
        overflow-y: auto;
        display: none;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    // Populate options
    Array.from(originalDropdown.options).forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.style.cssText = `
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            border-bottom: 1px solid #444;
            color: #fff;
            background: #2c2c2c;
        `;
        optionDiv.dataset.value = option.value;
        
        // Add thumbnail if available
        if (option.dataset.thumbnail && option.value !== '') {
            const thumb = document.createElement('img');
            thumb.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 3px;
                object-fit: cover;
                border: 1px solid #ddd;
            `;
            
            // Handle different thumbnail types
            if (option.dataset.thumbnail.startsWith('http')) {
                thumb.src = option.dataset.thumbnail;
            } else if (option.dataset.thumbnail.includes('_')) {
                const dataUrl = localStorage.getItem(`thumb_${option.dataset.thumbnail}`);
                thumb.src = dataUrl || `./thumbs/${option.dataset.thumbnail}`;
            } else {
                thumb.src = `./thumbs/${option.dataset.thumbnail}`;
            }
            
            thumb.onerror = () => thumb.style.display = 'none';
            optionDiv.appendChild(thumb);
        }
        
        // Add profile type indicator
        if (option.dataset.profileType) {
            const isProfile = option.dataset.profileType === 'profile';
            const typeIndicator = document.createElement('div');
            typeIndicator.style.cssText = `
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: ${isProfile ? '#4a90e2' : '#5cb85c'};
                color: white;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-left: auto;
                margin-right: 4px;
            `;
            typeIndicator.textContent = isProfile ? 'P' : 'S';
            optionDiv.appendChild(typeIndicator);
        }
        
        const text = document.createElement('span');
        text.textContent = option.textContent;
        text.style.cssText = 'flex: 1; font-size: 14px;';
        optionDiv.appendChild(text);
        
        // Add description if available
        if (option.dataset.description) {
            const desc = document.createElement('small');
            desc.textContent = option.dataset.description.substring(0, 30) + '...';
            desc.style.cssText = 'color: #aaa; font-size: 11px;';
            optionDiv.appendChild(desc);
        }
        
        // Click handler
        optionDiv.addEventListener('click', () => {
            originalDropdown.value = option.value;
            displayArea.innerHTML = optionDiv.innerHTML;
            optionsList.style.display = 'none';
            
            // Trigger change event on original dropdown
            originalDropdown.dispatchEvent(new Event('change'));
        });
        
        // Hover effect
        optionDiv.addEventListener('mouseenter', () => {
            optionDiv.style.backgroundColor = '#3a3a3a';
        });
        optionDiv.addEventListener('mouseleave', () => {
            optionDiv.style.backgroundColor = '#2c2c2c';
        });
        
        optionsList.appendChild(optionDiv);
    });
    
    // Toggle dropdown
    customContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = optionsList.style.display === 'block';
        optionsList.style.display = isVisible ? 'none' : 'block';
        arrow.style.transform = `translateY(-50%) rotate(${isVisible ? 0 : 180}deg)`;
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        optionsList.style.display = 'none';
        arrow.style.transform = 'translateY(-50%)';
    });
    
    // Assemble custom dropdown
    customContainer.appendChild(displayArea);
    customContainer.appendChild(arrow);
    customContainer.appendChild(optionsList);
    
    // Insert after original dropdown
    originalDropdown.parentNode.insertBefore(customContainer, originalDropdown.nextSibling);
}

// Initialize when DOM is ready and when switching to style library
function initStyleLibrary() {
    setupAddProfileButton();
    renderProfileLibrary();
    updatePersonalizationDropdown();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStyleLibrary);
} else {
    initStyleLibrary();
}

// Re-initialize when switching to style library module
document.querySelectorAll('.sidebar .menu-item').forEach(item => {
  item.addEventListener('click', () => {
    setTimeout(() => {
        const styleLibraryModule = document.getElementById('style-library-module');
        if (styleLibraryModule && styleLibraryModule.classList.contains('active')) {
            initStyleLibrary();
        }
    }, 100);
  });
});