// deck-manager.js
import * as state from './state.js';
import { renderDecks } from './ui-renderer.js';
import { isKitCard } from './config.js';

export function addCardToDeck(cardTitle, targetDeck) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;

    if (isKitCard(card)) {
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
        
        if (state.startingDeck.filter(title => title === cardTitle).length >= 2) {
            if (confirm(`You can only have 2 copies of "${cardTitle}" in your Starting Deck.\n\nWould you like to add the 3rd copy to your Purchase Deck?`)) {
                state.purchaseDeck.push(cardTitle);
                renderDecks();
            }
            return;
        }

        if (state.startingDeck.length === 24) {
            alert(`Reminder: Starting Deck should have 24 cards. You are now at 25.`);
        }
        
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

export function moveCardToPurchase(cardTitle) {
    const cardIndex = state.startingDeck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        state.startingDeck.splice(cardIndex, 1);
        state.purchaseDeck.push(cardTitle);
        renderDecks();
    }
}

export function moveCardToStarting(cardTitle) {
    const cardIndex = state.purchaseDeck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        if (state.startingDeck.filter(title => title === cardTitle).length >= 2) {
            alert(`Rule Violation: You already have 2 copies of "${cardTitle}" in your Starting Deck.`);
            return;
        }
        
        if (state.startingDeck.length === 24) {
            alert(`Reminder: Starting Deck should have 24 cards. You are now at 25.`);
        }

        state.purchaseDeck.splice(cardIndex, 1);
        state.startingDeck.push(cardTitle);
        renderDecks();
    }
}

export function clearDeck() {
    if (confirm('Are you sure you want to clear the entire deck?')) {
        state.setStartingDeck([]);
        state.setPurchaseDeck([]);
        renderDecks();
    }
}
