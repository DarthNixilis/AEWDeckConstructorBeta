// exporter.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

// --- HELPER: The core image generation logic, now highly reusable ---
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

            // Add the label at the top of the page
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
                const y = (0.5 * DPI) + (row * CARD_RENDER_HEIGHT_PX); // Start below the label
                
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
            a.download = `${wrestlerName}-${toPascalCase(cardSet.label)}-Page-${page + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    document.body.removeChild(tempContainer);
    alert('All print sheets have been generated and downloaded!');
}


// --- PUBLIC EXPORT FUNCTIONS ---

// 1. Text Export (No changes needed)
export function exportDeckAsText() {
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
    
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const wrestlerName = state.selectedWrestler ? toPascalCase(state.selectedWrestler.title) : "Deck";
    a.download = `${wrestlerName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// 2. Full Export (Separated, with Images)
export function exportFull() {
    const personaAndKit = [];
    if (state.selectedWrestler) personaAndKit.push(state.selectedWrestler);
    if (state.selectedManager) personaAndKit.push(state.selectedManager);
    const activePersonaTitles = personaAndKit.map(p => p.title);
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    personaAndKit.push(...kitCards);

    const cardSets = [
        { label: 'Persona and Kit', cards: [...new Map(personaAndKit.map(c => [c.title, c])).values()] },
        { label: 'Starting Deck', cards: state.startingDeck.map(title => state.cardTitleCache[title]) },
        { label: 'Purchase Deck', cards: state.purchaseDeck.map(title => state.cardTitleCache[title]) }
    ].filter(set => set.cards.length > 0);

    generateImagePages(cardSets, false);
}

// 3. Printer Friendly (Separated, No Images)
export function exportPrinterFriendly() {
    const personaAndKit = [];
    if (state.selectedWrestler) personaAndKit.push(state.selectedWrestler);
    if (state.selectedManager) personaAndKit.push(state.selectedManager);
    const activePersonaTitles = personaAndKit.map(p => p.title);
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    personaAndKit.push(...kitCards);

    const cardSets = [
        { label: 'Persona and Kit', cards: [...new Map(personaAndKit.map(c => [c.title, c])).values()] },
        { label: 'Starting Deck', cards: state.startingDeck.map(title => state.cardTitleCache[title]) },
        { label: 'Purchase Deck', cards: state.purchaseDeck.map(title => state.cardTitleCache[title]) }
    ].filter(set => set.cards.length > 0);

    generateImagePages(cardSets, true); // The only difference is this 'true'
}

// 4. Paper Friendly (Compacted, with Images)
export function exportPaperFriendly() {
    const allCards = [
        ...(state.selectedWrestler ? [state.selectedWrestler] : []),
        ...(state.selectedManager ? [state.selectedManager] : []),
        ...state.cardDatabase.filter(card => state.isKitCard(card) && [state.selectedWrestler?.title, state.selectedManager?.title].includes(card['Signature For'])),
        ...state.startingDeck.map(title => state.cardTitleCache[title]),
        ...state.purchaseDeck.map(title => state.cardTitleCache[title])
    ];
    const uniqueCards = [...new Map(allCards.map(c => [c.title, c])).values()].sort((a,b) => a.title.localeCompare(b.title));

    const cardSets = [{ label: 'Compacted Deck', cards: uniqueCards }];
    generateImagePages(cardSets, false);
}

// 5. Both Friendly (Compacted, No Images)
export function exportBothFriendly() {
    const allCards = [
        ...(state.selectedWrestler ? [state.selectedWrestler] : []),
        ...(state.selectedManager ? [state.selectedManager] : []),
        ...state.cardDatabase.filter(card => state.isKitCard(card) && [state.selectedWrestler?.title, state.selectedManager?.title].includes(card['Signature For'])),
        ...state.startingDeck.map(title => state.cardTitleCache[title]),
        ...state.purchaseDeck.map(title => state.cardTitleCache[title])
    ];
    const uniqueCards = [...new Map(allCards.map(c => [c.title, c])).values()].sort((a,b) => a.title.localeCompare(b.title));

    const cardSets = [{ label: 'Compacted Deck (Printer Friendly)', cards: uniqueCards }];
    generateImagePages(cardSets, true); // The only difference is this 'true'
}

