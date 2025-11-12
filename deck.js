// deck.js

import * as state from './config.js';
import { renderDecks } from './ui.js';

export function addCardToDeck(cardTitle, targetDeck) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;
    if (state.isKitCard(card)) {
        alert(`"${card.title}" is a Kit card and cannot be added to your deck during construction.`);
        return;
    }
    const totalCount = (state.startingDeck.filter(title => title === cardTitle).length) + (state.purchaseDeck.filter(title => title === cardTitle).length);
    if (totalCount >= 3) {
        alert(`Rule Violation: Max 3 copies of "${card.title}" allowed in total.`);
        return;
    }
    if (targetDeck === 'starting') {
        if (card.cost !== 0) { alert(`Rule Violation: Only 0-cost cards allowed in Starting Deck.`); return; }
        if (state.startingDeck.length >= 24) { alert(`Rule Violation: Starting Deck is full (24 cards).`); return; }
        if (state.startingDeck.filter(title => title === cardTitle).length >= 2) { alert(`Rule Violation: Max 2 copies of "${card.title}" allowed in Starting Deck.`); return; }
        state.startingDeck.push(cardTitle);
    } else {
        state.purchaseDeck.push(cardTitle);
    }
    renderDecks();
}

export function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const cardIndex = deck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        deck.splice(cardIndex, 1);
        renderDecks();
    }
}

// NEW: Function to move a card between decks
export function moveCard(cardTitle, sourceDeckName) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;

    const sourceDeck = sourceDeckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const destinationDeckName = sourceDeckName === 'starting' ? 'purchase' : 'starting';
    const destinationDeck = destinationDeckName === 'starting' ? state.startingDeck : state.purchaseDeck;

    // Rule checks for the destination
    if (destinationDeckName === 'starting') {
        if (card.cost !== 0) {
            alert(`Rule Violation: Cannot move "${card.title}" to Starting Deck because its cost is not 0.`);
            return;
        }
        if (destinationDeck.length >= 24) {
            alert(`Rule Violation: Starting Deck is full (24 cards).`);
            return;
        }
        if (destinationDeck.filter(title => title === cardTitle).length >= 2) {
            alert(`Rule Violation: Max 2 copies of "${card.title}" allowed in Starting Deck.`);
            return;
        }
    }

    // Find and remove from source
    const cardIndex = sourceDeck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        sourceDeck.splice(cardIndex, 1);
        // Add to destination
        destinationDeck.push(cardTitle);
        renderDecks();
    }
}


export function validateDeck() {
    const issues = [];
    
    if (state.startingDeck.length !== 24) {
        issues.push(`Starting Deck must have exactly 24 cards (currently ${state.startingDeck.length}).`);
    }
    
    if (state.purchaseDeck.length < 36) {
        issues.push(`Purchase Deck must have at least 36 cards (currently ${state.purchaseDeck.length}).`);
    }
    
    const startingDeckCounts = state.startingDeck.reduce((acc, card) => {
        acc[card] = (acc[card] || 0) + 1;
        return acc;
    }, {});
    Object.entries(startingDeckCounts).forEach(([card, count]) => {
        if (count > 2) {
            issues.push(`Too many copies of "${card}" in Starting Deck (${count}/2).`);
        }
    });

    const allCards = [...state.startingDeck, ...state.purchaseDeck];
    const totalCounts = allCards.reduce((acc, card) => {
        acc[card] = (acc[card] || 0) + 1;
        return acc;
    }, {});
    Object.entries(totalCounts).forEach(([card, count]) => {
        if (count > 3) {
            issues.push(`Too many copies of "${card}" in total deck (${count}/3).`);
        }
    });

    const nonZeroInStarting = state.startingDeck.some(title => {
        const card = state.cardTitleCache[title];
        return card && card.cost !== 0;
    });
    if (nonZeroInStarting) {
        issues.push("Found non-zero cost cards in the Starting Deck.");
    }

    return issues;
}

