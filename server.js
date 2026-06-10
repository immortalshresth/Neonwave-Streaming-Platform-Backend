const express = require('express');
const cors = require('cors'); 
const { google } = require('googleapis');
const { exec } = require('youtube-dl-exec');
const path = require('path');
const app = express();
app.use(cors({
    origin: [
        'https://night-groove-app-main.vercel.app',
        'https://night-groove-app-main.panigrahishresth232.workers.dev'
    ]
}));

// ⚡ YOUTUBE API AUTH
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });

// ⚡ LOCAL MEMORY CACHE (The Quota Guard)
const searchCache = new Map();

// ==========================================
// 1. THE LIMITLESS SEARCH ENGINE
// ==========================================
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    
    if (!query) return res.status(400).json({ error: "No query" });

    // Check RAM Cache first
    if (searchCache.has(query)) {
        console.log(`⚡ Signal recalled from RAM cache for: ${query}`);
        return res.json(searchCache.get(query));
    }

    try {
        console.log(`📡 Hitting Official YouTube Network for: ${query}`);
        
        const response = await youtube.search.list({
            part: 'snippet',
            q: query,             // Raw, unfiltered search
            maxResults: 1,
            type: 'video'
        });

        if (!response.data.items || response.data.items.length === 0) {
            return res.status(404).json({ error: "No tracks found." });
        }

        const video = response.data.items[0];

        const result = {
            id: video.id.videoId,
            title: video.snippet.title,
            artist: video.snippet.channelTitle,
            cover: video.snippet.thumbnails.high.url
        };

        // Save to cache and send to React
        searchCache.set(query, result);
        console.log(`✅ Signal Acquired: ${result.title}`);
        res.json(result);

    } catch (error) {
        console.error('❌ Search Failure:', error.message);
        res.status(500).json({ error: "API Error" });
    }
});

// ==========================================
// 2. THE NUCLEAR AUDIO ENGINE (yt-dlp)
// ==========================================
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id; 
    
    if (!videoId) return res.status(400).send("No video ID provided");

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`🎧 Engaging yt-dlp extraction for: ${videoId}`);

    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Run the yt-dlp binary and tell it to pipe the raw audio file to stdout
// Run the yt-dlp binary and tell it to pipe the raw audio file to stdout
const subprocess = exec(videoUrl, {
        output: '-',           
        format: 'bestaudio',   
        noWarnings: true,
        preferFreeFormats: true,
        cookies: path.join(__dirname, 'cookies.txt') 
    });

    // Pipe the raw audio data directly into the React frontend response
    subprocess.stdout.pipe(res);

    subprocess.on('error', (error) => {
        console.error('❌ Nuclear Engine Failed:', error);
        if (!res.headersSent) res.status(500).end();
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Ghost Engine Online on port ${PORT}`));
