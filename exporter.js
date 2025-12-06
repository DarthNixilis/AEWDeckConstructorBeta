// exporter.js
import * as state from './config.js';
import { generatePlaytestCardHTML, generateCardVisualHTML } from './card-renderer.js';
import { toPascalCase, isKitCard } from './config.js'; // ADDED isKitCard, now imported from config.js

export function generatePlainTextDeck() {
    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);
    const kitCards = state.cardDatabase.filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For'])).sort((a, b) => a.title.localeCompare(b.title)); // FIXED: Using imported function
    let text = `Wrestler: ${state.selectedWrestler ? state.selectedWrestler.title : 'None'}\n`;
    text += `Manager: ${state.selectedManager ? state.selectedManager.title : 'None'}\n`;
    kitCards.forEach((card, index) => { text += `Kit${index + 1}: ${card.title}\n`; });
    text += `\n--- Starting Deck (${state.startingDeck.length}/24) ---\n`;
    const startingCounts = state.startingDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
    text += `\n--- Purchase Deck (${state.purchaseDeck.length}/40) ---\n`;
    const purchaseCounts = state.purchaseDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });

    return text;
}

/**
 * Creates an array of card objects for export, including all cards that are part of the deck
 * or a currently selected persona's kit.
 */
function getCardsForExport() {
    const cardTitleSet = new Set([
        ...state.startingDeck, 
        ...state.purchaseDeck
    ]);

    const activePersonaTitles = [];
    if (state.selectedWrestler) activePersonaTitles.push(state.selectedWrestler.title);
    if (state.selectedManager) activePersonaTitles.push(state.selectedManager.title);

    // Add Kit cards to the set of cards to be exported
    state.cardDatabase.filter(card => 
        card && isKitCard(card) && activePersonaTitles.includes(card['Signature For'])
    ).forEach(card => cardTitleSet.add(card.title));

    // Convert to Card objects
    const cardsToExport = Array.from(cardTitleSet)
        .map(title => state.cardTitleCache[title])
        .filter(card => card)
        .sort((a, b) => a.title.localeCompare(b.title));
        
    return cardsToExport;
}

/**
 * Generates an image file of all cards in the deck, paginated.
 * @param {'playtest'|'official'|'hybrid'} exportType - The style of card to render.
 */
export async function exportDeckAsImage(exportType) {
    const tempContainer = document.createElement('div');
    tempContainer.id = 'export-temp-container';
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);

    try {
        const cardsToExport = getCardsForExport();
        if (cardsToExport.length === 0) {
            alert("No cards to export. Please select a Wrestler/Manager or add cards to your deck.");
            return;
        }

        const cardsPerPage = 9; // 3x3 layout
        const cardWidth = 825;
        const cardHeight = 1125;
        const padding = 50;
        const pageRows = 3;
        const pageCols = 3;
        const totalCanvasWidth = (cardWidth * pageCols) + (padding * (pageCols + 1));
        const totalCanvasHeight = (cardHeight * pageRows) + (padding * (pageRows + 1));
        
        const numPages = Math.ceil(cardsToExport.length / cardsPerPage);
        let officialCount = 0;
        let playtestCount = 0;

        for (let page = 0; page < numPages; page++) {
            const canvas = document.createElement('canvas');
            canvas.width = totalCanvasWidth;
            canvas.height = totalCanvasHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const pageCards = cardsToExport.slice(page * cardsPerPage, (page + 1) * cardsPerPage);

            for (let i = 0; i < pageCards.length; i++) {
                const card = pageCards[i];
                const row = Math.floor(i / pageCols);
                const col = i % pageCols;
                const x = padding + (col * (cardWidth + padding));
                const y = padding + (row * (cardHeight + padding));
                
                let cardHTML = '';
                let successfulRender = true;

                if (exportType === 'playtest') {
                    cardHTML = generatePlaytestCardHTML(card);
                    playtestCount++;
                } else if (exportType === 'official') {
                    // Try to generate visual HTML, if it fails, it will fall back to playtest/placeholder
                    cardHTML = await generateCardVisualHTML(card, tempContainer, true); // true for officialOnly
                    if (cardHTML) {
                        officialCount++;
                    } else {
                        // Official render failed, fall back to placeholder
                        successfulRender = false;
                    }
                } else if (exportType === 'hybrid') {
                    // Try official first
                    cardHTML = await generateCardVisualHTML(card, tempContainer, false); // false for not officialOnly
                    if (cardHTML) {
                        officialCount++;
                    } else {
                        // Fall back to playtest
                        cardHTML = generatePlaytestCardHTML(card);
                        playtestCount++;
                    }
                }

                if (successfulRender && cardHTML) {
                    tempContainer.innerHTML = `<div style="width:${cardWidth}px; height:${cardHeight}px;">${cardHTML}</div>`;
                    const renderTarget = tempContainer.firstChild;

                    // html2canvas is imported globally
                    const cardCanvas = await html2canvas(renderTarget, {
                        width: cardWidth,
                        height: cardHeight,
                        scale: 1, // Keep scale low for performance, or increase for higher resolution
                        logging: false,
                        useCORS: true // Important for loading images
                    });
                    
                    ctx.drawImage(cardCanvas, x, y, cardWidth, cardHeight);
                    tempContainer.innerHTML = ''; // Clear temporary container
                } else {
                    // Placeholder for failed cards
                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(x, y, cardWidth, cardHeight);
                    ctx.strokeStyle = '#ccc';
                    ctx.strokeRect(x, y, cardWidth, cardHeight);
                    ctx.fillStyle = '#666';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(card.title, x + cardWidth / 2, y + cardHeight / 2);
                }
            }

            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            const wrestlerName = state.selectedWrestler ? toPascalCase(state.selectedWrestler.title) : "Deck";
            const typeSuffix = exportType === 'hybrid' ? 'Hybrid' : exportType === 'official' ? 'Official' : 'Playtest';
            a.download = `${wrestlerName}-${typeSuffix}-Page-${page + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        alert(`Export complete!\n\nGenerated ${numPages} page(s)\n${officialCount} official cards\n${playtestCount} playtest cards`);
    } catch (error) {
        console.error("Error during export:", error);
        alert("An error occurred during export. Check the console for details.");
    } finally {
        document.body.removeChild(tempContainer);
    }
}

