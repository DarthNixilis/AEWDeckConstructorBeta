// state.js
import { CACHE_KEY } from './utils.js';
// ... (state variables) ...
export const searchIndex = new Map();

// ... (setters for state variables) ...

export function buildSearchIndex() {
    searchIndex.clear();
    cardDatabase.forEach((card) => {
        if (!card || !card.title) return;
        const searchableText = `${card.title} ${card.card_raw_game_text || ''} ${card.type || ''} ${card.traits?.join(' ') || ''} ${card.keywords?.join(' ') || ''}`.toLowerCase();
        const words = new Set(searchableText.match(/[\w'-]+/g) || []);
        words.forEach(word => {
            if (word.length < 2) return;
            if (!searchIndex.has(word)) searchIndex.set(word, new Set());
            searchIndex.get(word).add(card.title);
        });
    });
}

// ... (saveStateToCache, loadStateFromCache, state observer pattern) ...

