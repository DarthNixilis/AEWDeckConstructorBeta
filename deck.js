// deck.js

import { appState, updateAppState, isKitCard } from './config.js'; 
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
    const deck = appState.deck[targetDeck];
    const index = deck.indexOf(cardTitle);
    if (index > -1) {
        deck.splice(index, 1);
        updateAppState(`deck.${targetDeck}`, deck);
        renderDecks();
    }
}

export const DeckValidator = {
    validateStartingDeck: (startingDeck) => {
        const issues = [];
        if (startingDeck.length !== 24) {
            issues.push(`Starting Deck must have exactly 24 cards (has ${startingDeck.length})`);
        }

        const startingDeckCards = startingDeck
            .map(title => appState.cardTitleCache[title])
            .filter(card => card); // Safety filter for missing cards

        const nonZeroCost = startingDeckCards.filter(card => card.cost && card.cost > 0);
        if (nonZeroCost.length > 0) {
            issues.push(`Rule Violation: Starting Deck contains ${nonZeroCost.length} non-zero cost card(s) (e.g., ${nonZeroCost[0].title}).`);
        }

        const counts = startingDeck.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});
        Object.entries(counts).forEach(([title, count]) => {
            if (count > 2) {
                issues.push(`Rule Violation: "${title}" has ${count} copies in Starting Deck (Max 2 allowed).`);
            }
        });

        return issues;
    },

    validateTotalComposition: (startingDeck, purchaseDeck) => {
        const issues = [];
        const cardTitles = [...startingDeck, ...purchaseDeck];
        const allCardObjects = cardTitles
            .map(title => appState.cardTitleCache[title])
            .filter(card => card); // FIX: Filter out null/undefined entries to prevent crash

        const counts = cardTitles.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});
        Object.entries(counts).forEach(([title, count]) => {
            if (count > 3) {
                issues.push(`Rule Violation: "${title}" has ${count} copies in total (Max 3 allowed).`);
            }
        });

        const cardTypes = allCardObjects.reduce((acc, card) => {
            if (card.card_type === 'Strike' || card.card_type === 'Grapple' || card.card_type === 'Submission') {
                acc.maneuvers = (acc.maneuvers || 0) + 1;
            } else if (card.card_type === 'Response' || card.card_type === 'Action') {
                acc.actions = (acc.actions || 0) + 1;
            } else if (card.card_type === 'Asset') {
                acc.assets = (acc.assets || 0) + 1;
            }
            return acc;
        }, { maneuvers: 0, actions: 0, assets: 0 });

        const totalNonPersonaCards = cardTitles.length;
        const totalManeuvers = cardTypes.maneuvers;
        const totalActionsAndResponses = cardTypes.actions;
        const totalAssets = cardTypes.assets;

        // Validation rule 2: Maneuvers must be at least 50% of the non-persona deck
        if (totalManeuvers < Math.ceil(totalNonPersonaCards * 0.5)) {
            issues.push(`Composition Rule: Must have at least ${Math.ceil(totalNonPersonaCards * 0.5)} Maneuvers (has ${totalManeuvers}).`);
        }

        // Validation rule 3: Actions/Responses/Assets cannot be more than 20%
        const maxNonManeuver = Math.floor(totalNonPersonaCards * 0.20);
        const nonManeuverCount = totalActionsAndResponses + totalAssets;

        if (nonManeuverCount > maxNonManeuver) {
            issues.push(`Composition Rule: Total Actions/Responses/Assets cannot exceed 20% (${maxNonManeuver}). Has ${nonManeuverCount}.`);
        }
        
        return issues;
    },

    getDeckStats: (startingDeck, purchaseDeck) => {
        const cardTitles = [...startingDeck, ...purchaseDeck];
        const allCards = cardTitles
            .map(title => appState.cardTitleCache[title])
            .filter(card => card); // Safety filter for missing cards

        const purchaseDeckCards = purchaseDeck
            .map(title => appState.cardTitleCache[title])
            .filter(card => card); // Safety filter for missing cards

        const totalCards = cardTitles.length;

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

    if (appState.deck.starting.length + appState.deck.purchase.length < 60) {
        issues.push(`Total cards (Starting + Purchase) needs at least 60 cards (is ${appState.deck.starting.length + appState.deck.purchase.length})`);
    }

    // Check for Wrestler and Manager presence
    if (!appState.deck.selectedWrestler) {
        issues.push(`Wrestler must be selected.`);
    }

    // Check for Kit Card presence (just an optional warning for completeness)
    const activePersonaTitles = [];
    if (appState.deck.selectedWrestler) activePersonaTitles.push(appState.deck.selectedWrestler.title);
    if (appState.deck.selectedManager) activePersonaTitles.push(appState.deck.selectedManager.title);
    
    const kitCards = appState.cardDatabase.filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    if (kitCards.length === 0) {
        issues.push(`Warning: No Kit Cards found for the selected Wrestler/Manager.`);
    }


    const validationContainer = document.getElementById('validationIssues');
    if (!validationContainer) return;

    if (issues.length === 0) {
        validationContainer.innerHTML = '<li class="validation-success">Deck is Valid!</li>';
    } else {
        validationContainer.innerHTML = issues.map(issue => 
            `<li class="validation-item validation-error">${issue}</li>`
        ).join('');
    }
}

