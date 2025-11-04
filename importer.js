// importer.js
import * as state from './state.js';
import { renderDecks } from './ui-renderer.js';
import { renderPersonaDisplay } from './ui-renderer.js';
import { closeAllModals } from './ui-modal.js';

export function parseAndLoadDeck(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const statusEl = document.getElementById('importStatus');
    statusEl.textContent = 'Processing...';

    let newWrestler = null;
    let newManager = null;
    const newStartingDeck = [];
    const newPurchaseDeck = [];

    let currentSection = '';

    lines.forEach(line => {
        if (line.toLowerCase().startsWith('wrestler:')) {
            const wrestlerName = line.substring(9).trim();
            const wrestlerCard = state.cardTitleCache[wrestlerName];
            if (wrestlerCard) newWrestler = wrestlerCard;
        } else if (line.toLowerCase().startsWith('manager:')) {
            const managerName = line.substring(8).trim();
            const managerCard = state.cardTitleCache[managerName];
            if (managerCard) newManager = managerCard;
        } else if (line.includes('--- Starting Deck')) {
            currentSection = 'starting';
        } else if (line.includes('--- Purchase Deck')) {
            currentSection = 'purchase';
        } else {
            const match = line.match(/^(\d)x\s+(.+)/);
            if (match) {
                const count = parseInt(match[1], 10);
                const cardTitle = match[2].trim();
                if (state.cardTitleCache[cardTitle]) {
                    for (let i = 0; i < count; i++) {
                        if (currentSection === 'starting') {
                            newStartingDeck.push(cardTitle);
                        } else if (currentSection === 'purchase') {
                            newPurchaseDeck.push(cardTitle);
                        }
                    }
                }
            }
        }
    });

    // Update state
    state.setSelectedWrestler(newWrestler);
    state.setSelectedManager(newManager);
    state.setStartingDeck(newStartingDeck);
    state.setPurchaseDeck(newPurchaseDeck);

    // Update UI
    document.getElementById('wrestlerSelect').value = newWrestler ? newWrestler.title : '';
    document.getElementById('managerSelect').value = newManager ? newManager.title : '';
    renderPersonaDisplay();
    renderDecks();

    statusEl.textContent = 'Import successful!';
    setTimeout(() => {
        closeAllModals();
    }, 1000);
}

