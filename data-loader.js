// data-loader.js
import { setCardDatabase, setKeywordDatabase, buildSearchIndex } from './state.js';
import { withRetry } from './utils.js';

function parseTSV(text) {
    try {
        if (typeof text !== 'string' || !text) {
            if (window.debug) window.debug.error('parseTSV: Invalid input - not a string or empty');
            return [];
        }
        // Remove Byte Order Mark if present
        if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
        
        // Split into lines, removing quotes
        const lines = text.trim().replace(/\"/g, '').split(/\r?\n/);
        
        if (window.debug) window.debug.log(`parseTSV: Found ${lines.length} lines`);
        if (lines.length < 2) {
            if (window.debug) window.debug.error('parseTSV: Not enough lines for header + data');
            return [];
        }
        
        // Process Headers
        const headers = lines[0].split('\t').map(h => h ? h.trim().toLowerCase().replace(/ /g, '_') : '');
        if (!headers.includes('card_name')) throw new Error("Invalid TSV format: missing 'Card Name' header.");
        if (window.debug) window.debug.log(`parseTSV: Headers = ${headers.join(', ')}`);
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i] || lines[i].trim() === '') continue;
            const values = lines[i].split('\t');
            const obj = {};

            // Process Values
            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                if (!key) continue;
                let value = (values[j] || '').trim();

                // 1. Check if the value should be treated as empty/null.
                if (value === '' || value.toLowerCase() === 'n/a' || value === '-') {
                    obj[key] = null;
                    continue; // Go to the next header
                }

                // 2. Handle complex types (Keywords/Traits) - FIX: Use comma (,)
                if (key === 'keywords' || key === 'traits') {
                    obj[key] = value.split(',').map(v => v.trim()).filter(Boolean);
                } 
                // 3. Handle Booleans
                else if (value.toUpperCase() === 'TRUE') {
                    obj[key] = true;
                } else if (value.toUpperCase() === 'FALSE') {
                    obj[key] = false;
                } 
                // 4. Handle Numbers - FIX: Use parseFloat for robustness
                else if (!isNaN(parseFloat(value))) { 
                    obj[key] = Number(value);
                } 
                // 5. Default is String
                else {
                    obj[key] = value;
                }
            }

            // Finalize and push object
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
    if (window.debug) window.debug.log('Starting data load...');

    const cacheBuster = `?t=${Date.now()}`;
    const [cardResponse, keywordResponse] = await Promise.all([
        fetch(`./cardDatabase.txt${cacheBuster}`),
        fetch(`./keywords.txt${cacheBuster}`)
    ]);

    if (!cardResponse.ok) throw new Error(`Failed to fetch cardDatabase.txt (HTTP ${cardResponse.status})`);
    
    const cardText = await cardResponse.text();
    if (!cardText || cardText.trim().length === 0) throw new Error("cardDatabase.txt is empty or could not be loaded.");
    
    if (window.debug) window.debug.log(`Loaded card data: ${cardText.length} bytes`);
    
    const cardData = parseTSV(cardText);
    if (!Array.isArray(cardData) || cardData.length === 0) throw new Error("Parsing cardDatabase.txt resulted in 0 cards.");
    
    if (window.debug) window.debug.log(`Parsed ${cardData.length} cards`);
    
    let keywordObject = {};
    if (keywordResponse.ok) {
        const keywordText = await keywordResponse.text();
        if (keywordText) {
            const keywordData = parseTSV(keywordText);
            keywordObject = Object.fromEntries(
                keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || ''])
            );
            if (window.debug) window.debug.log(`Loaded ${Object.keys(keywordObject).length} keywords`);
        }
    }

    // Set the data in the state module
    setCardDatabase(cardData);
    setKeywordDatabase(keywordObject);
    
    // Build the search index after data is set
    buildSearchIndex();
}

export const loadGameData = withRetry(loadData, 2, 1000);

