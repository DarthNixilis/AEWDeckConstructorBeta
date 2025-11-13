// deck.js

import { appState, updateAppState } from './config.js';
import { renderDecks } from './ui.js';

export function addCardToDeck(cardTitle, targetDeck) {
    const card = appState.cardTitleCache[cardTitle];
    if (!card) return;
    if (isKitCard(card)) {
        alert(`"${card.title}" is a Kit card and cannot be added to your deck during construction.`);
        return;
    }
    const totalCount = (appState.deck.starting.filter(title => title === cardTitle).length) + (appState.deck.purchase.filter(title => title === cardTitle).length);
    if (totalCount >= 3) {
        alert(`Rule Violation: Max 3 copies of "${card.title}" allowed in total.`);
        return;
    }
    if (targetDeck === 'starting') {
        if (card.cost !== 0) { alert(`Rule Violation: Only 0-cost cards allowed in Starting Deck.`); return; }
        if (appState.deck.starting.length >= 24) { alert(`Rule Violation: Starting Deck is full (24 cards).`); return; }
        if (appState.deck.starting.filter(title => title === cardTitle).length >= 2) { alert(`Rule Violation: Max 2 copies of "${card.title}" allowed in Starting Deck.`); return; }
        updateAppState('deck.starting', [...appState.deck.starting, cardTitle]);
    } else {
        updateAppState('deck.purchase', [...appState.deck.purchase, cardTitle]);
    }
    renderDecks();
}

export function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? appState.deck.starting : appState.deck.purchase;
    const cardIndex = deck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        const newDeck = [...deck];
        newDeck.splice(cardIndex, 1);
        if (deckName === 'starting') {
            updateAppState('deck.starting', newDeck);
        } else {
            updateAppState('deck.purchase', newDeck);
        }
        renderDecks();
    }
}

export function moveCard(cardTitle, sourceDeckName) {
    const card = appState.cardTitleCache[cardTitle];
    if (!card) return;

    const sourceDeck = sourceDeckName === 'starting' ? appState.deck.starting : appState.deck.purchase;
    const destinationDeckName = sourceDeckName === 'starting' ? 'purchase' : 'starting';
    const destinationDeck = destinationDeckName === 'starting' ? appState.deck.starting : appState.deck.purchase;

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
            updateAppState('deck.starting', newSourceDeck);
            updateAppState('deck.purchase', newDestinationDeck);
        } else {
            updateAppState('deck.purchase', newSourceDeck);
            updateAppState('deck.starting', newDestinationDeck);
        }
        renderDecks();
    }
}

export class DeckValidator {
    static validateStartingDeck(deck) {
        const issues = [];
        if (deck.length !== 24) {
            issues.push(`Starting Deck must have 24 cards (is ${deck.length})`);
        }

        const nonZeroCost = deck.filter(title => {
            const card = appState.cardTitleCache[title];
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
        const allCards = [...appState.deck.starting, ...appState.deck.purchase]
            .map(title => appState.cardTitleCache[title])
            .filter(Boolean);

        const purchaseDeckCards = appState.deck.purchase
            .map(title => appState.cardTitleCache[title])
            .filter(Boolean);

        const totalCards = allCards.length;
        if (totalCards === 0) {
            return { totalCards: 0, averageCost: 0, cardTypes: {}, costCurve: {} };
        }

        const stats = {
            totalCards: totalCards,
            averageCost: purchaseDeckCards.length > 0 ? purchaseDeckCards.reduce((sum, card) => sum + (card.cost || 0), 0) / purchaseDeckCards.length : 0,
            cardTypes: allCards.reduce((acc, card) => {
                const type = card.card_type || 'Unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
            costCurve: purchaseDeckCards.reduce((acc, card) => {
                const cost = card.cost ?? 0;
                acc[cost] = (acc[cost] || 0) + 1;
                return acc;
            }, {})
        };
        
        const costKeys = Object.keys(stats.costCurve);
        if (costKeys.length > 0) {
            const maxCost = Math.max(...costKeys.map(Number));
            for (let i = 0; i <= maxCost; i++) {
                if (!stats.costCurve[i]) {
                    stats.costCurve[i] = 0;
                }
            }
        }
        return stats;
    }
}

export function validateDeck() {
    const issues = [
        ...DeckValidator.validateStartingDeck(appState.deck.starting),
        ...DeckValidator.validateTotalComposition(appState.deck.starting, appState.deck.purchase)
    ];

    if (appState.deck.purchase.length < 36) {
        issues.push(`Purchase Deck needs at least 36 cards (is ${appState.deck.purchase.length})`);
    }

    return [...new Set(issues)];
}

function isKitCard(card) {
    return card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE';
}

