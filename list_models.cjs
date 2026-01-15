const https = require('https');
const fs = require('fs');

const API_KEY = 'AIzaSyAMbF-gJBrIgMJa_ZU2hgZRKWh7aZmasAM';
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
