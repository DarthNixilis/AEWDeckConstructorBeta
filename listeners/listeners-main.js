// listeners/listeners-main.js
import { initializePoolListeners } from './listeners-pool.js';
import { initializeDeckListeners } from './listeners-deck.js';
import { initializeModalListeners } from './listeners-modals.js';

export function initializeAllEventListeners(refreshCardPool) {
    initializePoolListeners(refreshCardPool);
    initializeDeckListeners(refreshCardPool);
    initializeModalListeners();
}
