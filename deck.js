// deck.js

import { appState, updateAppState, isKitCard } from './config.js'; // ADDED isKitCard
import { renderDecks } from './ui.js';

export function addCardToDeck(cardTitle, targetDeck) {
    const card = appState.cardTitleCache[cardTitle];
    if (!card) return;
    if (isKitCard(card)) { // Now using imported function
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

export function removeCardFromDeck(cardTitle, targetDeck) {
    if (targetDeck === 'starting') {
        const index = appState.deck.starting.indexOf(cardTitle);
        if (index > -1) {
            const newDeck = [...appState.deck.starting];
            newDeck.splice(index, 1);
            updateAppState('deck.starting', newDeck);
        }
    } else {
        const index = appState.deck.purchase.indexOf(cardTitle);
        if (index > -1) {
            const newDeck = [...appState.deck.purchase];
            newDeck.splice(index, 1);
            updateAppState('deck.purchase', newDeck);
        }
    }
    renderDecks();
}

// --- DECK VALIDATION LOGIC ---

// Define the validation rules logic
export const DeckValidator = {
    validateStartingDeck: (startingDeck) => {
        const issues = [];
        if (startingDeck.length !== 24) {
            issues.push(`Starting Deck size must be exactly 24 cards (is ${startingDeck.length})`);
        }
        
        const counts = startingDeck.reduce((acc, title) => {
            acc[title] = (acc[title] || 0) + 1;
            return acc;
        }, {});

        Object.entries(counts).forEach(([cardTitle, count]) => {
            if (count > 2) {
                issues.push(`Starting Deck: "${cardTitle}" has ${count} copies. Max 2 allowed.`);
            }
        });

        const cards = startingDeck.map(title => appState.cardTitleCache[title]).filter(c => c);
        
        cards.forEach(card => {
            if (card.cost !== 0) {
                issues.push(`Starting Deck: "${card.title}" has a cost of ${card.cost}. Only 0-cost cards allowed.`);
            }
        });

        return issues;
    },

    validateTotalComposition: (startingDeck, purchaseDeck) => {
        const issues = [];
        const combinedDeck = [...startingDeck, ...purchaseDeck];
        
        const counts = combinedDeck.reduce((acc, title) => {
            acc[title] = (acc[title] || 0) + 1;
            return acc;
        }, {});

        Object.entries(counts).forEach(([cardTitle, count]) => {
            if (count > 3) {
                issues.push(`Total Deck: "${cardTitle}" has ${count} copies. Max 3 allowed across both decks.`);
            }
        });

        return issues;
    },
    
    // --- STATS LOGIC ---
    
    getDeckStats: () => {
        const startingDeckCards = appState.deck.starting.map(title => appState.cardTitleCache[title]).filter(c => c);
        const purchaseDeckCards = appState.deck.purchase.map(title => appState.cardTitleCache[title]).filter(c => c);
        const allCards = [...startingDeckCards, ...purchaseDeckCards];
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

    return issues;
}

