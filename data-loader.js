// data-loader.js
import { setCardDatabase, setKeywordDatabase, buildSearchIndex } from './state.js';
import { initializeApp } from './app-init.js';
import { showFatalError, withRetry } from './utils.js';

function parseTSV(text) {
    try {
        if (typeof text !== 'string' || !text) return [];
        if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
        const lines = text.trim().replace(/"/g, '').split(/\r?\n/);
        if (lines.length < 2) return [];
        const headers = lines[0].split('\t').map(h => h ? h.trim().toLowerCase().replace(/ /g, '_') : '');
        if (!headers.includes('card_name')) throw new Error("Invalid TSV format: missing 'Card Name' header.");
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i] || lines[i].trim() === '') continue;
            const values = lines[i].split('\t');
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                if (!key) continue;
                let value = (values[j] || '').trim();

                // --- GEMINI'S ROBUST PARSING LOGIC ---
                // 1. First, check if the value should be treated as empty/null.
                if (value === '' || value.toLowerCase() === 'n/a' || value === '-') {
                    obj[key] = null;
                    continue; // Go to the next header
                }

                // 2. Handle complex types (like arrays of strings)
                if (key === 'keywords' || key === 'traits') {
                    obj[key] = value.split('|').map(v => v.trim()).filter(Boolean);
                } 
                // 3. Handle booleans
                else if (value.toUpperCase() === 'TRUE') {
                    obj[key] = true;
                } else if (value.toUpperCase() === 'FALSE') {
                    obj[key] = false;
                } 
                // 4. Handle numbers
                else if (!isNaN(value)) { 
                    obj[key] = Number(value);
                } 
                // 5. Default is string
                else {
                    obj[key] = value;
                }
                // --- END OF GEMINI'S LOGIC ---
            }
            if (obj.card_name) {
                obj.title = obj.card_name;
                data.push(obj);
            }
        }
        return data;
    } catch (error) {
        if (window.debug) window.debug.error('Error inside parseTSV', error);
        return [];
    }
}

async function loadData() {
    // ... (The rest of the loadData function remains the same)
}

export const loadGameData = withRetry(loadData, 2, 1000);

