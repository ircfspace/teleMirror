// Channel Management
class ChannelManager {
    constructor() {
        this.channels = this.loadChannels();
        this.isLoading = false; // Track loading state
        this.pendingChannel = null; // Track pending channel switch
        this.pagination = {
            currentPage: 0,
            postsPerPage: 10,
            allPosts: [],
            displayedPosts: [],
            displayedPostIds: new Set(),
            isLoadingMore: false,
            hasMorePosts: true
        };

        // Clean up any invalid channels
        this.cleanupInvalidChannels();

        // Add default channels if list is empty
        if (this.channels.length === 0) {
            this.channels = [
                {
                    username: 'ircfspace',
                    name: 'IRCF | اینترنت آزاد برای همه',
                    loading: false,
                    pinned: true
                },
                { username: 'vahidonline', name: 'وحید آنلاین', loading: false },
                { username: 'persianvpnhub', name: 'فیلترشکن رایگان', loading: false },
                { username: 'iranintltv', name: 'ایران اینترنشنال', loading: false }
            ];
            this.saveChannels();
            // Set first channel as active
            this.activeChannel = this.channels[0].username;
        } else {
            // Ensure ircfspace channel exists and is pinned
            this.ensurePinnedChannel();
            this.activeChannel = null;
        }

        this.renderChannels();
        this.updateMessageHeader();
    }

    init() {
        this.renderChannels();
        this.setupEventListeners();
        this.setupLeaveButton();
        this.setupLanguageListener();
    }

    setupLanguageListener() {
        document.addEventListener('languageChanged', () => {
            this.renderChannels();
            this.updateMessageHeader();
            if (!this.activeChannel) {
                this.showEmptyState();
            }
        });
    }

    loadChannels() {
        const saved = localStorage.getItem('telegramChannels');
        return saved ? JSON.parse(saved) : [];
    }

    saveChannels() {
        localStorage.setItem('telegramChannels', JSON.stringify(this.channels));
    }

    // Clean up invalid channels
    cleanupInvalidChannels() {
        const originalLength = this.channels.length;
        this.channels = this.channels.filter(
            (channel) =>
                channel.username &&
                channel.username.trim() !== '' &&
                channel.name &&
                channel.name.trim() !== '' &&
                channel.username.length > 0 &&
                channel.name.length > 0
        );

        if (this.channels.length !== originalLength) {
            console.log(`Cleaned up ${originalLength - this.channels.length} invalid channels`);
            this.saveChannels();
            this.renderChannels();
        }
    }

    // Cache helpers
    getCacheKey(username) {
        return `channel_cache_${username}`;
    }

    getCachedData(username) {
        try {
            // Don't check cache for empty username channels
            if (!username || username.trim() === '') {
                return null;
            }
            const cacheKey = this.getCacheKey(username);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            const fifteenMinutes = 15 * 60 * 1000;

            // Check if cache is still valid (15 minutes)
            if (now - timestamp > fifteenMinutes) {
                localStorage.removeItem(cacheKey);
                return null;
            }

            return data;
        } catch (error) {
            return null;
        }
    }

    setCachedData(username, data) {
        try {
            // Don't cache empty username channels
            if (!username || username.trim() === '') {
                return;
            }
            const cacheKey = this.getCacheKey(username);
            const cacheEntry = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        } catch (error) {
            console.error('Failed to cache data:', error);
        }
    }

