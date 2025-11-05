// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';
import { debounce } from './utils.js';

// --- Deck Management Logic (Moved here for clarity from the old deck-manager.js) ---
function addCardToDeck(cardTitle, deckTarget) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;

    if (deckTarget === 'starting') {
        const currentCount = state.startingDeck.filter(t => t === cardTitle).length;
        if (card.cost === 0 && currentCount >= 2) {
            if (confirm(`You can only have 2 copies of "${cardTitle}" in your Starting Deck. Add the 3rd copy to your Purchase Deck?`)) {
                state.setPurchaseDeck([...state.purchaseDeck, cardTitle]);
            }
            return;
        }
        state.setStartingDeck([...state.startingDeck, cardTitle]);
    } else {
        state.setPurchaseDeck([...state.purchaseDeck, cardTitle]);
    }
}

function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const index = deck.lastIndexOf(cardTitle);
    if (index > -1) {
        const newDeck = [...deck];
        newDeck.splice(index, 1);
        deckName === 'starting' ? state.setStartingDeck(newDeck) : state.setPurchaseDeck(newDeck);
    }
}

function moveCard(cardTitle, fromDeck, toDeck) {
    const from = fromDeck === 'starting' ? state.startingDeck : state.purchaseDeck;
    const to = toDeck === 'starting' ? state.startingDeck : state.purchaseDeck;
    
    const index = from.lastIndexOf(cardTitle);
    if (index > -1) {
        const newFrom = [...from];
        newFrom.splice(index, 1);
        const newTo = [...to, cardTitle];
        
        fromDeck === 'starting' ? state.setStartingDeck(newFrom) : state.setPurchaseDeck(newFrom);
        toDeck === 'starting' ? state.setStartingDeck(newTo) : state.setPurchaseDeck(newTo);
    }
}


// --- Main Event Listener Initialization ---
export function initializeEventListeners() {
    // Subscribe to state changes for automatic UI updates
    state.subscribeState('deckChanged', renderer.renderDecks);
    state.subscribeState('personaChanged', renderer.renderPersonaDisplay);

    // --- A SINGLE, ROBUST CLICK HANDLER FOR THE ENTIRE PAGE ---
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const cardItem = target.closest('[data-title]');

        // --- FIX: Check for button clicks FIRST ---
        // This is the most specific action, so it should be checked first.
        if (target.matches('[data-deck-target]')) {
            const title = target.closest('[data-title]').dataset.title;
            addCardToDeck(title, target.dataset.deckTarget);
            return; // Stop further processing
        }
        if (target.matches('[data-action]')) {
            const title = target.closest('[data-title]').dataset.title;
            const action = target.dataset.action;
            if (action === 'remove') {
                const deckName = target.closest('#startingDeckList') ? 'starting' : 'purchase';
                removeCardFromDeck(title, deckName);
            } else if (action === 'moveToPurchase') {
                moveCard(title, 'starting', 'purchase');
            } else if (action === 'moveToStart') {
                moveCard(title, 'purchase', 'starting');
            }
            return; // Stop further processing
        }

        // --- If it wasn't a button, check if it was a clickable item ---
        if (cardItem) {
            renderer.showCardModal(cardItem.dataset.title);
            return;
        }

        // --- Handle other specific element clicks ---
        const handlers = {
            'viewModeToggle': () => {
                const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
                state.setCurrentViewMode(newMode);
                target.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
                document.dispatchEvent(new CustomEvent('filtersChanged'));
            },
            'clearDeck': () => {
                if (confirm('Are you sure you want to clear the entire deck?')) {
                    state.setStartingDeck([]);
                    state.setPurchaseDeck([]);
                }
            },
            'importDeck': () => document.getElementById('importModal').classList.add('visible'),
            'processImportBtn': () => importer.parseAndLoadDeck(document.getElementById('deckTextInput').value),
            'confirmExportBtn': () => {
                exporter.handleExport(document.getElementById('exportSelect').value);
                target.classList.remove('visible');
                document.getElementById('exportSelect').value = "";
            }
        };
        if (handlers[target.id]) {
            handlers[target.id]();
            return;
        }
        
        // Grid size buttons
        if (target.matches('#gridSizeControls button')) {
            document.querySelectorAll('#gridSizeControls button').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            state.setNumGridColumns(target.dataset.columns);
            document.dispatchEvent(new CustomEvent('filtersChanged'));
            return;
        }

        // Modal close buttons
        if (target.matches('.modal-backdrop, .modal-close-button')) {
            renderer.closeAllModals();
            return;
        }
    });

    // --- Non-click event listeners ---
    const refresh = () => renderer.renderCardPool(filters.getFilteredAndSortedCardPool());
    document.addEventListener('filtersChanged', refresh);
    document.getElementById('searchInput').addEventListener('input', debounce(refresh, 300));
    document.getElementById('sortSelect').addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refresh(); });
    document.getElementById('showZeroCost').addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refresh(); });
    document.getElementById('showNonZeroCost').addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refresh(); });
    document.getElementById('wrestlerSelect').addEventListener('change', (e) => state.setSelectedWrestler(state.cardTitleCache[e.target.value] || null));
    document.getElementById('managerSelect').addEventListener('change', (e) => state.setSelectedManager(state.cardTitleCache[e.target.value] || null));
    
    document.getElementById('exportSelect').addEventListener('change', (e) => {
        const btn = document.getElementById('confirmExportBtn');
        if (e.target.value) {
            btn.querySelector('span').textContent = `Export as ${e.target.options[e.target.selectedIndex].text}`;
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    document.getElementById('deckFileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => importer.parseAndLoadDeck(event.target.result);
            reader.readAsText(file);
        }
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') renderer.closeAllModals(); });
}

