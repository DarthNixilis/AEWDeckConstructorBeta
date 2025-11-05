import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

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
            const rawValue = values[j] || '';
            let value = rawValue.trim();
            if (key) {
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
        }
        if (obj.card_name) {
            obj.title = obj.card_name;
            data.push(obj);
        }
    }
    return data;
}

export async function loadGameData() {
    try {
        const cacheBuster = `?t=${new Date().getTime()}`;
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(`./cardDatabase.txt${cacheBuster}`),
            fetch(`./Keywords.txt${cacheBuster}`)
        ]);
        if (!cardResponse.ok) throw new Error(`Failed to fetch cardDatabase.txt: ${cardResponse.statusText}`);
        if (!keywordResponse.ok) throw new Error(`Failed to fetch Keywords.txt: ${keywordResponse.statusText}`);
        const cardText = await cardResponse.text();
        const keywordText = await keywordResponse.text();
        if (!cardText) throw new Error("cardDatabase.txt is empty.");
        const cardData = parseTSV(cardText);
        const keywordData = parseTSV(keywordText);
        if (!cardData.length) throw new Error("Parsing cardDatabase.txt resulted in an empty array.");
        setCardDatabase(cardData);
        const keywordObject = keywordData.reduce((acc, kw) => {
            if (kw.keyword) acc[kw.keyword] = kw.description;
            return acc;
        }, {});
        setKeywordDatabase(keywordObject);
        initializeApp();
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        document.body.innerHTML = `<div style="padding:20px;"><h2>Application Failed to Load</h2><p><strong>Error:</strong> ${error.message}</p></div>`;
    }
}

