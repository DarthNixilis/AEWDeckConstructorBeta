// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

function parseTSV(text) {
    // This parser is now hyper-defensive.
    if (typeof text !== 'string' || !text) return [];

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
            const rawValue = values[j] || ''; // Default to empty string if column is missing
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

export function loadGameData() {
    try {
        // --- THIS IS THE FINAL FIX ---
        // 1. Check if the global variables from index.html actually exist.
        if (typeof window.CARD_DATABASE_TEXT === 'undefined') {
            throw new Error("The global variable 'CARD_DATABASE_TEXT' was not found. Check for typos or script errors in index.html.");
        }
        if (typeof window.KEYWORDS_TEXT === 'undefined') {
            throw new Error("The global variable 'KEYWORDS_TEXT' was not found. Check for typos or script errors in index.html.");
        }

        // 2. Pass the confirmed data to the parser.
        const cardData = parseTSV(window.CARD_DATABASE_TEXT);
        const keywordData = parseTSV(window.KEYWORDS_TEXT);
        // --- END OF FINAL FIX ---

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