    clearCache(username) {
        try {
            const cacheKey = this.getCacheKey(username);
            localStorage.removeItem(cacheKey);
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    extractUsernameFromUrl(input) {
        const trimmed = input.trim();

        // Remove @ if present at the beginning
        if (trimmed.startsWith('@')) {
            return trimmed.substring(1).trim().replace(/\s+/g, '');
        }

        // Handle full Telegram URLs like https://t.me/username
        if (trimmed.includes('t.me/')) {
            // Use regex to extract username from t.me URLs
            const match = trimmed.match(/t\.me\/([a-zA-Z0-9_]+)/);
            if (match && match[1]) {
                return match[1].trim().replace(/\s+/g, '');
            }
        }

        // Handle other URLs with / (fallback)
        if (trimmed.includes('/')) {
            const parts = trimmed.split('/');
            // Get the part after the first /
            const username = parts[1];
            // Remove any query parameters or fragments, trim, and remove spaces
            return username ? username.split(/[?#]/)[0].trim().replace(/\s+/g, '') : '';
        }

        // Return as-is if it's just a username (already trimmed, remove spaces)
        return trimmed.replace(/\s+/g, '');
    }

    async addChannel() {
        const input = document.getElementById('fetchInput');
        const username = this.extractUsernameFromUrl(input.value);

        if (!username || username.trim() === '') {
            // Don't clear the input if it's empty, just return
            return;
        }

        if (this.channels.find((c) => c.username === username)) {
            alert(I18n.t('channelAlreadyExists'));
            return;
        }

        // Add channel with default name and validation
        const newChannel = {
            username: username.trim(),
            name: username.trim(),
            loading: false
        };

        this.channels.push(newChannel);
        this.saveChannels();

        // Clear input and refresh channel list
        input.value = '';
        this.renderChannels();

        // Set the new channel as active
        this.setActiveChannel(username);
    }

    // Ensure ircfspace channel exists and is pinned
    ensurePinnedChannel() {
        const pinnedUsername = 'ircfspace';
        let pinnedChannel = this.channels.find((c) => c.username === pinnedUsername);

        if (!pinnedChannel) {
            // Add pinned channel if it doesn't exist
            pinnedChannel = {
                username: pinnedUsername,
                name: 'IRCF | اینترنت آزاد برای همه',
                loading: false,
                pinned: true
            };
            this.channels.unshift(pinnedChannel);
        } else {
            // Ensure it's marked as pinned
            pinnedChannel.pinned = true;
            // Move to top if not already there
            const index = this.channels.findIndex((c) => c.username === pinnedUsername);
            if (index > 0) {
                this.channels.splice(index, 1);
                this.channels.unshift(pinnedChannel);
            }
        }

        this.saveChannels();
    }

    removeChannel(username) {
        // Prevent removal of pinned channels
        const channel = this.channels.find((c) => c.username === username);
        if (channel && channel.pinned) {
            alert(I18n.t('pinnedChannelCannotDelete'));
            return;
        }

        this.channels = this.channels.filter((c) => c.username !== username);
        this.saveChannels();
        // Clear cache for removed channel
        this.clearCache(username);
        this.renderChannels();

        if (this.activeChannel === username) {
            this.setActiveChannel(null);
        }
    }

    setActiveChannel(username) {
        // Prevent channel switching while loading
        if (this.isLoading) {
            this.pendingChannel = username;
            console.log('Channel selection deferred - currently loading:', username);
            return;
        }

        this.activeChannel = username;
        this.renderChannels();
        this.updateMessageHeader();

        if (username) {
            this.loadChannelMessages(username);
        } else {
            this.showEmptyState();
        }
    }

    // Get channel avatar image (Telegram photo first, then local, then text fallback)
    getChannelAvatar(channel) {
        const avatarText =
            channel.name && channel.name.length > 0 ? channel.name.charAt(0).toUpperCase() : '?';

        const localImagePath = `../assets/img/channel/${channel.username}.jpg`;

        if (channel.photo) {
            // Try Telegram photo first, fallback to local image, then text
            return `<img src="${channel.photo}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
          onerror="this.onerror = function() { this.style.display='none'; this.parentElement.innerHTML='${avatarText}'; }; this.src='${localImagePath}';"
          onload="console.log('Avatar loaded successfully');" />`;
        } else {
            // Try local image, fallback to text
            return `<img src="${localImagePath}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
          onerror="this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
          onload="console.log('Local avatar loaded successfully for ${channel.username}');" />`;
        }
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        container.innerHTML = '';

        // Filter out invalid channels (both username and name must be valid)
        const validChannels = this.channels.filter(
            (channel) =>
                channel.username &&
                channel.username.trim() !== '' &&
                channel.name &&
                channel.name.trim() !== '' &&
                channel.username.length > 0 &&
                channel.name.length > 0
        );

        // Sort channels: pinned channels first, then others
        const sortedChannels = validChannels.sort((a, b) => {
            // ircfspace (pinned) always comes first
            if (a.username === 'ircfspace') return -1;
            if (b.username === 'ircfspace') return 1;
            // For any other pinned channels, sort by pinned status
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            // Otherwise maintain original order
            return 0;
        });

        sortedChannels.forEach((channel) => {
            const channelEl = document.createElement('div');
            const isPinned = channel.pinned;
            const isActive = channel.username === this.activeChannel;
            const isDisabled = this.isLoading && !isActive;

            channelEl.className = `channel-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;

            const avatarHtml = this.getChannelAvatar(channel);

            channelEl.innerHTML = `
          <div class="channel-avatar">${avatarHtml}</div>
          <div class="channel-info">
            <div class="channel-name">${channel.name}${isPinned ? ' 📌' : ''}</div>
            <div class="channel-username">@${channel.username}</div>
          </div>
        `;

            if (!isDisabled) {
                channelEl.addEventListener('click', () => {
                    this.setActiveChannel(channel.username);
                });
            }

            container.appendChild(channelEl);
        });
    }

    setupLeaveButton() {
        const leaveButton = document.getElementById('headerLeaveButton');
        const viewButton = document.getElementById('headerViewButton');

        if (!leaveButton || !viewButton) return;

        // Handle view channel
        viewButton.addEventListener('click', () => {
            if (this.activeChannel) {
                const channelUrl = `https://t.me/${this.activeChannel}`;
                window.open(channelUrl, '_blank');
            }
        });

        // Handle delete channel
        leaveButton.addEventListener('click', () => {
            if (this.activeChannel) {
                const channel = this.channels.find((c) => c.username === this.activeChannel);
                const channelName = channel ? channel.name : this.activeChannel;

                // Prevent deletion of pinned channels
                if (channel && channel.pinned) {
                    alert(I18n.t('pinnedChannelCannotDelete'));
                    return;
                }

                if (confirm(I18n.t('deleteChannelConfirm', channelName))) {
                    this.removeChannel(this.activeChannel);
                }
            }
        });
    }

    // Get header channel avatar (Telegram photo first, then local, then text fallback)
    getHeaderChannelAvatar(channel) {
        const avatarText =
            channel.name && channel.name.length > 0 ? channel.name.charAt(0).toUpperCase() : '?';

        const localImagePath = `../assets/img/channel/${channel.username}.jpg`;

        if (channel.photo) {
            // Try Telegram photo first, fallback to local image, then text
            return `<img src="${channel.photo}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
          onerror="this.onerror = function() { this.style.display='none'; this.parentElement.innerHTML='${avatarText}'; }; this.src='${localImagePath}';"
          onload="console.log('Header avatar loaded successfully for ${channel.username}');" />`;
        } else {
            // Try local image, fallback to text
            return `<img src="${localImagePath}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
          onerror="this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
          onload="console.log('Local header avatar loaded successfully for ${channel.username}');" />`;
        }
    }

    updateMessageHeader() {
        const channel = this.channels.find((c) => c.username === this.activeChannel);
        const avatar = document.getElementById('headerChannelAvatar');
        const title = document.getElementById('channelTitle');
        const subtitle = document.getElementById('channelSubtitle');
        const leaveButton = document.getElementById('headerLeaveButton');
        const viewButton = document.getElementById('headerViewButton');

        if (channel) {
            avatar.innerHTML = this.getHeaderChannelAvatar(channel);
            title.textContent = channel.name;
            subtitle.textContent = `@${channel.username}`;
            // Show buttons when channel is selected, but hide for pinned channels
            if (leaveButton && viewButton) {
                const isPinned = channel.pinned;
                leaveButton.style.display = isPinned ? 'none' : 'block';
                viewButton.style.display = 'block'; // Always show view button
            }
        } else {
            avatar.textContent = '?';
            title.textContent = I18n.t('selectChannel');
            subtitle.textContent = I18n.t('chooseFromList');
            // Hide buttons when no channel selected
            if (leaveButton) leaveButton.style.display = 'none';
            if (viewButton) viewButton.style.display = 'none';
        }
    }

    showEmptyState() {
        const container = document.getElementById('messageContainer');
        container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📱</div>
            <div class="empty-state-text">${I18n.t('emptyStateTitle')}</div>
            <div class="empty-state-subtext">${I18n.t('emptyStateSubtext')}</div>
        </div>
    `;
    }

    async loadChannelMessages(username) {
        // Prevent concurrent loading
        if (this.isLoading) {
            console.log('Already loading, skipping request for:', username);
            return;
        }

        this.isLoading = true;
        const container = document.getElementById('messageContainer');

        // Check cache first
        const cachedData = this.getCachedData(username);
        if (cachedData) {
            this.renderMessages(cachedData, username);
            this.isLoading = false;
            this.processPendingChannel();
            return;
        }

        container.innerHTML = `<div class="loading-message"><div class="loading-spinner"></div>${I18n.t('loadingMessages')}</div>`;

        let disconnectProgress;
        let progressTimeout;

        try {
            // Show progress
            ProgressManager.show();

            const requestId = window.api.generateRequestId();

            // Set a timeout for progress connection
            progressTimeout = setTimeout(() => {
                console.warn('Progress connection timeout');
                ProgressManager.update({
                    stage: 0,
                    message: I18n.t('connectionTimeout'),
                    percent: 0
                });
            }, 30000); // 30 seconds timeout

            disconnectProgress = await window.api.connectProgress(requestId, (progress) => {
                // Clear timeout when we receive progress
                if (progressTimeout) {
                    clearTimeout(progressTimeout);
                    progressTimeout = null;
                }
                ProgressManager.update(progress);
            });

            // Add delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Set timeout for fetch request
            const fetchPromise = window.api.fetchUrl(username, requestId);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 45000); // 45 seconds timeout
            });

            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (response.success && response.data) {
                // Cache successful response
                this.setCachedData(username, response.data);

                // Ensure progress reaches 100% before hiding
                ProgressManager.update({
                    stage: 10,
                    message: I18n.t('operationSuccess'),
                    percent: 100
                });

                // Give a moment for 100% to show
                await new Promise((resolve) => setTimeout(resolve, 500));

                ProgressManager.hide();
                if (disconnectProgress) disconnectProgress();

                // Cleanup timeout
                if (progressTimeout) {
                    clearTimeout(progressTimeout);
                    progressTimeout = null;
                }

                this.renderMessages(response.data, username);
            } else {
                // Keep progress bar visible to show the error message
                ProgressManager.update({
                    stage: 0,
                    message: I18n.t('error', response.error || I18n.t('unknown')),
                    percent: 0
                });
                // Wait longer to show error message in progress bar
                await new Promise((resolve) => setTimeout(resolve, 3000));
                ProgressManager.hide();
                if (disconnectProgress) disconnectProgress();

                container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #e74c3c;">
                    ${I18n.t('errorLoadingMessages', response.error || I18n.t('unknown'))}
                </div>
            `;
            }
        } catch (error) {
            console.error('Error loading channel messages:', error);

            // Show error in progress before hiding
            ProgressManager.update({
                stage: 0,
                message: I18n.t('error', error.message || I18n.t('connectionFailed')),
                percent: 0
            });
            // Wait longer to show error message in progress bar
            await new Promise((resolve) => setTimeout(resolve, 3000));
            ProgressManager.hide();
            if (disconnectProgress) disconnectProgress();

            container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #e74c3c;">
                ${I18n.t('error', error.message || I18n.t('connectionFailed'))}
            </div>
        `;
        } finally {
            // Cleanup timeout and progress connection
            if (progressTimeout) {
                clearTimeout(progressTimeout);
                progressTimeout = null;
            }
            if (disconnectProgress) {
                disconnectProgress();
                disconnectProgress = null;
            }

            this.isLoading = false;
            this.processPendingChannel();
        }
    }

    renderMessages(data, username) {
        const container = document.getElementById('messageContainer');

        // Clear loading message immediately
        container.innerHTML = '';

        // Update channel metadata for the correct channel (regardless of active state)
        if (data.channel) {
            const channel = this.channels.find((c) => c.username === username);
            if (channel) {
                if (data.channel.title) {
                    channel.name = data.channel.title;
                }
                if (data.channel.photo) {
                    channel.photo = data.channel.photo;
                }
                this.saveChannels();
            }
        }

        // Only render to DOM if this is still the active channel
        if (this.activeChannel !== username) {
            return;
        }

        // Update header and sidebar for the active channel
        if (data.channel) {
            const channel = this.channels.find((c) => c.username === username);
            if (channel) {
                this.updateMessageHeader();
                this.updateSingleChannel(channel); // Update only the changed channel
            }
        }

        // Initialize pagination with new data
        this.initializePagination(data.posts || []);
        
        // Render first page of posts
        this.renderPostsPage();
        
        // Setup scroll detection for load more
        this.setupScrollDetection();
    }

    createMediaGrid(photos) {
        const count = photos.length;

        if (count === 0) return '';

        let gridHtml = '<div class="media-grid">';

        if (count === 1) {
            // Single image - full width
            gridHtml += this.getPhotoHtml(photos[0]);
        } else if (count === 2) {
            // Two images - side by side 50%
            gridHtml += photos.map((photo) => this.getPhotoHtml(photo, '50%')).join('');
        } else if (count === 3) {
            // Three images - first full width, next two side by side 50%
            gridHtml += this.getPhotoHtml(photos[0]);
            gridHtml += '<div style="display: flex; gap: 4px;">';
            gridHtml += photos
                .slice(1)
                .map(
                    (photo) =>
                        `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: 50%; height: 120px; border-radius: 8px; object-fit: cover;" />`
                )
                .join('');
            gridHtml += '</div>';
        } else if (count === 4) {
            // Four images - 2x2 grid, each 50%
            gridHtml += '<div style="display: flex; gap: 4px; margin-bottom: 4px;">';
            gridHtml += photos
                .slice(0, 2)
                .map(
                    (photo) =>
                        `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: 50%; height: 120px; border-radius: 8px; object-fit: cover;" />`
                )
                .join('');
            gridHtml += '</div>';
            gridHtml += '<div style="display: flex; gap: 4px;">';
            gridHtml += photos
                .slice(2)
                .map(
                    (photo) =>
                        `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: 50%; height: 120px; border-radius: 8px; object-fit: cover;" />`
                )
                .join('');
            gridHtml += '</div>';
        } else {
            // More than 4 images - create a grid with max 4 visible
            const visiblePhotos = photos.slice(0, 4);
            gridHtml += '<div style="display: flex; gap: 4px; margin-bottom: 4px;">';
            gridHtml += visiblePhotos
                .slice(0, 2)
                .map(
                    (photo) =>
                        `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: 50%; height: 120px; border-radius: 8px; object-fit: cover;" />`
                )
                .join('');
            gridHtml += '</div>';
            gridHtml += '<div style="display: flex; gap: 4px; position: relative;">';
            gridHtml += visiblePhotos
                .slice(2, 3)
                .map(
                    (photo) =>
                        `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: 50%; height: 120px; border-radius: 8px; object-fit: cover;" />`
                )
                .join('');
            if (photos.length > 4) {
                gridHtml += `<div style="width: 50%; position: relative; border-radius: 8px; overflow: hidden;">
            <img src="${visiblePhotos[3].thumb || visiblePhotos[3].url}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">
              +${photos.length - 4}
            </div>
          </div>`;
            } else {
                gridHtml += visiblePhotos
                    .slice(3)
                    .map(
                        (photo) =>
                            `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: 50%; height: 120px; border-radius: 8px; object-fit: cover;" />`
                    )
                    .join('');
            }
            gridHtml += '</div>';
        }

        gridHtml += '</div>';
        return gridHtml;
    }

