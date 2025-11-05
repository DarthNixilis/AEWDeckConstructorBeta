// data-loader.js
import { showFatalError, withRetry } from './utils.js';
import debug from './debug-manager.js';

// --- CACHE BUSTING (This part is correct and stays) ---
const timestamp = Date.now();
const { setCardDatabase, setKeywordDatabase, buildSearchIndex } = await import(`./state.js?v=${timestamp}`);
const { initializeApp } = await import(`./app-init.js?v=${timestamp}`);

function parseTSV(text) {
    // --- PARSER FIX 1: Ensure it never returns undefined ---
    try {
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
    } catch (error) {
        debug.error('Error inside parseTSV', error);
        return []; // Always return an empty array on failure
    }
}

async function loadData() {
    try {
        debug.startTimer('Total Data Loading');
        document.body.innerHTML = '<div id="loading-message" style="padding: 20px; text-align: center; font-size: 1.2em;">Loading AEW Deck Constructor...</div>';

        const cacheBuster = `?t=${Date.now()}`;
        debug.log('Fetching data files...');
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(`./cardDatabase.txt${cacheBuster}`),
            fetch(`./Keywords.txt${cacheBuster}`)
        ]);

        if (!cardResponse.ok) throw new Error(`Failed to fetch cardDatabase.txt (HTTP ${cardResponse.status})`);
        const cardText = await cardResponse.text();
        if (!cardText || cardText.trim().length === 0) throw new Error("cardDatabase.txt is empty or could not be loaded.");
        
        debug.log('Data files fetched.');
        debug.startTimer('Parsing Data');
        const cardData = parseTSV(cardText);
        
        // --- PARSER FIX 2: More robust check ---
        if (!Array.isArray(cardData) || cardData.length === 0) {
            throw new Error("Parsing cardDatabase.txt resulted in 0 cards. Check the file's TSV format and content.");
        }
        debug.log(`Parsed ${cardData.length} cards.`);
        
        let keywordObject = {};
        if (keywordResponse.ok) {
            const keywordText = await keywordResponse.text();
            if (keywordText) {
                const keywordData = parseTSV(keywordText);
                keywordObject = Object.fromEntries(keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || '']));
                debug.log(`Parsed ${Object.keys(keywordObject).length} keywords.`);
            }
        }
        debug.endTimer('Parsing Data');

        debug.startTimer('Updating State');
        setCardDatabase(cardData);
        setKeywordDatabase(keywordObject);
        debug.endTimer('Updating State');

        debug.startTimer('Building Search Index');
        buildSearchIndex();
        debug.endTimer('Building Search Index');

        debug.startTimer('Initializing App');
        initializeApp();
        debug.endTimer('Initializing App');

        debug.endTimer('Total Data Loading');
        debug.captureStateSnapshot('Application Ready');

    } catch (error) {
        debug.error('Data loading failed', error);
        throw error;
    }
}

export const loadGameData = withRetry(loadData, 2, 1000);

