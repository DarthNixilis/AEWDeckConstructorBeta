// importer.js
import * as state from './state.js';

export function parseAndLoadDeck(text) {
    if (!text) return;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const newStarting = [];
    const newPurchase = [];
    let currentDeck = 'starting';

    lines.forEach(line => {
        if (line.toLowerCase().includes('purchase deck')) {
            currentDeck = 'purchase';
            return;
        }
        if (line.toLowerCase().includes('starting deck')) {
            currentDeck = 'starting';
            return;
        }
        const match = line.match(/(\d+)x?\s+(.*)/);
        if (match) {
            const count = parseInt(match[1], 10);
            const title = match[2].trim();
            if (state.cardTitleCache[title]) {
                for (let i = 0; i < count; i++) {
                    currentDeck === 'starting' ? newStarting.push(title) : newPurchase.push(title);
                }
            }
        }
    });
    state.setStartingDeck(newStarting);
    state.setPurchaseDeck(newPurchase);
    document.getElementById('importModal').classList.remove('visible');
}