    getPhotoHtml(photo, width = '100%') {
        // Check if photo is base64 data
        if (photo.url && photo.url.startsWith('data:image/')) {
            return `<img src="${photo.url}" alt="Photo" style="width: ${width}; height: auto; border-radius: 8px; object-fit: cover;" />`;
        }

        // Regular URL image
        return `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: ${width}; height: auto; border-radius: 8px; object-fit: cover;" />`;
    }

    setupEventListeners() {
        const fetchInput = document.getElementById('fetchInput');
        const addChannelButton = document.getElementById('addChannelButton');
        const donateButton = document.getElementById('donateBtnBottom');

        // Search functionality
        fetchInput.addEventListener('input', (e) => {
            this.searchChannels(e.target.value);
        });

        addChannelButton.addEventListener('click', async () => {
            await this.addChannel();
        });

        fetchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.addChannel();
            }
        });

        // Donation button functionality
        if (donateButton) {
            donateButton.addEventListener('click', () => {
                window.open('https://ircf.space/contacts.html#donate', '_blank');
            });
        }
    }

    searchChannels(searchTerm) {
        const container = document.getElementById('channelsContainer');
        const filteredChannels = this.filterChannels(searchTerm);

        if (filteredChannels.length === 0 && searchTerm.trim()) {
            // Show message that channel doesn't exist
            container.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #8a9ba8;">
            <div style="margin-bottom: 10px;">${I18n.t('channelNotInList', searchTerm)}</div>
            <div style="font-size: 12px;">${I18n.t('clickPlusToAdd')}</div>
          </div>
        `;
        } else {
            this.renderFilteredChannels(filteredChannels);
        }
    }

    filterChannels(searchTerm) {
        if (!searchTerm.trim()) {
            return this.channels;
        }

        const term = searchTerm.toLowerCase().replace('@', '');
        return this.channels.filter(
            (channel) =>
                channel.username.toLowerCase().includes(term) ||
                channel.name.toLowerCase().includes(term)
        );
    }

    updateSingleChannel(updatedChannel) {
        const container = document.getElementById('channelsContainer');
        const channelElements = container.querySelectorAll('.channel-item');

        channelElements.forEach((channelEl) => {
            const usernameEl = channelEl.querySelector('.channel-username');
            if (usernameEl && usernameEl.textContent === `@${updatedChannel.username}`) {
                // Update avatar
                const avatarEl = channelEl.querySelector('.channel-avatar');
                if (avatarEl) {
                    const avatarHtml = this.getChannelAvatar(updatedChannel);
                    avatarEl.innerHTML = avatarHtml;
                }

                // Update name
                const nameEl = channelEl.querySelector('.channel-name');
                if (nameEl) {
                    const isPinned = updatedChannel.pinned;
                    nameEl.textContent = `${updatedChannel.name}${isPinned ? ' 📌' : ''}`;
                }
            }
        });
    }

    renderFilteredChannels(channels) {
        const container = document.getElementById('channelsContainer');
        container.innerHTML = '';

        // Sort filtered channels: pinned channels first
        const sortedChannels = channels.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });

        sortedChannels.forEach((channel) => {
            const channelEl = document.createElement('div');
            const isPinned = channel.pinned;
            const isActive = channel.username === this.activeChannel;
            const isDisabled = this.isLoading && !isActive;

            channelEl.className = `channel-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;

            const avatarHtml = this.getChannelAvatar(channel);

            channelEl.innerHTML = `
          <div class="channel-avatar">${avatarHtml}</div>
          <div class="channel-info">
            <div class="channel-name">${channel.name}${isPinned ? ' 📌' : ''}</div>
            <div class="channel-username">@${channel.username}</div>
          </div>
        `;

            if (!isDisabled) {
                channelEl.addEventListener('click', () => {
                    this.setActiveChannel(channel.username);
                });
            }

            container.appendChild(channelEl);
        });
    }

    processPendingChannel() {
        if (this.pendingChannel && this.pendingChannel !== this.activeChannel) {
            const pending = this.pendingChannel;
            this.pendingChannel = null;
            console.log('Processing pending channel switch to:', pending);
            this.setActiveChannel(pending);
        }
    }

    // Pagination methods
    initializePagination(posts) {
        // Sort posts: oldest to newest (for proper pagination)
        const sortedPosts = this.sortPostsByNewest(posts);
        
        this.pagination.allPosts = sortedPosts;
        this.pagination.currentPage = 0;
        this.pagination.displayedPosts = [];
        this.pagination.displayedPostIds.clear();
        this.pagination.loadedRange = {
            start: Math.max(0, sortedPosts.length - this.pagination.postsPerPage),
            end: sortedPosts.length
        };
        this.pagination.hasMorePosts = sortedPosts.length > this.pagination.postsPerPage;
    }

    sortPostsByNewest(posts) {
        return [...posts].sort((a, b) => {
            // Sort by ID first (for GitHub data)
            if (a.id && b.id) {
                const idA = parseInt(a.id) || 0;
                const idB = parseInt(b.id) || 0;
                return idA - idB; // Lowest ID first (oldest to newest)
            }
            
            // Fallback to time sorting
            const timeA = new Date(a.time || 0).getTime();
            const timeB = new Date(b.time || 0).getTime();
            return timeA - timeB; // Oldest first
        });
    }

    renderPostsPage() {
        const container = document.getElementById('messageContainer');
        
        // Get posts from loaded range (newest posts at end)
        let postsToShow = this.pagination.allPosts.slice(this.pagination.loadedRange.start, this.pagination.loadedRange.end);
        
        // Filter out already displayed posts to prevent duplicates
        postsToShow = postsToShow.filter(post => {
            const postId = post.id || post.time || JSON.stringify(post);
            return !this.pagination.displayedPostIds.has(postId);
        });
        
        // Add new posts to displayed posts (at the end for newer posts)
        this.pagination.displayedPosts = [...this.pagination.displayedPosts, ...postsToShow];
        
        // Track displayed post IDs
        postsToShow.forEach(post => {
            const postId = post.id || post.time || JSON.stringify(post);
            this.pagination.displayedPostIds.add(postId);
        });
        
        // Clear container and render all displayed posts
        container.innerHTML = '';
        
        if (this.pagination.displayedPosts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #8a9ba8;">
                    ${I18n.t('noMessagesFound')}
                </div>
            `;
            return;
        }
        
        // Add load more spinner at top if there are more posts
        if (this.pagination.hasMorePosts && !this.pagination.isLoadingMore) {
            const loadMoreEl = document.createElement('div');
            loadMoreEl.className = 'load-more-container';
            loadMoreEl.id = 'loadMoreContainer';
            loadMoreEl.innerHTML = `
                <div class="load-more-spinner" style="display: none;">
                    <div class="loading-spinner"></div>
                    ${I18n.t('loadingMore')}
                </div>
            `;
            container.appendChild(loadMoreEl);
        }
        
        // Render posts (oldest at top, newest at bottom)
        this.pagination.displayedPosts.forEach((post) => {
            const messageEl = this.createMessageElement(post);
            container.appendChild(messageEl);
        });
        
        // Insert ads after all messages are rendered
        if (typeof adService !== 'undefined' && this.pagination.displayedPosts.length > 0) {
            adService.insertAd(container, this.pagination.displayedPosts);
        }
        
        // Scroll to bottom to show newest messages on first load
        if (this.pagination.currentPage === 0) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    createMessageElement(post) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message';

        // Get channel photo for avatar (Telegram photo -> local -> text)
        const channel = this.channels.find((c) => c.username === this.activeChannel);
        const avatarText = post.author ? post.author.charAt(0).toUpperCase() : '?';
        let avatarHtml = avatarText;
        if (channel) {
            const localImagePath = `../assets/img/channel/${channel.username}.jpg`;
            if (channel.photo) {
                avatarHtml = `<img src="${channel.photo}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
              onerror="this.onerror = function() { this.style.display='none'; this.parentElement.innerHTML='${avatarText}'; }; this.src='${localImagePath}';"
              onload="console.log('Post avatar loaded successfully');" />`;
            } else {
                avatarHtml = `<img src="${localImagePath}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
              onerror="this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
              onload="console.log('Local avatar loaded successfully');" />`;
            }
        }

        const timeText = PersianCalendar.formatDate(post.time) || '';
        const isOwn = post.isOwn || false;

        let mediaHtml = '';
        if (post.media && post.media.length > 0) {
            const photos = post.media.filter((media) => media.type === 'photo');
            const videos = post.media.filter((media) => media.type === 'video');

            if (photos.length > 0) {
                mediaHtml += this.createMediaGrid(photos);
            }

            if (videos.length > 0) {
                mediaHtml += videos
                    .map(
                        (video) =>
                            `<div style="background: #1a1a1b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 8px;">
                    📹 ${I18n.t('video', video.duration || I18n.t('unknown'))}
                  </div>`
                    )
                    .join('');
            }
        }

        messageEl.innerHTML = `
            <div class="message-avatar">${avatarHtml}</div>
            <div class="message-content">
                <div class="message-header-info">
                    <span class="message-author">${post.author || I18n.t('unknown')}</span>
                    <span class="message-time">${timeText}${post.edited ? ' • ' + I18n.t('edited') : ''}</span>
                </div>
                <div class="message-bubble ${isOwn ? 'own' : ''}">
                    ${post.text ? `<div class="message-text" dir="auto">${post.text}</div>` : ''}
                    ${mediaHtml ? `<div class="message-media">${mediaHtml}</div>` : ''}
                    <div class="message-views">
                        👁 ${post.views || 0} ${I18n.t('views')}
                    </div>
                </div>
            </div>
        `;

        return messageEl;
    }

    setupScrollDetection() {
        const container = document.getElementById('messageContainer');
        
        // Remove existing listener
        if (this.scrollHandler) {
            container.removeEventListener('scroll', this.scrollHandler);
        }
        
        // Add new scroll listener
        this.scrollHandler = () => {
            console.log('Scroll detected:', container.scrollTop, 'hasMorePosts:', this.pagination.hasMorePosts, 'isLoadingMore:', this.pagination.isLoadingMore);
            if (this.pagination.isLoadingMore || !this.pagination.hasMorePosts) {
                return;
            }
            
            // Check if scrolled to top (show older posts)
            if (container.scrollTop <= 100) {
                console.log('Loading more posts...');
                this.loadMorePosts();
            }
        };
        
        container.addEventListener('scroll', this.scrollHandler);
    }

    async loadMorePosts() {
        console.log('loadMorePosts called - isLoadingMore:', this.pagination.isLoadingMore, 'hasMorePosts:', this.pagination.hasMorePosts);
        if (this.pagination.isLoadingMore || !this.pagination.hasMorePosts) {
            return;
        }
        
        this.pagination.isLoadingMore = true;
        
        // Show loading spinner
        const spinnerEl = document.querySelector('.load-more-spinner');
        if (spinnerEl) {
            spinnerEl.style.display = 'block';
        }
        
        // Simulate loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Total posts:', this.pagination.allPosts.length);
        
        // Calculate older posts to load (before current loaded range)
        const newEndIndex = this.pagination.loadedRange.start;
        const newStartIndex = Math.max(0, newEndIndex - this.pagination.postsPerPage);
        let postsToShow = this.pagination.allPosts.slice(newStartIndex, newEndIndex);
        
        console.log('Posts to show:', postsToShow.length, 'from index', newStartIndex, 'to', newEndIndex);
        
        if (postsToShow.length === 0) {
            this.pagination.hasMorePosts = false;
            console.log('No more posts to load');
        } else {
            // Update loaded range to include older posts
            this.pagination.loadedRange.start = newStartIndex;
            
            // Add new posts to the beginning of displayed posts (older posts)
            this.pagination.displayedPosts = [...postsToShow, ...this.pagination.displayedPosts];
            
            // Track displayed post IDs
            postsToShow.forEach(post => {
                const postId = post.id || post.time || JSON.stringify(post);
                this.pagination.displayedPostIds.add(postId);
            });
            
            // Re-render with new posts
            this.renderPostsWithNewPosts(postsToShow);
            
            // Check if there are more older posts to load
            this.pagination.hasMorePosts = newStartIndex > 0;
            console.log('hasMorePosts updated to:', this.pagination.hasMorePosts);
        }
        
        // Hide loading spinner
        if (spinnerEl) {
            spinnerEl.style.display = 'none';
        }
        
        this.pagination.isLoadingMore = false;
    }

    renderPostsWithNewPosts(newPosts) {
        const container = document.getElementById('messageContainer');
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        
        console.log('renderPostsWithNewPosts called with', newPosts.length, 'posts');
        
        // Get current scroll height to maintain position
        const currentScrollHeight = container.scrollHeight;
        const currentScrollTop = container.scrollTop;
        
        // Create and prepend new posts BEFORE the load more container
        newPosts.forEach((post) => {
            const messageEl = this.createMessageElement(post);
            if (loadMoreContainer) {
                container.insertBefore(messageEl, loadMoreContainer);
            } else {
                container.insertBefore(messageEl, container.firstChild);
            }
        });
        
        // Adjust scroll position to maintain visual position
        const newScrollHeight = container.scrollHeight;
        const heightDifference = newScrollHeight - currentScrollHeight;
        container.scrollTop = currentScrollTop + heightDifference;
        
        console.log('Scroll adjustment:', heightDifference, 'new scrollTop:', container.scrollTop);
        
        // Update or remove load more container
        if (loadMoreContainer) {
            if (!this.pagination.hasMorePosts) {
                loadMoreContainer.remove();
            }
        }
    }
}
