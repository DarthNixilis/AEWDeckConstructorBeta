// exporter.js
import * as state from './config.js';
import { generatePlaytestCardHTML, generateCardVisualHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

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

// Helper function to check if official image exists
async function checkImageExists(imagePath) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imagePath;
        
        // Add timeout in case image takes too long
        setTimeout(() => resolve(false), 1000);
    });
}

// Helper function to get card HTML based on export type
async function getCardHTMLForExport(card, exportType, tempContainer) {
    if (exportType === 'playtest') {
        return await generatePlaytestCardHTML(card, tempContainer);
    } else if (exportType === 'official') {
        return await generateCardVisualHTML(card, tempContainer);
    } else { // 'hybrid'
        // For hybrid, check if official image exists
        const imageName = toPascalCase(card.title);
        const basePath = window.location.pathname.includes('/RepoName/') 
            ? window.location.pathname.substring(0, window.location.pathname.indexOf('/', 1) + 1)
            : '/';
        const imagePath = `${basePath}card-images/${imageName}.png`;
        
        const hasOfficialImage = await checkImageExists(imagePath);
        
        if (hasOfficialImage) {
            return await generateCardVisualHTML(card, tempContainer);
        } else {
            return await generatePlaytestCardHTML(card, tempContainer);
        }
    }
}

// Main export function
export async function exportDeckAsImage(exportType) {
    // If no exportType provided, show the modal (handled in listeners.js)
    if (!exportType) return;
    
    // Get all cards to export
    const uniquePersonaAndKit = [];
    const activePersonaTitles = [];
    if (state.selectedWrestler) {
        uniquePersonaAndKit.push(state.selectedWrestler);
        activePersonaTitles.push(state.selectedWrestler.title);
    }
    if (state.selectedManager) {
        uniquePersonaAndKit.push(state.selectedManager);
        activePersonaTitles.push(state.selectedManager.title);
    }
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    uniquePersonaAndKit.push(...kitCards);
    const finalUniquePersonaAndKit = [...new Map(uniquePersonaAndKit.map(card => [card.title, card])).values()];
    const mainDeckCards = [...state.startingDeck, ...state.purchaseDeck].map(title => state.cardTitleCache[title]);
    const allCardsToPrint = [...finalUniquePersonaAndKit, ...mainDeckCards].filter(card => card !== undefined);

    if (allCardsToPrint.length === 0) {
        alert("There are no cards in the deck to export.");
        return;
    }

    // Map export type to display name
    const exportTypeNames = {
        'playtest': 'Playtest Print',
        'official': 'Only Official Art',
        'hybrid': 'Full Hybrid'
    };
    
    if (!confirm(`This will generate print sheets for ${allCardsToPrint.length} total cards (${exportTypeNames[exportType]}). Continue?`)) {
        return;
    }

    const DPI = 300;
    const OFFICIAL_CARD_WIDTH = 445;  // Standard AEW card width
    const OFFICIAL_CARD_HEIGHT = 622; // Standard AEW card height
    const PLAYTEST_CARD_WIDTH = 2.5 * DPI;
    const PLAYTEST_CARD_HEIGHT = 3.5 * DPI;
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    try {
        let playtestCount = 0;
        let officialCount = 0;
        
        // For hybrid export, we need to check each card
        const cardExportInfo = [];
        if (exportType === 'hybrid') {
            for (const card of allCardsToPrint) {
                const imageName = toPascalCase(card.title);
                const basePath = window.location.pathname.includes('/RepoName/') 
                    ? window.location.pathname.substring(0, window.location.pathname.indexOf('/', 1) + 1)
                    : '/';
                const imagePath = `${basePath}card-images/${imageName}.png`;
                
                const hasOfficialImage = await checkImageExists(imagePath);
                if (hasOfficialImage) {
                    officialCount++;
                    cardExportInfo.push({ card, type: 'official' });
                } else {
                    playtestCount++;
                    cardExportInfo.push({ card, type: 'playtest' });
                }
            }
        } else {
            // For playtest or official, just set counts
            if (exportType === 'playtest') {
                playtestCount = allCardsToPrint.length;
                officialCount = 0;
                cardExportInfo.push(...allCardsToPrint.map(card => ({ card, type: 'playtest' })));
            } else {
                playtestCount = 0;
                officialCount = allCardsToPrint.length;
                cardExportInfo.push(...allCardsToPrint.map(card => ({ card, type: 'official' })));
            }
        }
        
        // Show stats for hybrid export
        if (exportType === 'hybrid') {
            if (!confirm(`Hybrid Export: ${officialCount} cards will use official art, ${playtestCount} cards will use playtest proxies. Continue?`)) {
                return;
            }
        }

        const CARDS_PER_PAGE = 9;
        const numPages = Math.ceil(allCardsToPrint.length / CARDS_PER_PAGE);
        
        for (let page = 0; page < numPages; page++) {
            const canvas = document.createElement('canvas');
            canvas.width = 8.5 * DPI;
            canvas.height = 11 * DPI;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const startIndex = page * CARDS_PER_PAGE;
            const endIndex = startIndex + CARDS_PER_PAGE;
            const cardsOnThisPage = cardExportInfo.slice(startIndex, endIndex);

            for (let i = 0; i < cardsOnThisPage.length; i++) {
                const { card, type } = cardsOnThisPage[i];
                const isOfficial = type === 'official';
                
                const cardWidth = isOfficial ? OFFICIAL_CARD_WIDTH : PLAYTEST_CARD_WIDTH;
                const cardHeight = isOfficial ? OFFICIAL_CARD_HEIGHT : PLAYTEST_CARD_HEIGHT;
                
                const row = Math.floor(i / 3);
                const col = i % 3;
                const x = (0.5 * DPI) + (col * cardWidth);
                const y = (0.5 * DPI) + (row * cardHeight);
                
                const cardHTML = await getCardHTMLForExport(card, type === 'official' ? 'official' : 'playtest', tempContainer);
                tempContainer.innerHTML = cardHTML;
                const cardElement = tempContainer.firstElementChild;

                try {
                    const cardCanvas = await html2canvas(cardElement, { 
                        width: cardWidth, 
                        height: cardHeight, 
                        scale: 1, 
                        logging: false,
                        backgroundColor: null,
                        useCORS: true // Important for loading external images
                    });
                    ctx.drawImage(cardCanvas, x, y);
                } catch (error) {
                    console.error(`Failed to render card "${card.title}" to canvas:`, error);
                    // Draw placeholder for failed cards
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
