// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

/**
 * A robustly parses Tab-Separated Value (TSV) text into an array of objects.
 * It handles missing values and lines with fewer columns than the header.
 * @param {string} text The raw TSV text content.
 * @returns {Array<Object>} An array of JavaScript objects.
 */
function parseTSV(text) {
    // Defensive check: if text is not a string or is empty, return empty array.
    if (typeof text !== 'string' || !text) {
        return [];
    }

    const lines = text.trim().replace(/"/g, '').split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t').map(h => h ? h.trim() : '');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i] || lines[i].trim() === '') continue; // Skip empty or whitespace-only lines

        const values = lines[i].split('\t');
        const obj = {};

        for (let j = 0; j < headers.length; j++) {
            const key = headers[j];
            // --- THIS IS THE BULLETPROOF FIX ---
            // 1. Check if the value exists. If not, use an empty string.
            const rawValue = values[j] || '';
            // 2. Now it is safe to call .trim()
            let value = rawValue.trim();
            // --- END OF BULLETPROOF FIX ---

            if (key) { // Only process if the header key is not empty
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
        // Only add the object if it has at least one key (e.g., a title)
        if (obj.title) {
            data.push(obj);
        }
    }
    return data;
}

export function loadGameData() {
    try {
        const cardData = parseTSV(window.CARD_DATABASE_TEXT);
        const keywordData = parseTSV(window.KEYWORDS_TEXT);

        if (!Array.isArray(cardData) || cardData.length === 0) {
            throw new Error("Parsing the embedded card data resulted in an empty array. Please verify the data in index.html.");
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
            <p>There was a critical error processing the embedded data.</p>
            <p><strong>Error details:</strong> ${error.message}</p>
            <p>Please check that the data was pasted correctly into index.html and that the TSV format is correct.</p>
        </div>`;
    }
}

