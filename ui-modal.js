// ui-modal.js
import * as state from './state.js';
import { generateCardVisualHTML } from './card-renderer.js';

const cardModal = document.getElementById('cardModal');
const modalCardContent = document.getElementById('modalCardContent');
const importModal = document.getElementById('importModal');

export function showCardModal(cardTitle) {
    state.setLastFocusedElement(document.activeElement);
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;
    modalCardContent.innerHTML = generateCardVisualHTML(card);
    cardModal.style.display = 'flex';
}

export function showImportModal() {
    importModal.style.display = 'flex';
    document.getElementById('importStatus').textContent = '';
    document.getElementById('deckTextInput').value = '';
    document.getElementById('deckFileInput').value = '';
}

export function closeAllModals() {
    cardModal.style.display = 'none';
    importModal.style.display = 'none';
    if (state.lastFocusedElement) {
        state.lastFocusedElement.focus();
    }
}
