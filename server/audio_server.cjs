const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.AUDIO_SERVER_PORT || 3001;

// Path to yt-dlp executable (use local copy in server folder)
const YTDLP_PATH = process.env.YTDLP_PATH || path.join(__dirname, 'yt-dlp.exe');

// Enable CORS for frontend
app.use(cors({
    origin: '*', // Allow all origins for deployed frontend
    methods: ['GET', 'POST', 'OPTIONS'],
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'audio-server' });
});

// Get audio info (title, duration, etc.) without downloading
app.get('/api/audio/info/:videoId', async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const ytdlp = spawn(YTDLP_PATH, [
        '--dump-json',
        '--no-download',
        ytUrl
    ]);

    let jsonData = '';
    let errorData = '';

    ytdlp.stdout.on('data', (data) => {
        jsonData += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error('yt-dlp info error:', errorData);
            return res.status(500).json({ error: 'Failed to get video info' });
        }

        try {
            const info = JSON.parse(jsonData);
            res.json({
                id: info.id,
                title: info.title,
                duration: info.duration,
                channel: info.channel,
                thumbnail: info.thumbnail,
                description: info.description?.substring(0, 500),
            });
        } catch (e) {
            console.error('Failed to parse video info:', e);
            res.status(500).json({ error: 'Failed to parse video info' });
        }
    });
});

// Stream audio from YouTube video
app.get('/api/audio/stream/:videoId', (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[Audio Server] Streaming audio for: ${videoId}`);

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');

    // Use yt-dlp to extract audio and stream to client
    // -f bestaudio: Get best audio quality
    // -o -: Output to stdout
    // --quiet: Reduce output noise
    const ytdlp = spawn(YTDLP_PATH, [
        '-f', 'bestaudio[ext=webm]/bestaudio/best',
        '-o', '-',
        '--quiet',
        '--no-warnings',
        ytUrl
    ]);

    // Pipe audio data to response
    ytdlp.stdout.pipe(res);

    // Handle errors
    ytdlp.stderr.on('data', (data) => {
        console.error(`[yt-dlp stderr]: ${data}`);
    });

    ytdlp.on('error', (error) => {
        console.error('[yt-dlp error]:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start audio extraction' });
        }
    });

    ytdlp.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`[yt-dlp] Process exited with code ${code}`);
        }
    });

    // Clean up on client disconnect
    req.on('close', () => {
        ytdlp.kill('SIGTERM');
    });
});

// Alternative endpoint: Get direct audio URL (for seeking support)
app.get('/api/audio/url/:videoId', async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get direct audio URL without downloading
    const ytdlp = spawn(YTDLP_PATH, [
        '-f', 'bestaudio[ext=m4a]/bestaudio/best',
        '-g', // Get URL only
        '--quiet',
        ytUrl
    ]);

    let audioUrl = '';
    let errorData = '';

    ytdlp.stdout.on('data', (data) => {
        audioUrl += data.toString().trim();
    });

    ytdlp.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    ytdlp.on('close', (code) => {
        if (code !== 0 || !audioUrl) {
            console.error('yt-dlp URL error:', errorData);
            return res.status(500).json({ error: 'Failed to get audio URL' });
        }

        res.json({
            audioUrl,
            videoId,
            expiresIn: '6 hours (approximate)'
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🎵 Audio Server running on http://localhost:${PORT}`);
    console.log(`   - Health: http://localhost:${PORT}/api/health`);
    console.log(`   - Stream: http://localhost:${PORT}/api/audio/stream/:videoId`);
    console.log(`   - Info:   http://localhost:${PORT}/api/audio/info/:videoId`);
    console.log(`   - URL:    http://localhost:${PORT}/api/audio/url/:videoId\n`);
});
