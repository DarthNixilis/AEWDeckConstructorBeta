// data-loader.js
import { showFatalError, withRetry } from './utils.js';
import debug from './debug-manager.js';

function parseTSV(text) {
    // ... (The robust parser is correct and stays the same)
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
        return [];
    }
}

async function loadData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    const timestamp = Date.now();
    const { setCardDatabase, setKeywordDatabase, buildSearchIndex } = await import(`./state.js?v=${timestamp}`);
    const { initializeApp } = await import(`./app-init.js?v=${timestamp}`);

    const cacheBuster = `?t=${Date.now()}`;
    const [cardResponse, keywordResponse] = await Promise.all([
        fetch(`./cardDatabase.txt${cacheBuster}`),
        fetch(`./Keywords.txt${cacheBuster}`)
    ]);

    if (!cardResponse.ok) throw new Error(`Failed to fetch cardDatabase.txt (HTTP ${cardResponse.status})`);
    const cardText = await cardResponse.text();
    if (!cardText || cardText.trim().length === 0) throw new Error("cardDatabase.txt is empty or could not be loaded.");
    
    const cardData = parseTSV(cardText);
    if (!Array.isArray(cardData) || cardData.length === 0) {
        throw new Error("Parsing cardDatabase.txt resulted in 0 cards.");
    }
    
    let keywordObject = {};
    if (keywordResponse.ok) {
        const keywordText = await keywordResponse.text();
        if (keywordText) {
            const keywordData = parseTSV(keywordText);
            keywordObject = Object.fromEntries(keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || '']));
        }
    }

    setCardDatabase(cardData);
    setKeywordDatabase(keywordObject);
    buildSearchIndex();
    initializeApp();
}

export const loadGameData = withRetry(loadData, 2, 1000);

