// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';
import { debounce } from './utils.js';

function addCardToDeck(cardTitle, deckTarget) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;
    if (deckTarget === 'starting') {
        const currentCount = state.startingDeck.filter(t => t === cardTitle).length;
        if (card.cost === 0 && currentCount >= 2) {
            if (confirm(`You can only have 2 copies of "${cardTitle}" in your Starting Deck. Would you like to add the 3rd copy to your Purchase Deck?`)) {
                state.setPurchaseDeck([...state.purchaseDeck, cardTitle]);
            }
            return;
        }
        state.setStartingDeck([...state.startingDeck, cardTitle]);
    } else {
        state.setPurchaseDeck([...state.purchaseDeck, cardTitle]);
    }
}

export function initializeEventListeners() {
    // Subscribe to state changes
    state.subscribeState('deckChanged', renderer.renderDecks);
    state.subscribeState('personaChanged', renderer.renderPersonaDisplay);

    // Delegated listener for the whole body
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const cardItem = target.closest('[data-title]');
        
        // Card Pool actions
        if (target.closest('#searchResults')) {
            if (cardItem) {
                if (target.matches('[data-deck-target]')) {
                    addCardToDeck(cardItem.dataset.title, target.dataset.deckTarget);
                } else {
                    renderer.showCardModal(cardItem.dataset.title);
                }
            }
        }
        // Deck List actions
        else if (target.closest('.deck-list-small')) {
            if (cardItem && target.matches('[data-action]')) {
                const cardTitle = cardItem.dataset.title;
                const action = target.dataset.action;
                const deckName = target.closest('#startingDeckList') ? 'starting' : 'purchase';
                if (action === 'remove') {
                    const deck = deckName === 'starting' ? state.startingDeck : state.purchaseDeck;
                    const index = deck.lastIndexOf(cardTitle);
                    if (index > -1) {
                        const newDeck = [...deck];
                        newDeck.splice(index, 1);
                        deckName === 'starting' ? state.setStartingDeck(newDeck) : state.setPurchaseDeck(newDeck);
                    }
                } else if (action === 'moveToPurchase') {
                    // Move logic here
                } else if (action === 'moveToStart') {
                    // Move logic here
                }
            } else if (cardItem) {
                renderer.showCardModal(cardItem.dataset.title);
            }
        }
        // Persona actions
        else if (target.closest('#personaDisplay')) {
            if (cardItem) renderer.showCardModal(cardItem.dataset.title);
        }
        // Modal close
        else if (target.matches('.modal-backdrop, .modal-close-button')) {
            renderer.closeAllModals();
        }
        // View mode toggle
        else if (target.id === 'viewModeToggle') {
            const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
            state.setCurrentViewMode(newMode);
            target.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
            document.dispatchEvent(new CustomEvent('filtersChanged'));
        }
        // Grid size controls
        else if (target.matches('#gridSizeControls button')) {
            document.querySelectorAll('#gridSizeControls button').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            state.setNumGridColumns(target.dataset.columns);
            document.dispatchEvent(new CustomEvent('filtersChanged'));
        }
        // Deck Actions
        else if (target.id === 'clearDeck') {
            if (confirm('Are you sure you want to clear the entire deck?')) {
                state.setStartingDeck([]);
                state.setPurchaseDeck([]);
            }
        }
        else if (target.id === 'importDeck') {
            document.getElementById('importModal').classList.add('visible');
        }
        else if (target.id === 'processImportBtn') {
            importer.parseAndLoadDeck(document.getElementById('deckTextInput').value);
        }
        else if (target.id === 'confirmExportBtn') {
            exporter.handleExport(document.getElementById('exportSelect').value);
            target.classList.remove('visible');
            document.getElementById('exportSelect').value = "";
        }
    });

    // Input/Change listeners
    document.addEventListener('filtersChanged', () => renderer.renderCardPool(filters.getFilteredAndSortedCardPool()));
    document.getElementById('searchInput').addEventListener('input', debounce(() => document.dispatchEvent(new CustomEvent('filtersChanged')), 300));
    document.getElementById('sortSelect').addEventListener('change', (e) => { state.setCurrentSort(e.target.value); document.dispatchEvent(new CustomEvent('filtersChanged')); });
    document.getElementById('showZeroCost').addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); document.dispatchEvent(new CustomEvent('filtersChanged')); });
    document.getElementById('showNonZeroCost').addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); document.dispatchEvent(new CustomEvent('filtersChanged')); });
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

