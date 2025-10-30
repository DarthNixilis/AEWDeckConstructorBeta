// deck.js

import * as state from './config.js';
// Import UI functions that deck.js needs to call
import { renderDecks, renderPersonaDisplay, generateCardVisualHTML } from './ui.js';
import { toPascalCase } from './config.js'; // Import toPascalCase

// --- DECK MANIPULATION ---
export function addCardToDeck(cardTitle, targetDeck) {
    const card = state.cardDatabase.find(c => c.title === cardTitle);
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

// --- DECK VALIDATION & EXPORT ---
export function validateDeck() {
    const issues = [];
    if (!state.selectedWrestler) issues.push("No wrestler selected.");
    if (!state.selectedManager) issues.push("No manager selected.");
    if (state.startingDeck.length !== 24) issues.push(`Starting deck has ${state.startingDeck.length} cards (needs 24).`);
    if (state.purchaseDeck.length < 36) issues.push(`Purchase deck has ${state.purchaseDeck.length} cards (needs at least 36).`);
    const allCardTitles = [...state.startingDeck, ...state.purchaseDeck];
    const cardCounts = allCardTitles.reduce((acc, cardTitle) => {
        acc[cardTitle] = (acc[cardTitle] || 0) + 1;
        return acc;
    }, {});
    Object.entries(cardCounts).forEach(([cardTitle, count]) => {
        if (count > 3) {
            const card = state.cardDatabase.find(c => c.title === cardTitle);
            issues.push(`Too many copies of ${card.title} (${count} copies, max 3).`);
        }
    });
    return issues;
}

export function generatePlainTextDeck() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    
    const kitCards = state.cardDatabase.filter(card => 
        state.isKitCard(card) && activePersonaTitles.includes(card['Signature For'])
    ).sort((a, b) => a.title.localeCompare(b.title));

    let text = `Wrestler: ${state.selectedWrestler.title}\n`;
    text += `Manager: ${state.selectedManager ? state.selectedManager.title : 'None'}\n`;
    
    kitCards.forEach((card, index) => {
        text += `Kit${index + 1}: ${card.title}\n`;
    });

    text += `\n--- Starting Deck (${state.startingDeck.length}/24) ---\n`;
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => {
        text += `${count}x ${cardTitle}\n`;
    });

    text += `\n--- Purchase Deck (${state.purchaseDeck.length}/36+) ---\n`;
    const purchaseCounts = state.purchaseDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => {
        text += `${count}x ${cardTitle}\n`;
    });
    
    return text;
}

// --- DECK IMPORT ---
export function parseAndLoadDeck(text) {
    const importStatus = document.getElementById('importStatus');
    const importModal = document.getElementById('importModal');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    
    try {
        const lines = text.trim().split(/\r?\n/);
        let newWrestler = null;
        let newManager = null;
        let newStartingDeck = [];
        let newPurchaseDeck = [];
        let currentSection = '';

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.toLowerCase().startsWith('kit')) return;

            if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
                const wrestlerName = trimmedLine.substring(9).trim();
                const wrestler = state.cardDatabase.find(c => c.title === wrestlerName && c.card_type === 'Wrestler');
                if (wrestler) newWrestler = wrestler;
            } else if (trimmedLine.toLowerCase().startsWith('manager:')) {
                const managerName = trimmedLine.substring(8).trim();
                const manager = state.cardDatabase.find(c => c.title === managerName && c.card_type === 'Manager');
                if (manager) newManager = manager;
            } else if (trimmedLine.startsWith('--- Starting Deck')) {
                currentSection = 'starting';
            } else if (trimmedLine.startsWith('--- Purchase Deck')) {
                currentSection = 'purchase';
            } else {
                const match = trimmedLine.match(/^(\d+)x\s+(.+)/);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const cardName = match[2].trim();
                    const card = state.cardDatabase.find(c => c.title === cardName);
                    if (card) {
                        for (let i = 0; i < count; i++) {
                            if (currentSection === 'starting') newStartingDeck.push(card.title);
                            else if (currentSection === 'purchase') newPurchaseDeck.push(card.title);
                        }
                    }
                }
            }
        });

        if (!newWrestler) {
            importStatus.textContent = 'Error: Wrestler not found or invalid in the decklist.';
            importStatus.style.color = 'red';
            return;
        }

        state.setSelectedWrestler(newWrestler);
        state.setSelectedManager(newManager);
        state.setStartingDeck(newStartingDeck);
        state.setPurchaseDeck(newPurchaseDeck);

        wrestlerSelect.value = state.selectedWrestler.title;
        managerSelect.value = state.selectedManager ? state.selectedManager.title : "";
        
        renderDecks();
        renderPersonaDisplay();
        document.dispatchEvent(new Event('filtersChanged'));

        importStatus.textContent = 'Deck imported successfully!';
        importStatus.style.color = 'green';
        setTimeout(() => { importModal.style.display = 'none'; }, 1500);

    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `An unexpected error occurred: ${error.message}`;
        importStatus.style.color = 'red';
    }
}

// --- IMAGE EXPORT LOGIC ---
export async function exportDeckAsImage() {
    const issues = validateDeck();
    if (issues.length > 0) {
        alert("Deck is not valid and cannot be exported:\n\n" + issues.join("\n"));
        return;
    }

    alert('Preparing to generate deck image. This may take a moment for large decks. Please do not close the window.');

    const allCardsInDeck = [...state.startingDeck, ...state.purchaseDeck]
        .map(title => state.cardDatabase.find(c => c.title === title))
        .sort((a, b) => a.title.localeCompare(b.title));

    const CARD_WIDTH = 400;
    const CARD_HEIGHT = 560;
    const GUTTER = 20;
    const COLUMNS = 9;

    const numRows = Math.ceil(allCardsInDeck.length / COLUMNS);
    const canvasWidth = (CARD_WIDTH * COLUMNS) + (GUTTER * (COLUMNS - 1));
    const canvasHeight = (CARD_HEIGHT * numRows) + (GUTTER * (numRows - 1));

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < allCardsInDeck.length; i++) {
        const card = allCardsInDeck[i];
        const row = Math.floor(i / COLUMNS);
        const col = i % COLUMNS;

        const x = col * (CARD_WIDTH + GUTTER);
        const y = row * (CARD_HEIGHT + GUTTER);

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = `${CARD_WIDTH}px`;
        tempContainer.innerHTML = generateCardVisualHTML(card);
        document.body.appendChild(tempContainer);
        
        const placeholderElement = tempContainer.querySelector('.placeholder-card');
        
        try {
            const cardCanvas = await html2canvas(placeholderElement, { scale: 1 });
            ctx.drawImage(cardCanvas, x, y, CARD_WIDTH, CARD_HEIGHT);
        } catch (error) {
            console.error(`Failed to render card "${card.title}" to canvas:`, error);
            ctx.fillStyle = 'red';
            ctx.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT);
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(`Error rendering ${card.title}`, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
        }
        
        document.body.removeChild(tempContainer);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${toPascalCase(state.selectedWrestler.title)}-Deck.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    alert('Deck image generated and download has started!');
}

