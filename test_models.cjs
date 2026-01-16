const https = require('https');
require('dotenv').config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-flash-latest',
    'gemini-pro-latest'
];

async function testModel(model) {
    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
        const data = JSON.stringify({
            contents: [{ parts: [{ text: "Hi" }] }]
        });

        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`[SUCCESS] ${model} works!`);
                    resolve(true);
                } else {
                    console.log(`[FAILED] ${model} status: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`[ERROR] ${model}: ${e.message}`);
            resolve(false);
        });
        req.write(data);
        req.end();
    });
}

async function run() {
    for (const model of models) {
        if (await testModel(model)) {
            process.exit(0);
        }
    }
}

run();
