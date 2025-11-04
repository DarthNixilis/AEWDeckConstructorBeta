// exporter.js
import * as state from './state.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase, isKitCard } from './config.js';

async function generateImagePages(cardSets, usePlaceholders = false) {
    const allCardsToPrint = cardSets.flatMap(set => set.cards);
    if (allCardsToPrint.length === 0) {
        alert("There are no cards to export for the selected option.");
        return;
    }

    const CARDS_PER_PAGE = 9;
    const DPI = 300;
    const CARD_RENDER_WIDTH_PX = 2.5 * DPI;
    const CARD_RENDER_HEIGHT_PX = 3.5 * DPI;

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    for (const cardSet of cardSets) {
        const numPages = Math.ceil(cardSet.cards.length / CARDS_PER_PAGE);
        if (numPages === 0) continue;

        for (let page = 0; page < numPages; page++) {
            const canvas = document.createElement('canvas');
            canvas.width = 8.5 * DPI;
            canvas.height = 11 * DPI;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'black';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${cardSet.label} - Page ${page + 1} of ${numPages}`, canvas.width / 2, 0.3 * DPI);

            const startIndex = page * CARDS_PER_PAGE;
            const endIndex = startIndex + CARDS_PER_PAGE;
            const cardsOnThisPage = cardSet.cards.slice(startIndex, endIndex);

            for (let i = 0; i < cardsOnThisPage.length; i++) {
                const card = cardsOnThisPage[i];
                const row = Math.floor(i / 3);
                const col = i % 3;
                const x = (0.5 * DPI) + (col * CARD_RENDER_WIDTH_PX);
                const y = (0.5 * DPI) + (row * CARD_RENDER_HEIGHT_PX);
                
                const playtestHTML = await generatePlaytestCardHTML(card, tempContainer, usePlaceholders);
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
            const wrestlerName = state.selectedWrestler ? toPascalCase(state.selectedWrestler.title) : "Deck";
            const filename = cardSet.label === 'Full Database' ? 'AEW-TCG-Full-Set' : wrestlerName;
            a.download = `${filename}-${toPascalCase(cardSet.label)}-Page-${page + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    document.body.removeChild(tempContainer);
    alert('All print sheets have been generated and downloaded!');
}

export function exportDeckAsText() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    const kitCards = state.cardDatabase.filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For'])).sort((a, b) => a.title.localeCompare(b.title));
    let text = `Wrestler: ${state.selectedWrestler ? state.selectedWrestler.title : 'None'}\n`;
    text += `Manager: ${state.selectedManager ? state.selectedManager.title : 'None'}\n`;
    kitCards.forEach((card, index) => { text += `Kit${index + 1}: ${card.title}\n`; });
    text += `\n--- Starting Deck (${state.startingDeck.length}/24) ---\n`;
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
    text += `\n--- Purchase Deck (${state.purchaseDeck.length}/36+) ---\n`;
    const purchaseCounts = state.purchaseDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const wrestlerName = state.selectedWrestler ? toPascalCase(state.selectedWrestler.title) : "Deck";
    a.download = `${wrestlerName}-Decklist.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function getDeckCards() {
    const starting = [...new Set(state.startingDeck)].map(title => state.cardTitleCache[title]);
    const purchase = [...new Set(state.purchaseDeck)].map(title => state.cardTitleCache[title]);
    return { starting, purchase };
}

export function exportFull() {
    const { starting, purchase } = getDeckCards();
    generateImagePages([
        { label: 'Starting Deck', cards: starting },
        { label: 'Purchase Deck', cards: purchase }
    ], false);
}

export function exportPrinterFriendly() {
    const { starting, purchase } = getDeckCards();
    generateImagePages([
        { label: 'Starting Deck', cards: starting },
        { label: 'Purchase Deck', cards: purchase }
    ], true);
}

export function exportPaperFriendly() {
    const { starting, purchase } = getDeckCards();
    const combined = [...starting, ...purchase];
    generateImagePages([
        { label: 'Combined Deck', cards: combined }
    ], true);
}

export function exportBothFriendly() {
    const { starting, purchase } = getDeckCards();
    generateImagePages([
        { label: 'Starting Deck', cards: starting },
        { label: 'Purchase Deck', cards: purchase }
    ], true);
}

export function exportAllCards() {
    if (!confirm("This will generate print sheets for ALL cards in the database. This may be slow and download many files. Are you sure?")) {
        return;
    }
    const allCards = state.cardDatabase.filter(c => c).sort((a, b) => a.title.localeCompare(b.title));
    generateImagePages([
        { label: 'Full Database', cards: allCards }
    ], true);
}

