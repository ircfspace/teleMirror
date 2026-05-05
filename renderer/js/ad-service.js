// Advertisement Service
class AdService {
    constructor() {
        this.config = null;
        this.hiddenAds = new Set();
        this.loadConfig();
        this.loadHiddenAds();
    }

    async loadConfig() {
        try {
            const data = await window.api.getAdsConfig();
            this.config = data;
        } catch (error) {
            console.error('Failed to load ad configuration:', error);
            this.config = { ads: [], settings: { enabled: false } };
        }
    }

    loadHiddenAds() {
        try {
            const hidden = localStorage.getItem('hiddenAds');
            if (hidden) {
                const hiddenData = JSON.parse(hidden);
                const now = Date.now();

                // Clean up expired hidden ads (older than 24 hours)
                Object.keys(hiddenData).forEach((adId) => {
                    if (now - hiddenData[adId] > 24 * 60 * 60 * 1000) {
                        delete hiddenData[adId];
                    }
                });

                // Update localStorage with cleaned data
                localStorage.setItem('hiddenAds', JSON.stringify(hiddenData));

                // Load current hidden ads
                this.hiddenAds = new Set(Object.keys(hiddenData));
            }
        } catch (error) {
            console.error('Failed to load hidden ads:', error);
            this.hiddenAds = new Set();
        }
    }

    hideAd(adId) {
        const hiddenData = JSON.parse(localStorage.getItem('hiddenAds') || '{}');
        hiddenData[adId] = Date.now();
        localStorage.setItem('hiddenAds', JSON.stringify(hiddenData));
        this.hiddenAds.add(adId);
    }

    isAdHidden(adId) {
        return this.hiddenAds.has(adId);
    }

    getActiveAds() {
        if (!this.config || !this.config.settings.enabled) {
            return [];
        }

        return this.config.ads.filter((ad) => ad.isActive && !this.isAdHidden(ad.id));
    }

    getRandomAd() {
        const activeAds = this.getActiveAds();
        if (activeAds.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * activeAds.length);
        return activeAds[randomIndex];
    }

    shouldShowAd() {
        return this.config && this.config.settings.enabled && this.getActiveAds().length > 0;
    }

    createAdElement() {
        const ad = this.getRandomAd();
        if (!ad) {
            return null;
        }

        const messageEl = document.createElement('div');
        messageEl.className = 'message ad-message';
        messageEl.setAttribute('data-ad-id', ad.id);

        // Get ad image or fallback to channel avatar style
        const avatarHtml = ad.image
            ? `<img src="${ad.image}" alt="${ad.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" 
                onerror="console.error('Ad avatar load error:', this.src); this.style.display='none'; this.parentElement.innerHTML='${ad.name.charAt(0).toUpperCase()}';" />`
            : ad.name.charAt(0).toUpperCase();

        messageEl.innerHTML = `
            <div class="message-avatar">${avatarHtml}</div>
            <div class="message-content">
                <div class="message-header-info">
                    <span class="message-author">${ad.name}</span>
                    <span class="ad-label">${this.config.settings.labelText}</span>
                    ${this.config.settings.closeButton ? `<button class="ad-close-btn" onclick="adService.closeAd('${ad.id}')">&times;</button>` : ''}
                </div>
                <div class="message-bubble">
                    ${ad.caption ? `<div class="message-text" dir="auto">${ad.caption}</div>` : ''}
                    <div class="message-views" style="color: #f39c12; font-size: 12px;">
                        📢 ${I18n.t('adLabel')}
                    </div>
                </div>
            </div>
        `;

        return messageEl;
    }

    closeAd(adId) {
        const adElement = document.querySelector(`[data-ad-id="${adId}"]`);
        if (adElement) {
            adElement.style.transition = 'opacity 0.3s, transform 0.3s';
            adElement.style.opacity = '0';
            adElement.style.transform = 'translateX(100%)';

            setTimeout(() => {
                adElement.remove();
            }, 300);
        }

        this.hideAd(adId);
    }

    insertAd(container, posts) {
        if (!this.shouldShowAd() || !posts || posts.length === 0) {
            return;
        }

        const adElement = this.createAdElement();
        if (!adElement) {
            return;
        }

        const position = this.config.settings.position;

        if (position === 'before_last' && posts.length > 0) {
            // Insert one position before the last post
            const messageElements = container.querySelectorAll('.message:not(.ad-message)');
            if (messageElements.length > 0) {
                const lastMessage = messageElements[messageElements.length - 1];
                container.insertBefore(adElement, lastMessage);
            } else {
                container.appendChild(adElement);
            }
        } else {
            // Fallback: append to container
            container.appendChild(adElement);
        }
    }
}

// Global instance
const adService = new AdService();
