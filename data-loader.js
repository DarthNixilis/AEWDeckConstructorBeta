// data-loader.js
import { setCardDatabase, setKeywordDatabase, buildSearchIndex } from './state.js';
import { withRetry } from './utils.js';

// parseTSV function remains the same...
function parseTSV(text) { /* ... */ }

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
    
    const cardData = parseTSV(cardText);
    if (!Array.isArray(cardData) || cardData.length === 0) throw new Error("Parsing cardDatabase.txt resulted in 0 cards.");
    
    let keywordObject = {};
    if (keywordResponse.ok) {
        const keywordText = await keywordResponse.text();
        if (keywordText) {
            const keywordData = parseTSV(keywordText);
            keywordObject = Object.fromEntries(keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || '']));
        }
    }

    // Set the data in the state module
    setCardDatabase(cardData);
    setKeywordDatabase(keywordObject);
    
    // Build the search index after data is set
    buildSearchIndex();

    // Return the loaded data for the next step in the chain
    return { cardData, keywordObject };
}

export const loadGameData = withRetry(loadData, 2, 1000);

