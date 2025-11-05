// data-loader.js
import { setCardDatabase, setKeywordDatabase, buildSearchIndex } from './state.js';
import { withRetry } from './utils.js';

function parseTSV(text) {
    try {
        if (typeof text !== 'string' || !text) {
            if (window.debug) window.debug.error('parseTSV: Invalid input - not a string or empty');
            return [];
        }
        if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
        const lines = text.trim().replace(/"/g, '').split(/\r?\n/);
        if (window.debug) window.debug.log(`parseTSV: Found ${lines.length} lines`);
        if (lines.length < 2) {
            if (window.debug) window.debug.error('parseTSV: Not enough lines for header + data');
            return [];
        }
        const headers = lines[0].split('\t').map(h => h ? h.trim().toLowerCase().replace(/ /g, '_') : '');
        if (window.debug) window.debug.log(`parseTSV: Headers = ${headers.join(', ')}`);
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i] || lines[i].trim() === '') continue;
            const values = lines[i].split('\t');
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                if (!key) continue;
                const rawValue = values[j] || '';
                let value = rawValue.trim();
                if (key !== 'card_name' && key !== 'card_raw_game_text' && !isNaN(value) && value !== '') {
                    value = Number(value);
                } else if (value.toUpperCase() === 'TRUE') {
                    value = true;
                } else if (value.toUpperCase() === 'FALSE') {
                    value = false;
                } else if (key === 'traits' || key === 'keywords') {
                    value = value ? value.split('|').map(t => t.trim()).filter(Boolean) : [];
                }
                obj[key] = value;
            }
            if (obj.card_name) {
                obj.title = obj.card_name;
                data.push(obj);
            }
        }
        return data;
    } catch (error) {
        if (window.debug) window.debug.error('Error in parseTSV', error);
        return [];
    }
}

async function loadData() {
    if (window.debug) window.debug.log('Starting data load...');
    
    const cacheBuster = `?t=${Date.now()}`;
    const [cardResponse, keywordResponse] = await Promise.all([
        fetch(`./cardDatabase.txt${cacheBuster}`),
        fetch(`./Keywords.txt${cacheBuster}`)
    ]);

    if (!cardResponse.ok) throw new Error(`Failed to fetch cardDatabase.txt (HTTP ${cardResponse.status})`);
    
    const cardText = await cardResponse.text();
    if (!cardText || cardText.trim().length === 0) throw new Error("cardDatabase.txt is empty or could not be loaded.");
    
    if (window.debug) window.debug.log(`Loaded card data: ${cardText.length} bytes, first 200 chars: ${cardText.substring(0, 200)}`);
    
    const cardData = parseTSV(cardText);
    if (!Array.isArray(cardData) || cardData.length === 0) throw new Error("Parsing cardDatabase.txt resulted in 0 cards.");
    
    if (window.debug) window.debug.log(`Parsed ${cardData.length} cards: ${cardData.slice(0, 3).map(c => c.title).join(', ')}...`);
    
    let keywordObject = {};
    if (keywordResponse.ok) {
        const keywordText = await keywordResponse.text();
        if (keywordText) {
            const keywordData = parseTSV(keywordText);
            keywordObject = Object.fromEntries(keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || '']));
            if (window.debug) window.debug.log(`Loaded ${Object.keys(keywordObject).length} keywords`);
        }
    }

    // Set the data in the state module
    setCardDatabase(cardData);
    setKeywordDatabase(keywordObject);
    
    // Build the search index after data is set
    buildSearchIndex();

    // DON'T return anything - the state is now set globally
    if (window.debug) window.debug.log('Data loading completed successfully');
}

export const loadGameData = withRetry(loadData, 2, 1000);

