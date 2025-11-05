// data-loader.js
import { setCardDatabase, setKeywordDatabase, buildSearchIndex } from './state.js';
import { initializeApp } from './app-init.js';
import { showFatalError, withRetry, logToScreen } from './utils.js';

// ... (parseTSV function remains the same)
function parseTSV(text) {
    if (typeof text !== 'string' || !text) return [];
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
    const lines = text.trim().replace(/"/g, '').split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split('\t').map(h => h ? h.trim().toLowerCase().replace(/ /g, '_') : '');
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
}


async function loadData() {
    try {
        logToScreen('loadData: Starting...');
        const cacheBuster = `?t=${Date.now()}`;
        
        logToScreen('loadData: Fetching cardDatabase.txt...');
        const cardResponse = await fetch(`./cardDatabase.txt${cacheBuster}`);
        if (!cardResponse.ok) throw new Error(`Failed to fetch cardDatabase.txt (HTTP ${cardResponse.status})`);
        const cardText = await cardResponse.text();
        logToScreen(`loadData: Fetched cardDatabase.txt (${cardText.length} bytes).`);

        logToScreen('loadData: Parsing card data...');
        const cardData = parseTSV(cardText);
        if (!cardData.length) throw new Error("Parsing cardDatabase.txt resulted in 0 cards.");
        logToScreen(`loadData: Parsed ${cardData.length} cards.`);
        setCardDatabase(cardData);

        logToScreen('loadData: Fetching keywords.txt...');
        const keywordResponse = await fetch(`./keywords.txt${cacheBuster}`);
        if (keywordResponse.ok) {
            const keywordText = await keywordResponse.text();
            logToScreen(`loadData: Fetched keywords.txt (${keywordText.length} bytes).`);
            const keywordData = parseTSV(keywordText);
            const keywordObject = Object.fromEntries(
                keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || ''])
            );
            setKeywordDatabase(keywordObject);
            logToScreen(`loadData: Parsed ${Object.keys(keywordObject).length} keywords.`);
        } else {
            logToScreen('loadData: keywords.txt not found or failed to load. Continuing without it.', true);
        }

        logToScreen('loadData: Building search index...');
        buildSearchIndex();
        logToScreen('loadData: Search index built.');

        logToScreen('loadData: Handing off to initializeApp...');
        initializeApp();
    } catch (error) {
        logToScreen(`loadData: CRITICAL FAILURE - ${error.message}`, true);
        throw error; // Re-throw to let withRetry handle it
    }
}

export const loadGameData = withRetry(loadData, 2, 500); // Faster retry for debugging

