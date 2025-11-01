// listeners/listeners-deck.js
import * as state from './config.js'; // CORRECTED PATH
import * as ui from './ui.js'; // CORRECTED PATH
import * as deck from './deck.js'; // CORRECTED PATH
import { generatePlainTextDeck, exportDeckAsImage } from './import-export/deck-exporter.js'; // CORRECTED PATH

export function initializeDeckListeners(refreshCardPool) {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const personaDisplay = document.getElementById('personaDisplay');
    const clearDeckBtn = document.getElementById('clearDeck');
    const exportDeckBtn = document.getElementById('exportDeck');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');

    wrestlerSelect.addEventListener('change', (e) => {
        const newWrestler = state.cardTitleCache[e.target.value] || null;
        state.setSelectedWrestler(newWrestler);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    managerSelect.addEventListener('change', (e) => {
        const newManager = state.cardTitleCache[e.target.value] || null;
        state.setSelectedManager(newManager);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    [startingDeckList, purchaseDeckList, personaDisplay].forEach(container => {
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
            if (!cardTitle) return;
            if (target.tagName === 'BUTTON' && target.dataset.deck) {
                deck.removeCardFromDeck(cardTitle, target.dataset.deck);
            } else {
                ui.showCardModal(cardTitle);
            }
        });
    });

    clearDeckBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire deck?')) {
            state.setStartingDeck([]);
            state.setPurchaseDeck([]);
            ui.renderDecks();
        }
    });

    exportDeckBtn.addEventListener('click', () => {
        const text = generatePlainTextDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const wrestlerName = state.selectedWrestler ? state.toPascalCase(state.selectedWrestler.title) : "Deck";
        a.download = `${wrestlerName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    exportAsImageBtn.addEventListener('click', exportDeckAsImage);
}

