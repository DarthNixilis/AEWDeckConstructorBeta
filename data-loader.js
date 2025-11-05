// data-loader.js
import { setCardDatabase, setKeywordDatabase, buildSearchIndex } from './state.js';
import { initializeApp } from './app-init.js';
import { showFatalError, withRetry } from './utils.js';
import debug from './debug-manager.js';

function parseTSV(text) { /* ... same as before ... */ }

async function loadData() {
    try {
        debug.startTimer('Total Data Loading');
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-size: 1.2em;">Loading AEW Deck Constructor...</div>';

        const cacheBuster = `?t=${Date.now()}`;
        debug.log('Fetching data files...');
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(`./cardDatabase.txt${cacheBuster}`).then(r => {
                if (!r.ok) throw new Error(`Failed to fetch cardDatabase.txt (HTTP ${r.status})`);
                return r.text();
            }),
            fetch(`./Keywords.txt${cacheBuster}`).then(r => r.ok ? r.text() : null)
        ]);

        if (!cardResponse || cardResponse.trim().length === 0) throw new Error("cardDatabase.txt is empty or could not be loaded.");
        debug.log('Data files fetched.');

        debug.startTimer('Parsing Data');
        const cardData = parseTSV(cardResponse);
        if (!cardData.length) throw new Error("Parsing cardDatabase.txt resulted in 0 cards. Check TSV format.");
        debug.log(`Parsed ${cardData.length} cards.`);
        
        let keywordObject = {};
        if (keywordResponse) {
            const keywordData = parseTSV(keywordResponse);
            keywordObject = Object.fromEntries(keywordData.filter(kw => kw.keyword).map(kw => [kw.keyword, kw.description || '']));
            debug.log(`Parsed ${Object.keys(keywordObject).length} keywords.`);
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
        throw error; // Re-throw for withRetry and final catch
    }
}

export const loadGameData = withRetry(loadData, 2, 1000);

