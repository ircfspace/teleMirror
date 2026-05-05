// Channel Management
class ChannelManager {
    constructor() {
        this.channels = this.loadChannels();

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
            alert('Channel already exists in the list');
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
        if (username === 'ircfspace') {
            alert('کانال "اینترنت آزاد" نمی‌تواند حذف شود');
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
        this.activeChannel = username;
        this.renderChannels();
        this.updateMessageHeader();

        if (username) {
            this.loadChannelMessages(username);
        } else {
            this.showEmptyState();
        }
    }

    // Get channel avatar image (local image first, then fallback)
    getChannelAvatar(channel) {
        const avatarText =
            channel.name && channel.name.length > 0 ? channel.name.charAt(0).toUpperCase() : '?';

        // Check if local image exists for this channel
        const localImagePath = `../assets/img/channel/${channel.username}.jpg`;

        if (channel.photo) {
            // Use Telegram photo if available
            return `<img src="${channel.photo}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" 
          onerror="console.error('Avatar load error:', this.src); this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
          onload="console.log('Avatar loaded successfully');" />`;
        } else {
            // Try local image first, fallback to text
            return `<img src="${localImagePath}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" 
          onerror="console.error('Local avatar load error:', this.src); this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
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
            const isPinned = channel.username === 'ircfspace';
            channelEl.className = `channel-item ${channel.username === this.activeChannel ? 'active' : ''}`;

            const avatarHtml = this.getChannelAvatar(channel);

            channelEl.innerHTML = `
          <div class="channel-avatar">${avatarHtml}</div>
          <div class="channel-info">
            <div class="channel-name">${channel.name}${isPinned ? ' 📌' : ''}</div>
            <div class="channel-username">@${channel.username}</div>
          </div>
        `;

            channelEl.addEventListener('click', () => {
                this.setActiveChannel(channel.username);
                this.loadChannelMessages(channel.username);
            });

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
                if (this.activeChannel === 'ircfspace') {
                    alert('کانال "اینترنت آزاد" نمی‌تواند حذف شود');
                    return;
                }

                if (confirm(`Delete channel "${channelName}"?`)) {
                    this.removeChannel(this.activeChannel);
                }
            }
        });
    }

    // Get header channel avatar (local image first, then fallback)
    getHeaderChannelAvatar(channel) {
        const avatarText =
            channel.name && channel.name.length > 0 ? channel.name.charAt(0).toUpperCase() : '?';

        // Check if local image exists for this channel
        const localImagePath = `../assets/img/channel/${channel.username}.jpg`;

        if (channel.photo) {
            // Use Telegram photo if available
            return `<img src="${channel.photo}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" 
          onerror="console.error('Header avatar load error for ${channel.username}:', this.src); this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
          onload="console.log('Header avatar loaded successfully for ${channel.username}');" />`;
        } else {
            // Try local image first, fallback to text
            return `<img src="${localImagePath}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" 
          onerror="console.error('Local header avatar load error for ${channel.username}:', this.src); this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
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
            console.log('Updating message header for', channel.username, {
                hasPhoto: !!channel.photo,
                photoUrl: channel.photo ? channel.photo.substring(0, 50) + '...' : 'none'
            });

            avatar.innerHTML = this.getHeaderChannelAvatar(channel);
            title.textContent = channel.name;
            subtitle.textContent = `@${channel.username}`;
            // Show buttons when channel is selected, but hide for pinned channels
            if (leaveButton && viewButton) {
                const isPinned = channel.username === 'ircfspace' || channel.pinned;
                leaveButton.style.display = isPinned ? 'none' : 'block';
                viewButton.style.display = 'block'; // Always show view button
            }
        } else {
            avatar.textContent = '?';
            title.textContent = 'Select a channel';
            subtitle.textContent = 'Choose from the list';
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
            <div class="empty-state-text">Select a channel to view messages</div>
            <div class="empty-state-subtext">Choose from the channel list or add a new one</div>
        </div>
    `;
    }

    async loadChannelMessages(username) {
        const container = document.getElementById('messageContainer');

        // Check cache first
        const cachedData = this.getCachedData(username);
        if (cachedData) {
            console.log(`Using cached data for ${username}`);
            this.renderMessages(cachedData);
            return;
        }

        container.innerHTML =
            '<div style="text-align: center; padding: 20px; color: #8a9ba8;">در حال بارگذاری پیام‌ها...</div>';

        let disconnectProgress;

        try {
            // Show progress
            ProgressManager.show();

            const requestId = window.api.generateRequestId();
            disconnectProgress = window.api.connectProgress(requestId, (progress) => {
                ProgressManager.update(progress);
            });

            // Add delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const response = await window.api.fetchUrl(username, requestId);

            if (response.success && response.data) {
                // Cache successful response
                this.setCachedData(username, response.data);

                // Ensure progress reaches 100% before hiding
                ProgressManager.update({
                    stage: 10,
                    message: 'عملیات با موفقیت انجام شد!',
                    percent: 100
                });

                // Give a moment for 100% to show
                await new Promise((resolve) => setTimeout(resolve, 500));

                ProgressManager.hide();
                if (disconnectProgress) disconnectProgress();

                this.renderMessages(response.data);
            } else {
                // Keep progress bar visible to show the error message
                ProgressManager.update({
                    stage: 0,
                    message: `خطا: ${response.error || 'خطای ناشناخته'}`,
                    percent: 0
                });
                // Wait longer to show error message in progress bar
                await new Promise((resolve) => setTimeout(resolve, 3000));
                ProgressManager.hide();
                if (disconnectProgress) disconnectProgress();

                container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #e74c3c;">
                    خطا در بارگذاری پیام‌ها: ${response.error || 'خطای ناشناخته'}
                </div>
            `;
            }
        } catch (error) {
            // Show error in progress before hiding
            ProgressManager.update({
                stage: 0,
                message: `خطا: ${error.message}`,
                percent: 0
            });
            // Wait longer to show error message in progress bar
            await new Promise((resolve) => setTimeout(resolve, 3000));
            ProgressManager.hide();
            if (disconnectProgress) disconnectProgress();

            container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #e74c3c;">
                خطا: ${error.message}
            </div>
        `;
        }
    }

    renderMessages(data) {
        const container = document.getElementById('messageContainer');
        container.innerHTML = '';

        if (data.channel) {
            // Update channel info if available
            const channel = this.channels.find((c) => c.username === this.activeChannel);
            if (channel && data.channel.title) {
                channel.name = data.channel.title;
                console.log('Channel data received:', {
                    title: data.channel.title,
                    photo: data.channel.photo,
                    photoLength: data.channel.photo ? data.channel.photo.length : 0
                });
                if (data.channel.photo) {
                    channel.photo = data.channel.photo;
                    console.log('Channel photo saved:', channel.photo.substring(0, 100) + '...');
                }
                this.saveChannels();
                this.updateMessageHeader();
                this.updateSingleChannel(channel); // Update only the changed channel
            }
        }

        if (data.posts && data.posts.length > 0) {
            data.posts.forEach((post) => {
                const messageEl = document.createElement('div');
                messageEl.className = 'message';

                // Get channel photo for avatar
                const channel = this.channels.find((c) => c.username === this.activeChannel);
                const avatarHtml =
                    channel && channel.photo
                        ? `<img src="${channel.photo}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" 
                onerror="console.error('Post avatar load error:', this.src); this.style.display='none'; this.parentElement.innerHTML='${post.author ? post.author.charAt(0).toUpperCase() : '?'}';"
                onload="console.log('Post avatar loaded successfully');" />`
                        : post.author
                          ? post.author.charAt(0).toUpperCase()
                          : '?';

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
                    📹 Video (${video.duration || 'Unknown'})
                  </div>`
                            )
                            .join('');
                    }
                }

                messageEl.innerHTML = `
                <div class="message-avatar">${avatarHtml}</div>
                <div class="message-content">
                    <div class="message-header-info">
                        <span class="message-author">${post.author || 'Unknown'}</span>
                        <span class="message-time">${timeText}${post.edited ? ' • edited' : ''}</span>
                    </div>
                    <div class="message-bubble ${isOwn ? 'own' : ''}">
                        ${post.text ? `<div class="message-text" dir="auto">${post.text}</div>` : ''}
                        ${mediaHtml ? `<div class="message-media">${mediaHtml}</div>` : ''}
                        <div class="message-views">
                            👁 ${post.views || 0} views
                        </div>
                    </div>
                </div>
            `;

                container.appendChild(messageEl);
            });
        } else {
            container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #8a9ba8;">
                No messages found
            </div>
        `;
        }

        // Insert ads after all messages are rendered
        if (typeof adService !== 'undefined' && data.posts && data.posts.length > 0) {
            adService.insertAd(container, data.posts);
        }

        // Auto-scroll to bottom to show newest messages
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }

    createMediaGrid(photos) {
        const count = photos.length;

        if (count === 0) return '';

        let gridHtml = '<div class="media-grid">';

        if (count === 1) {
            // Single image - full width
            gridHtml += `<img src="${photos[0].thumb || photos[0].url}" alt="Photo" style="width: 100%; height: auto; border-radius: 8px; object-fit: cover;" />`;
        } else if (count === 2) {
            // Two images - side by side 50%
            gridHtml += photos
                .map(
                    (photo) =>
                        `<img src="${photo.thumb || photo.url}" alt="Photo" style="width: 50%; height: 120px; border-radius: 8px; object-fit: cover;" />`
                )
                .join('');
        } else if (count === 3) {
            // Three images - first full width, next two side by side 50%
            gridHtml += `<img src="${photos[0].thumb || photos[0].url}" alt="Photo" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 4px; object-fit: cover;" />`;
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
            <div style="margin-bottom: 10px;">کانال "@${searchTerm}" در لیست وجود ندارد</div>
            <div style="font-size: 12px;">می‌توانید با کلیک روی + آن را اضافه کنید</div>
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
                    const isPinned = updatedChannel.username === 'ircfspace';
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
            if (a.username === 'ircfspace') return -1;
            if (b.username === 'ircfspace') return 1;
            return 0;
        });

        sortedChannels.forEach((channel) => {
            const channelEl = document.createElement('div');
            const isPinned = channel.username === 'ircfspace';
            channelEl.className = `channel-item ${channel.username === this.activeChannel ? 'active' : ''}`;

            const avatarText = channel.name.charAt(0).toUpperCase();
            console.log(`Rendering avatar for ${channel.username}:`, {
                hasPhoto: !!channel.photo,
                photoUrl: channel.photo ? channel.photo.substring(0, 50) + '...' : 'none'
            });
            const avatarHtml = channel.photo
                ? `<img src="${channel.photo}" alt="${channel.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" 
          onerror="console.error('Avatar load error:', this.src); this.style.display='none'; this.parentElement.innerHTML='${avatarText}';"
          onload="console.log('Avatar loaded successfully');" />`
                : avatarText;

            channelEl.innerHTML = `
          <div class="channel-avatar">${avatarHtml}</div>
          <div class="channel-info">
            <div class="channel-name">${channel.name}${isPinned ? ' 📌' : ''}</div>
            <div class="channel-username">@${channel.username}</div>
          </div>
        `;

            channelEl.addEventListener('click', () => {
                this.setActiveChannel(channel.username);
                this.loadChannelMessages(channel.username);
            });

            container.appendChild(channelEl);
        });
    }
}
