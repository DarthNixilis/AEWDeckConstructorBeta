// deck.js

import * as state from './config.js';
import { renderDecks, renderPersonaDisplay, generateCardVisualHTML } from './ui.js';
import { toPascalCase } from './config.js';

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
                if (managerName.toLowerCase() !== 'none') {
                    const manager = state.cardDatabase.find(c => c.title === managerName && c.card_type === 'Manager');
                    if (manager) newManager = manager;
                }
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

// --- THIS IS THE KEY CHANGE FOR THIS FILE ---
export async function exportDeckAsImage() {
    const issues = validateDeck();
    if (issues.length > 0) {
        alert("Deck is not valid and cannot be exported:\n\n" + issues.join("\n"));
        return;
    }

    const allCardsInDeck = [...state.startingDeck, ...state.purchaseDeck]
        .map(title => state.cardDatabase.find(c => c.title === title))
        .sort((a, b) => a.title.localeCompare(b.title));

    if (allCardsInDeck.length === 0) {
        alert("There are no cards in the deck to export.");
        return;
    }

    const CARDS_PER_PAGE = 9;
    const numPages = Math.ceil(allCardsInDeck.length / CARDS_PER_PAGE);
    alert(`Preparing to generate ${numPages} print sheet(s). This may take a moment. Please wait for all downloads to complete.`);

    // --- Print-Ready Constants (for 300 DPI) ---
    const DPI = 300;
    const PAPER_WIDTH_INCHES = 8.5;
    const PAPER_HEIGHT_INCHES = 11;
    const CARD_WIDTH_INCHES = 2.5;
    const CARD_HEIGHT_INCHES = 3.5;
    const MARGIN_INCHES = 0.5;

    const CANVAS_WIDTH = PAPER_WIDTH_INCHES * DPI;
    const CANVAS_HEIGHT = PAPER_HEIGHT_INCHES * DPI;
    const CARD_RENDER_WIDTH_PX = CARD_WIDTH_INCHES * DPI;
    const CARD_RENDER_HEIGHT_PX = CARD_HEIGHT_INCHES * DPI;
    const MARGIN_PX = MARGIN_INCHES * DPI;

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    for (let page = 0; page < numPages; page++) {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const startIndex = page * CARDS_PER_PAGE;
        const endIndex = startIndex + CARDS_PER_PAGE;
        const cardsOnThisPage = allCardsInDeck.slice(startIndex, endIndex);

        for (let i = 0; i < cardsOnThisPage.length; i++) {
            const card = cardsOnThisPage[i];
            const row = Math.floor(i / 3);
            const col = i % 3;

            const x = MARGIN_PX + (col * CARD_RENDER_WIDTH_PX);
            const y = MARGIN_PX + (row * CARD_RENDER_HEIGHT_PX);

            tempContainer.innerHTML = generateCardVisualHTML(card);
            const placeholderElement = tempContainer.querySelector('.placeholder-card');
            
            placeholderElement.style.width = `${CARD_RENDER_WIDTH_PX}px`;
            placeholderElement.style.height = `${CARD_RENDER_HEIGHT_PX}px`;

            try {
                const cardCanvas = await html2canvas(placeholderElement, {
                    width: CARD_RENDER_WIDTH_PX,
                    height: CARD_RENDER_HEIGHT_PX,
                    scale: 1,
                    logging: false
                });
                ctx.drawImage(cardCanvas, x, y);
            } catch (error) {
                console.error(`Failed to render card "${card.title}" to canvas:`, error);
                ctx.fillStyle = 'red';
                ctx.fillRect(x, y, CARD_RENDER_WIDTH_PX, CARD_RENDER_HEIGHT_PX);
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.font = '48px Arial';
                ctx.fillText(`Error: ${card.title}`, x + CARD_RENDER_WIDTH_PX / 2, y + CARD_RENDER_HEIGHT_PX / 2);
            }
        }

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${toPascalCase(state.selectedWrestler.title)}-Deck-Page-${page + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    document.body.removeChild(tempContainer);
    alert('All print sheets have been generated and downloaded!');
}

