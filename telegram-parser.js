const cheerio = require('cheerio');

class TelegramParser {
    constructor() {
        this.emojiMap = {
            '🔗': 'link',
            '📽': 'video',
            '💡': 'idea',
            '©': 'copyright',
            '❤': 'heart',
            '👍': 'like',
            '👎': 'dislike',
            '😁': 'happy',
            '😢': 'sad',
            '🤬': 'angry',
            '😐': 'neutral',
            '👏': 'clap',
            '🔥': 'fire',
            '🥴': 'drunk',
            '💯': '100',
            '🗿': 'moyai',
            '🎉': 'party',
            '😱': 'scream',
            '🏆': 'trophy'
        };
    }

    parseChannelInfo(html) {
        const $ = cheerio.load(html);
        const channelInfo = {
            title: '',
            username: '',
            description: '',
            photo: '',
            subscribers: '',
            stats: {
                photos: 0,
                videos: 0,
                files: 0,
                links: 0
            }
        };

        // Extract channel title
        channelInfo.title = $('.tgme_channel_info_header_title span').text().trim();

        // Extract username
        channelInfo.username = $('.tgme_channel_info_header_username a').text().trim();

        // Extract description
        channelInfo.description = $('.tgme_channel_info_description').html() || '';

        // Extract photo - try multiple selectors
        let photoImg = $('.tgme_channel_info_header i img').first();
        if (photoImg.length === 0) {
            // Try the new structure
            photoImg = $('.tgme_channel_info_header .tgme_page_photo_image img').first();
        }
        if (photoImg.length === 0) {
            // Try any img inside the header
            photoImg = $('.tgme_channel_info_header img').first();
        }
        if (photoImg.length > 0) {
            channelInfo.photo = photoImg.attr('src') || '';
        }

        // Extract subscribers count
        const subscribersText = $('.tgme_channel_info_counter').first().text().trim();
        if (subscribersText) {
            channelInfo.subscribers = subscribersText;
        }

        // Extract stats
        $('.tgme_channel_info_counter').each((i, elem) => {
            const text = $(elem).text().trim();
            const value = $(elem).find('.counter_value').text().trim();
            const type = $(elem).find('.counter_type').text().trim();

            if (type === 'photos') channelInfo.stats.photos = value;
            else if (type === 'videos') channelInfo.stats.videos = value;
            else if (type === 'files') channelInfo.stats.files = value;
            else if (type === 'links') channelInfo.stats.links = value;
        });

        return channelInfo;
    }

    parsePosts(html) {
        const $ = cheerio.load(html);
        const posts = [];

        $('.tgme_widget_message_wrap').each((i, elem) => {
            const post = this.parseSinglePost($, $(elem));
            if (post) {
                posts.push(post);
            }
        });

        return posts;
    }

    parseSinglePost($, postElement) {
        const post = {
            id: '',
            author: '',
            authorPhoto: '',
            text: '',
            media: [],
            reactions: [],
            views: '',
            time: '',
            link: '',
            edited: false
        };

        // Extract post ID and link
        const postAttr = postElement.attr('data-post');

        if (postAttr) {
            // Extract ID from format "username/postID"
            const parts = postAttr.split('/');
            post.id = parts.length > 1 ? parts[1] : postAttr;
            post.link = `https://t.me/${postAttr}`;
        } else {
            // Try to find ID from link elements - look for post-specific links
            const linkElement = postElement.find('a[href*="/"]');
            let foundId = false;

            linkElement.each((i, elem) => {
                if (foundId) return;
                const href = $(elem).attr('href');
                // Look for pattern like /username/1234 or /1234
                const match = href?.match(/\/(\d+)(?:\/|$)/);
                if (match && match[1]) {
                    post.id = match[1];
                    post.link = href;
                    foundId = true;
                }
            });
        }

        // Extract author info
        post.author = postElement.find('.tgme_widget_message_owner_name span').text().trim();

        // Extract author photo
        const authorImg = postElement.find('.tgme_widget_message_user_photo img');
        if (authorImg.length > 0) {
            post.authorPhoto = authorImg.attr('src') || '';
        }

        // Extract text content
        const textElement = postElement.find('.tgme_widget_message_text');
        if (textElement.length > 0) {
            post.text = this.parseTextContent($, textElement);
        }

        // Extract media (photos, videos)
        post.media = this.parseMedia($, postElement);

        // Extract reactions
        post.reactions = this.parseReactions($, postElement);

        // Extract views
        const viewsElement = postElement.find('.tgme_widget_message_views');
        if (viewsElement.length > 0) {
            post.views = viewsElement.text().trim();
        }

        // Extract time
        const timeElement = postElement.find('.tgme_widget_message_date time');
        if (timeElement.length > 0) {
            post.time = timeElement.attr('datetime') || timeElement.text().trim();
        }

        // Check if edited
        const metaElement = postElement.find('.tgme_widget_message_meta');
        if (metaElement.length > 0 && metaElement.text().includes('edited')) {
            post.edited = true;
        }

        return post;
    }

