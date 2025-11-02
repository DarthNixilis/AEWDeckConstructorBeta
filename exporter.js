// exporter.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

// --- Text Export (No Changes) ---
export function generatePlainTextDeck() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For'])).sort((a, b) => a.title.localeCompare(b.title));
    let text = `Wrestler: ${state.selectedWrestler ? state.selectedWrestler.title : 'None'}\n`;
    text += `Manager: ${state.selectedManager ? state.selectedManager.title : 'None'}\n`;
    kitCards.forEach((card, index) => { text += `Kit${index + 1}: ${card.title}\n`; });
    text += `\n--- Starting Deck (${state.startingDeck.length}/24) ---\n`;
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
    text += `\n--- Purchase Deck (${state.purchaseDeck.length}/36+) ---\n`;
    const purchaseCounts = state.purchaseDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
    return text;
}


// --- NEW, REBUILT IMAGE EXPORT LOGIC ---

/**
 * A helper function to generate print sheets for a specific list of cards.
 * @param {Array<Object>} cardsToPrint - The array of card objects to print.
 * @param {string} title - The title for this section (e.g., "Persona & Kit").
 * @param {HTMLElement} tempContainer - The temporary DOM element for rendering.
 * @param {string} wrestlerName - The name of the wrestler for the file name.
 */
async function generatePrintSheets(cardsToPrint, title, tempContainer, wrestlerName) {
    if (cardsToPrint.length === 0) return; // Don't generate empty sheets

    const DPI = 300;
    const CARDS_PER_PAGE = 9;
    const CARD_RENDER_WIDTH_PX = 2.5 * DPI;
    const CARD_RENDER_HEIGHT_PX = 3.5 * DPI;
    const PAGE_WIDTH_PX = 8.5 * DPI;
    const PAGE_HEIGHT_PX = 11 * DPI;
    const MARGIN_PX = 0.5 * DPI;

    const numPages = Math.ceil(cardsToPrint.length / CARDS_PER_PAGE);

    for (let page = 0; page < numPages; page++) {
        const canvas = document.createElement('canvas');
        canvas.width = PAGE_WIDTH_PX;
        canvas.height = PAGE_HEIGHT_PX;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // --- Add the Page Label ---
        ctx.fillStyle = 'black';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        const pageLabel = `${title} - Page ${page + 1} of ${numPages}`;
        ctx.fillText(pageLabel, PAGE_WIDTH_PX / 2, MARGIN_PX / 2);
        // -------------------------

        const startIndex = page * CARDS_PER_PAGE;
        const endIndex = startIndex + CARDS_PER_PAGE;
        const cardsOnThisPage = cardsToPrint.slice(startIndex, endIndex);

        for (let i = 0; i < cardsOnThisPage.length; i++) {
            const card = cardsOnThisPage[i];
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = MARGIN_PX + (col * CARD_RENDER_WIDTH_PX);
            const y = MARGIN_PX + (row * CARD_RENDER_HEIGHT_PX);
            
            const playtestHTML = await generatePlaytestCardHTML(card, tempContainer);
            tempContainer.innerHTML = playtestHTML;
            const playtestElement = tempContainer.firstElementChild;

            try {
                const cardCanvas = await html2canvas(playtestElement, { width: CARD_RENDER_WIDTH_PX, height: CARD_RENDER_HEIGHT_PX, scale: 1, logging: false });
                ctx.drawImage(cardCanvas, x, y);
            } catch (error) {
                console.error(`Failed to render card "${card.title}" to canvas:`, error);
            }
        }

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        // Sanitize title for filename
        const safeTitle = title.replace(/[^a-zA-Z0-9]/g, ''); 
        a.download = `${wrestlerName}-${safeTitle}-Page-${page + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(resolve => setTimeout(resolve, 500)); // Stagger downloads
    }
}

/**
 * Main function to orchestrate the multi-page deck export.
 */
export async function exportDeckAsImage() {
    // 1. Gather and sort cards for each section
    const personaAndKitCards = [];
    const activePersonaTitles = [];
    if (state.selectedWrestler) {
        personaAndKitCards.push(state.selectedWrestler);
        activePersonaTitles.push(state.selectedWrestler.title);
    }
    if (state.selectedManager) {
        personaAndKitCards.push(state.selectedManager);
        activePersonaTitles.push(state.selectedManager.title);
    }
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    personaAndKitCards.push(...kitCards);
    const uniquePersonaAndKit = [...new Map(personaAndKitCards.map(card => [card.title, card])).values()];

    const startingDeckCards = state.startingDeck.map(title => state.cardTitleCache[title]).filter(Boolean);
    const purchaseDeckCards = state.purchaseDeck.map(title => state.cardTitleCache[title]).filter(Boolean);

    const totalCards = uniquePersonaAndKit.length + startingDeckCards.length + purchaseDeckCards.length;
    if (totalCards === 0) {
        alert("There are no cards in the deck to export.");
        return;
    }

    if (!confirm(`This will generate separate print sheets for Persona, Starting, and Purchase decks. Continue?`)) {
        return;
    }

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    const wrestlerName = state.selectedWrestler ? toPascalCase(state.selectedWrestler.title) : "Deck";

    try {
        // 2. Generate sheets for each section sequentially
        await generatePrintSheets(uniquePersonaAndKit, "Persona and Kit", tempContainer, wrestlerName);
        await generatePrintSheets(startingDeckCards, "Starting Deck", tempContainer, wrestlerName);
        await generatePrintSheets(purchaseDeckCards, "Purchase Deck", tempContainer, wrestlerName);
    } finally {
        // 3. Clean up and notify user
        document.body.removeChild(tempContainer);
        alert('All print sheets have been generated and downloaded!');
    }
}

