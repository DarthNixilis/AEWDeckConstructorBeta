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
        state.setStartingDeck([...state.startingDeck, cardTitle]);
    } else {
        state.setPurchaseDeck([...state.purchaseDeck, cardTitle]);
    }
    renderDecks();
}

export function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const cardIndex = deck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        const newDeck = [...deck];
        newDeck.splice(cardIndex, 1);
        if (deckName === 'starting') {
            state.setStartingDeck(newDeck);
        } else {
            state.setPurchaseDeck(newDeck);
        }
        renderDecks();
    }
}

export function moveCard(cardTitle, sourceDeckName) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;

    const sourceDeck = sourceDeckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const destinationDeckName = sourceDeckName === 'starting' ? 'purchase' : 'starting';
    const destinationDeck = destinationDeckName === 'starting' ? state.startingDeck : state.purchaseDeck;

    if (destinationDeckName === 'starting') {
        if (card.cost !== 0) { alert(`Rule Violation: Cannot move "${card.title}" to Starting Deck because its cost is not 0.`); return; }
        if (destinationDeck.length >= 24) { alert(`Rule Violation: Starting Deck is full (24 cards).`); return; }
        if (destinationDeck.filter(title => title === cardTitle).length >= 2) { alert(`Rule Violation: Max 2 copies of "${card.title}" allowed in Starting Deck.`); return; }
    }

    const cardIndex = sourceDeck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        const newSourceDeck = [...sourceDeck];
        newSourceDeck.splice(cardIndex, 1);
        const newDestinationDeck = [...destinationDeck, cardTitle];

        if (sourceDeckName === 'starting') {
            state.setStartingDeck(newSourceDeck);
            state.setPurchaseDeck(newDestinationDeck);
        } else {
            state.setPurchaseDeck(newSourceDeck);
            state.setStartingDeck(newDestinationDeck);
        }
        renderDecks();
    }
}

// NEW: DeckValidator Class
export class DeckValidator {
    static validateStartingDeck(deck) {
        const issues = [];
        if (deck.length !== 24) {
            issues.push(`Starting Deck must have 24 cards (is ${deck.length})`);
        }

        const nonZeroCost = deck.filter(title => {
            const card = state.cardTitleCache[title];
            return card && card.cost !== 0;
        });
        if (nonZeroCost.length > 0) {
            issues.push(`Found ${nonZeroCost.length} non-zero cost card(s) in Starting Deck.`);
        }

        const counts = deck.reduce((acc, card) => { acc[card] = (acc[card] || 0) + 1; return acc; }, {});
        Object.entries(counts).forEach(([card, count]) => {
            if (count > 2) {
                issues.push(`Too many "${card}" in Starting Deck (${count}/2).`);
            }
        });
        return issues;
    }

    static validateTotalComposition(startingDeck, purchaseDeck) {
        const issues = [];
        const allCards = [...startingDeck, ...purchaseDeck];
        const counts = allCards.reduce((acc, card) => { acc[card] = (acc[card] || 0) + 1; return acc; }, {});

        Object.entries(counts).forEach(([card, count]) => {
            if (count > 3) {
                issues.push(`Too many copies of "${card}" in total (${count}/3).`);
            }
        });
        return issues;
    }

    static getDeckStats() {
        const allCards = [...state.startingDeck, ...state.purchaseDeck]
            .map(title => state.cardTitleCache[title])
            .filter(Boolean); // Filter out any undefined cards

        const totalCards = allCards.length;
        if (totalCards === 0) {
            return { totalCards: 0, averageCost: 0, cardTypes: {}, costCurve: {} };
        }

        const stats = {
            totalCards: totalCards,
            averageCost: allCards.reduce((sum, card) => sum + (card.cost || 0), 0) / totalCards,
            cardTypes: allCards.reduce((acc, card) => {
                const type = card.card_type || 'Unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
            costCurve: allCards.reduce((acc, card) => {
                const cost = card.cost ?? 0;
                acc[cost] = (acc[cost] || 0) + 1;
                return acc;
            }, {})
        };
        // Ensure all costs from 0 to max are present for the curve
        const maxCost = Math.max(...Object.keys(stats.costCurve).map(Number));
        for (let i = 0; i <= maxCost; i++) {
            if (!stats.costCurve[i]) {
                stats.costCurve[i] = 0;
            }
        }
        return stats;
    }
}

// UPDATED: validateDeck function now uses the class
export function validateDeck() {
    const issues = [
        ...DeckValidator.validateStartingDeck(state.startingDeck),
        ...DeckValidator.validateTotalComposition(state.startingDeck, state.purchaseDeck)
    ];

    if (state.purchaseDeck.length < 36) {
        issues.push(`Purchase Deck needs at least 36 cards (is ${state.purchaseDeck.length})`);
    }

    return [...new Set(issues)]; // Return unique issues
}

