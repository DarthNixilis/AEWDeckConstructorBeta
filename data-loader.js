// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

function parseTSV(text) {
    if (typeof text !== 'string' || !text) return [];

    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
    }

    const lines = text.trim().replace(/"/g, '').split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t').map(h => h ? h.trim() : '');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i] || lines[i].trim() === '') continue;
        const values = lines[i].split('\t');
        const obj = {};

        for (let j = 0; j < headers.length; j++) {
            const key = headers[j];
            const rawValue = values[j] || '';
            let value = rawValue.trim();

            if (key) {
                // Standardize the key for easier access later. e.g., "Card Name" becomes "card_name"
                const standardizedKey = key.toLowerCase().replace(/ /g, '_');

                if (standardizedKey !== 'title' && standardizedKey !== 'text' && !isNaN(value) && value !== '') {
                    value = Number(value);
                } else if (value.toUpperCase() === 'TRUE') {
                    value = true;
                } else if (value.toUpperCase() === 'FALSE') {
                    value = false;
                } else if (standardizedKey === 'traits' || standardizedKey === 'keywords') {
                    value = value ? value.split('|').map(t => t.trim()).filter(t => t) : [];
                }
                obj[standardizedKey] = value;
            }
        }
        
        // --- THIS IS THE REAL FIX ---
        // Check for the correct header name: 'card_name'.
        if (obj.card_name) {
            // For consistency, let's also create a 'title' property which the rest of the app uses.
            obj.title = obj.card_name;
            data.push(obj);
        }
        // --- END OF REAL FIX ---
    }
    return data;
}

export async function loadGameData() {
    try {
        const cacheBuster = `?t=${new Date().getTime()}`;
        
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(`./cardDatabase.txt${cacheBuster}`),
            fetch(`./Keywords.txt${cacheBuster}`)
        ]);

        if (!cardResponse.ok) throw new Error(`Failed to fetch cardDatabase.txt: ${cardResponse.status} ${cardResponse.statusText}`);
        if (!keywordResponse.ok) throw new Error(`Failed to fetch Keywords.txt: ${keywordResponse.status} ${keywordResponse.statusText}`);

        const cardText = await cardResponse.text();
        const keywordText = await keywordResponse.text();
        
        if (!cardText) throw new Error("cardDatabase.txt was fetched but is empty.");
        if (!keywordText) throw new Error("Keywords.txt was fetched but is empty.");

        const cardData = parseTSV(cardText);
        const keywordData = parseTSV(keywordText);

        if (!Array.isArray(cardData) || cardData.length === 0) {
            throw new Error("Parsing cardDatabase.txt resulted in an empty array. This indicates a fundamental mismatch between the parser and the TSV file structure.");
        }

        setCardDatabase(cardData);
        
        const keywordObject = keywordData.reduce((acc, kw) => {
            // Standardize the keyword lookup as well
            if (kw.keyword) {
                acc[kw.keyword] = kw.description;
            }
            return acc;
        }, {});
        setKeywordDatabase(keywordObject);

        initializeApp();

    } catch (error) {
        console.error('CRITICAL ERROR in loadGameData:', error);
        document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
            <h2>Application Failed to Load</h2>
            <p>Could not load data from the server. Please ensure <strong>cardDatabase.txt</strong> and <strong>Keywords.txt</strong> exist in the same directory as index.html and are accessible.</p>
            <p><strong>Error details:</strong> ${error.message}</p>
        </div>`;
    }
}

