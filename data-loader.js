// data-loader.js
import { setCardDatabase, setKeywordDatabase, buildSearchIndex } from './state.js';
import { initializeApp } from './app-init.js';
import { showFatalError, withRetry } from './utils.js';

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
    const cacheBuster = `?t=${Date.now()}`;
    const [cardResponse, keywordResponse] = await Promise.all([
        fetch(`./cardDatabase.txt${cacheBuster}`).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch cardDatabase.txt (HTTP ${r.status})`);
            return r.text();
        }),
        fetch(`./Keywords.txt${cacheBuster}`).then(r => r.ok ? r.text() : null)
    ]);

    if (!cardResponse) throw new Error("cardDatabase.txt could not be loaded. The file might be missing or blocked.");

    const cardData = parseTSV(cardResponse);
    if (!cardData.length) throw new Error("Card data is empty or invalid. Check the TSV format of cardDatabase.txt.");

    setCardDatabase(cardData);
    
    if (keywordResponse) {
        const keywordData = parseTSV(keywordResponse);
        const keywordObject = Object.fromEntries(
            keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || ''])
        );
        setKeywordDatabase(keywordObject);
    }

    buildSearchIndex(); // Build the search index after data is loaded
    initializeApp();
}

export const loadGameData = withRetry(loadData).catch(showFatalError);

