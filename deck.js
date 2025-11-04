// deck.js
import * as state from './config.js';
import { renderDecks } from './ui.js';

/**
 * Adds a card to the specified deck, with enhanced logic for handling deck limits.
 */
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
        if (card.cost !== 0) {
            alert(`Rule Violation: Only 0-cost cards allowed in Starting Deck.`);
            return;
        }
        
        // --- THIS IS THE KEY CHANGE #1 ---
        // If user tries to add a 3rd copy to the starting deck...
        if (state.startingDeck.filter(title => title === cardTitle).length >= 2) {
            // ...ask them if they want to add it to the purchase deck instead.
            if (confirm(`You can only have 2 copies of "${cardTitle}" in your Starting Deck.\n\nWould you like to add the 3rd copy to your Purchase Deck?`)) {
                addCardToDeck(cardTitle, 'purchase'); // Recursive call to the correct deck
            }
            return; // Stop execution either way
        }
        // --- END OF KEY CHANGE #1 ---

        if (state.startingDeck.length >= 24) {
            alert(`Reminder: Starting Deck should have 24 cards. You are now at ${state.startingDeck.length + 1}.`);
        }
        
        state.startingDeck.push(cardTitle);
    } else {
        state.purchaseDeck.push(cardTitle);
    }
    renderDecks();
}

/**
 * Removes one instance of a card from the specified deck.
 */
export function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const cardIndex = deck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        deck.splice(cardIndex, 1);
        renderDecks();
    }
}

/**
 * Moves a card from the starting deck to the purchase deck.
 */
export function moveCardToPurchase(cardTitle) {
    const startDeck = state.startingDeck;
    const cardIndex = startDeck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        startDeck.splice(cardIndex, 1);
        state.purchaseDeck.push(cardTitle);
        renderDecks();
    }
}

/**
 * NEW FUNCTION: Moves a 0-cost card from the purchase deck to the starting deck.
 */
export function moveCardToStarting(cardTitle) {
    const purchaseDeck = state.purchaseDeck;
    const cardIndex = purchaseDeck.lastIndexOf(cardTitle);

    if (cardIndex > -1) {
        // Check starting deck limits before moving
        if (state.startingDeck.filter(title => title === cardTitle).length >= 2) {
            alert(`Rule Violation: You already have 2 copies of "${cardTitle}" in your Starting Deck.`);
            return;
        }
        if (state.startingDeck.length >= 24) {
            alert(`Reminder: Starting Deck should have 24 cards. You are now at ${state.startingDeck.length + 1}.`);
        }

        // Perform the move
        purchaseDeck.splice(cardIndex, 1);
        state.startingDeck.push(cardTitle);
        renderDecks();
    }
}

