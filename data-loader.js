// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

/**
 * Parses Tab-Separated Value (TSV) text into an array of objects.
 * @param {string} text The raw TSV text content.
 * @returns {Array<Object>} An array of JavaScript objects.
 */
function parseTSV(text) {
    const lines = text.trim().replace(/"/g, '').split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = lines[i].split('\t').map(v => v.trim());
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            const key = headers[j];
            let value = values[j];
            if (key !== 'title' && key !== 'text' && !isNaN(value) && value.trim() !== '') {
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
        data.push(obj);
    }
    return data;
}

export function loadGameData() {
    try {
        // --- THIS IS THE NEW LOGIC ---
        // Read the data directly from the global variables defined in index.html
        // This completely bypasses the 'fetch' API.
        const cardData = parseTSV(window.CARD_DATABASE_TEXT);
        const keywordData = parseTSV(window.KEYWORDS_TEXT);
        // --- END OF NEW LOGIC ---

        if (!Array.isArray(cardData) || cardData.length === 0) {
            throw new Error("Parsing the embedded card data resulted in an empty array.");
        }

        setCardDatabase(cardData);
        
        const keywordObject = keywordData.reduce((acc, kw) => {
            if (kw.Keyword) {
                acc[kw.Keyword] = kw.Description;
            }
            return acc;
        }, {});
        setKeywordDatabase(keywordObject);

        // Run the app initializer
        initializeApp();

    } catch (error) {
        console.error('CRITICAL ERROR in loadGameData:', error);
        document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
            <h2>Application Failed to Load</h2>
            <p>There was a critical error processing the embedded data.</p>
            <p><strong>Error details:</strong> ${error.message}</p>
            <p>Please check that the data was pasted correctly into index.html and that the TSV format is correct.</p>
        </div>`;
    }
}

