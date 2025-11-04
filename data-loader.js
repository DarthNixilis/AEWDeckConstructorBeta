// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

function parseTSV(text) {
    if (typeof text !== 'string' || !text) return [];

    // --- THIS IS THE BOM FIX ---
    // Check for and remove the UTF-8 Byte Order Mark (BOM) if it exists.
    // The BOM is an invisible character at the start of the file that can break parsers.
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
    }
    // --- END OF BOM FIX ---

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
                if (key !== 'title' && key !== 'text' && !isNaN(value) && value !== '') {
                    value = Number(value);
                } else if (value === 'TRUE') {
                    value = true;
                } else if (value === 'FALSE') {
                    value = false;
                } else if (key === 'traits' || key === 'keywords') {
                    value = value ? value.split('|').map(t => t.trim()).filter(t => t) : [];
                }
                obj[key] = value;
            }
        }
        if (obj.title) {
            data.push(obj);
        }
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
            throw new Error("Parsing cardDatabase.txt resulted in an empty array. This can happen if the file is not valid TSV or has a character encoding issue (like a BOM).");
        }

        setCardDatabase(cardData);
        
        const keywordObject = keywordData.reduce((acc, kw) => {
            if (kw.Keyword) {
                acc[kw.Keyword] = kw.Description;
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

