require('dotenv').config();
const https = require('https');
const fs = require('fs');

const API_KEY = process.env.VITE_GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        fs.writeFileSync('d:\\skillhive\\models.json', data);
    });
}).on('error', (err) => {
    fs.writeFileSync('d:\\skillhive\\models.json', JSON.stringify({ error: err.message }));
});