    parseTextContent($, textElement) {
        let content = '';

        textElement.contents().each((i, elem) => {
            const $elem = $(elem);

            if (elem.type === 'text') {
                content += $elem.text();
            } else if (elem.tagName === 'a') {
                const href = $elem.attr('href') || '';
                const text = $elem.text().trim();

                // Check if this is a hashtag link (starts with #)
                if (text.startsWith('#')) {
                    // Convert hashtag to plain text (no link)
                    content += text;
                } else {
                    // Keep regular links as clickable
                    content += `<a href="${href}" target="_blank">${text}</a>`;
                }
            } else if (elem.tagName === 'br') {
                content += '<br>';
            } else if (elem.tagName === 'code') {
                const codeText = $elem.text().trim();
                content += `<code>${codeText}</code>`;
            } else if (elem.tagName === 'pre') {
                const preText = $elem.text().trim();
                content += `<pre>${preText}</pre>`;
            } else if ($elem.hasClass('emoji')) {
                const emojiText = $elem.find('b').text().trim();
                content += emojiText;
            }
        });

        return content.trim();
    }

    parseMedia($, postElement) {
        const media = [];

        // Parse photos from HTML (for light version)
        postElement.find('.tgme_widget_message_photo_wrap').each((i, elem) => {
            const $elem = $(elem);
            const photo = {
                type: 'photo',
                url: $elem.attr('href') || '',
                thumb:
                    $elem.css('background-image')?.replace(/url\(['"]?([^'"]*)['"]?\)/, '$1') || '',
                width: $elem.css('width')?.replace('px', '') || '',
                paddingTop: $elem.find('.tgme_widget_message_photo').css('padding-top') || ''
            };
            media.push(photo);
        });

        // Parse videos
        postElement.find('.tgme_widget_message_video_player').each((i, elem) => {
            const $elem = $(elem);
            const video = {
                type: 'video',
                url: $elem.attr('href') || '',
                thumb:
                    $elem
                        .find('.tgme_widget_message_video_thumb')
                        .css('background-image')
                        ?.replace(/url\(['"]?([^'"]*)['"]?\)/, '$1') || '',
                duration: $elem.find('.message_video_duration').text().trim() || '',
                width:
                    $elem.find('.tgme_widget_message_video_wrap').css('width')?.replace('px', '') ||
                    '',
                paddingTop: $elem.find('.tgme_widget_message_video_wrap').css('padding-top') || ''
            };
            media.push(video);
        });

        return media;
    }

    parseReactions($, postElement) {
        const reactions = [];

        postElement.find('.tgme_reaction').each((i, elem) => {
            const $elem = $(elem);
            const emoji = $elem.find('.emoji b, .icon').text().trim();
            const count = $elem
                .contents()
                .filter(function () {
                    return this.type === 'text';
                })
                .text()
                .trim();

            let type = 'custom';
            if (this.emojiMap[emoji]) {
                type = this.emojiMap[emoji];
            }

            reactions.push({
                emoji: emoji,
                count: count || '0',
                type: type
            });
        });

        return reactions;
    }

    parseFullPage(html) {
        const $ = cheerio.load(html);

        return {
            channel: this.parseChannelInfo(html),
            posts: this.parsePosts(html),
            totalPosts: $('.tgme_widget_message_wrap').length
        };
    }

    // Parse posts from JSON data (for normal version with base64 images)
    parsePostsFromJson(posts) {
        return posts.map((post) => {
            // Parse media from JSON data
            if (post.media && post.media.length > 0) {
                post.media = post.media.map((media) => {
                    if (
                        media.type === 'photo' &&
                        media.url &&
                        media.url.startsWith('data:image/')
                    ) {
                        // Base64 image from JSON
                        return {
                            type: 'photo',
                            url: media.url,
                            thumb: media.url,
                            width: media.width || '',
                            paddingTop: media.height || ''
                        };
                    }
                    return media;
                });
            }
            return post;
        });
    }
}

module.exports = TelegramParser;
