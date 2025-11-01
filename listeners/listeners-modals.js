// listeners/listeners-modals.js
import * as state from './config.js'; // CORRECTED PATH
import { parseAndLoadDeck } from './import-export/deck-importer.js'; // CORRECTED PATH

export function initializeModalListeners() {
    const importDeckBtn = document.getElementById('importDeck');
    const importModal = document.getElementById('importModal');
    const importModalCloseBtn = importModal.querySelector('.modal-close-button');
    const deckFileInput = document.getElementById('deckFileInput');
    const deckTextInput = document.getElementById('deckTextInput');
    const processImportBtn = document.getElementById('processImportBtn');
    const cardModal = document.getElementById('cardModal');
    const modalCloseButton = cardModal.querySelector('.modal-close-button');

    importDeckBtn.addEventListener('click', () => {
        importModal.style.display = 'flex';
        document.getElementById('importStatus').textContent = '';
        deckTextInput.value = '';
        deckFileInput.value = '';
    });

    importModalCloseBtn.addEventListener('click', () => importModal.style.display = 'none');

    processImportBtn.addEventListener('click', () => {
        if (deckTextInput.value) {
            parseAndLoadDeck(deckTextInput.value);
        }
    });

    deckFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                parseAndLoadDeck(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    modalCloseButton.addEventListener('click', () => cardModal.style.display = 'none');

    cardModal.addEventListener('click', (e) => {
        if (e.target === cardModal) cardModal.style.display = 'none';
    });

    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) importModal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cardModal.style.display = 'none';
            importModal.style.display = 'none';
            if (state.lastFocusedElement) {
                state.lastFocusedElement.focus();
            }
        }
    });
}

