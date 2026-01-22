import fs from 'fs';
import https from 'https';
import path from 'path';

// Read .env manually to avoid dependencies
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        const match = envConfig.match(/VITE_GEMINI_API_KEY=(.*)/);

        if (match && match[1]) {
            // Remove quotes if present and whitespace
            const apiKey = match[1].trim().replace(/^["']|["']$/g, '');

            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

            console.log('Checking available models...');

            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.models) {
                            console.log('\n--- AVAILABLE MODELS ---');
                            json.models.forEach(m => {
                                // Filter for generateContent supported models
                                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                                    console.log(`Name: ${m.name}`);
                                    console.log(`DisplayName: ${m.displayName}`);
                                    console.log('---');
                                }
                            });
                        } else {
                            console.log('API Error:', JSON.stringify(json, null, 2));
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                        console.log('Raw response:', data);
                    }
                });
            }).on('error', (err) => {
                console.error('Network error:', err.message);
            });

        } else {
            console.error('Could not find VITE_GEMINI_API_KEY in .env');
        }
    } else {
        console.error('.env file not found at:', envPath);
    }
} catch (e) {
    console.error('Error executing script:', e.message);
}
