require('dotenv').config();
const https = require('https');

// Read the key from the .env file
const API_KEY = process.env.VITE_GEMINI_API_KEY;
// Using gemini-2.0-flash-exp as configured in the app
const MODEL = 'gemini-2.0-flash-exp';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const data = JSON.stringify({
    contents: [{
        parts: [{ text: "Hello" }]
    }]
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(url, options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Body:', body);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
