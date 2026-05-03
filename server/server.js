const express = require("express");
const HttpClient = require("../http-client");
const TelegramParser = require("../telegram-parser");

function createServer(port = 9876) {
  const app = express();
  app.use(express.json());

  const parser = new TelegramParser();

  // Store active requests with their progress clients
  const activeRequests = new Map();

  // SSE endpoint for progress
  app.get("/progress/:requestId", (req, res) => {
    const requestId = req.params.requestId;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Store the response object to send events
    if (!activeRequests.has(requestId)) {
      activeRequests.set(requestId, { progressListeners: [] });
    }
    const requestData = activeRequests.get(requestId);
    requestData.progressListeners.push(res);

    // Send initial connection message
    res.write(
      `data: ${JSON.stringify({ stage: 0, message: "اتصال برقرار شد، آماده دریافت درخواست...", percent: 0 })}\n\n`,
    );

    // Clean up on close
    req.on("close", () => {
      const idx = requestData.progressListeners.indexOf(res);
      if (idx > -1) {
        requestData.progressListeners.splice(idx, 1);
      }
      if (requestData.progressListeners.length === 0) {
        activeRequests.delete(requestId);
      }
    });
  });

  app.post("/fetch", async (req, res) => {
    const { url, requestId } = req.body;

    // Create a new client for this request
    const client = new HttpClient();

    // Set up progress listener if requestId provided
    if (requestId && activeRequests.has(requestId)) {
      const requestData = activeRequests.get(requestId);
      client.on("progress", (progress) => {
        // Broadcast to all listeners
        requestData.progressListeners.forEach((listener) => {
          listener.write(`data: ${JSON.stringify(progress)}\n\n`);
        });
      });
    }

    try {
      const response = await client.curlSetopts(url);

      if (
        response.success &&
        response.data &&
        typeof response.data === "string" &&
        response.data.includes("<html")
      ) {
        // Parse Telegram posts from HTML
        const parsedData = parser.parseFullPage(response.data);

        console.log("Parsed channel info:", {
          title: parsedData.channel.title,
          hasPhoto: !!parsedData.channel.photo,
          photoUrl: parsedData.channel.photo
            ? parsedData.channel.photo.substring(0, 100) + "..."
            : "none",
          photoLength: parsedData.channel.photo
            ? parsedData.channel.photo.length
            : 0,
        });

        res.json({
          success: true,
          data: parsedData,
          status: response.status,
          headers: response.headers,
          responseTime: response.responseTime,
          url: response.url,
        });
      } else if (!response.success) {
        // Try GitHub JSON API as fallback
        console.log("Telegram fetch failed, trying GitHub JSON API...");
        
        // Extract username from URL
        const username = extractUsernameFromUrl(url);
        if (username) {
          try {
            const githubData = await fetchGitHubJsonData(username);
            if (githubData) {
              console.log("GitHub JSON data found for:", username);
              res.json({
                success: true,
                data: githubData,
                status: 200,
                headers: {},
                responseTime: 0,
                url: `https://raw.githubusercontent.com/ircfspace/teleFeed/refs/heads/export/${username}.json`,
                source: "github"
              });
              return;
            }
          } catch (githubError) {
            console.log("GitHub JSON fetch failed:", githubError.message);
          }
        }
        
        // If GitHub also failed, return original error
        res.json(response);
      } else {
        res.json(response);
      }
    } catch (e) {
      // Try GitHub JSON API as fallback for exceptions too
      console.log("Exception occurred, trying GitHub JSON API...");
      
      const username = extractUsernameFromUrl(url);
      if (username) {
        try {
          const githubData = await fetchGitHubJsonData(username);
          if (githubData) {
            console.log("GitHub JSON data found for:", username);
            res.json({
              success: true,
              data: githubData,
              status: 200,
              headers: {},
              responseTime: 0,
              url: `https://raw.githubusercontent.com/ircfspace/teleFeed/refs/heads/export/${username}.json`,
              source: "github"
            });
            return;
          }
        } catch (githubError) {
          console.log("GitHub JSON fetch failed:", githubError.message);
        }
      }
      
      res.json({
        success: false,
        error: e.message,
      });
    } finally {
      // Clean up
      if (requestId) {
        activeRequests.delete(requestId);
      }
    }
  });

  // Helper function to extract username from URL
  function extractUsernameFromUrl(url) {
    try {
      // Handle different URL formats
      if (url.includes("t.me/s/")) {
        const match = url.match(/t\.me\/s\/([^\/\?]+)/);
        return match ? match[1] : null;
      } else if (url.includes("t.me/")) {
        const match = url.match(/t\.me\/([^\/\?]+)/);
        return match ? match[1] : null;
      } else if (!url.includes("/")) {
        // If it's just a username
        return url.trim().replace("@", "");
      }
      return null;
    } catch (error) {
      console.error("Error extracting username:", error);
      return null;
    }
  }

  // Helper function to fetch GitHub JSON data
  async function fetchGitHubJsonData(username) {
    try {
      const axios = require("axios");
      const lowercaseUsername = username.toLowerCase();
      const githubUrl = `https://raw.githubusercontent.com/ircfspace/teleFeed/refs/heads/export/${lowercaseUsername}.json`;
      
      console.log("Fetching GitHub JSON from:", githubUrl);
      
      const response = await axios.get(githubUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'teleMirror/1.0'
        }
      });
      
      if (response.data && typeof response.data === 'object') {
        // Convert GitHub JSON format to match existing structure
        const convertedData = convertGitHubJsonFormat(response.data);
        console.log("GitHub JSON converted successfully");
        return convertedData;
      }
      
      return null;
    } catch (error) {
      console.log("GitHub JSON fetch error:", error.message);
      return null;
    }
  }

  // Helper function to convert GitHub JSON format to match existing structure
  function convertGitHubJsonFormat(githubData) {
    try {
      const converted = {
        channel: {},
        posts: []
      };
      
      // Convert channel info
      if (githubData.info) {
        converted.channel = {
          title: githubData.info.title || githubData.info.username || "Unknown",
          username: githubData.info.username || "unknown",
          photo: githubData.info.photo_url || null
        };
      }
      
      // Convert posts
      if (githubData.posts && Array.isArray(githubData.posts)) {
        converted.posts = githubData.posts.map(post => ({
          id: post.id || 0,
          text: post.message || "",
          time: post.date || new Date().toISOString(),
          edited: post.edited || false,
          views: post.views || 0,
          author: post.sender_name || converted.channel.title,
          isOwn: false,
          media: [] // GitHub JSON doesn't seem to include media
        })).reverse(); // Reverse to show newest first (like Telegram parser)
      }
      
      return converted;
    } catch (error) {
      console.error("Error converting GitHub JSON format:", error);
      return null;
    }
  }

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve({ server, port });
    });
  });
}

module.exports = { createServer };
