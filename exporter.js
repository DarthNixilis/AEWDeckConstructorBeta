import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

// This is a new helper function to safely load the library
async function getHtml2Canvas() {
    try {
        // Check if it's already on the window object from a previous load
        if (window.html2canvas) return window.html2canvas;
        
        // If not, dynamically import it
        const module = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
        window.html2canvas = module.default; // Attach it to window for next time
        return window.html2canvas;
    } catch (error) {
        console.error("Failed to load html2canvas library:", error);
        alert("Could not load the required printing library. Please check your internet connection.");
        return null;
    }
}


export function generatePlainTextDeck() {
    // ... (This function remains unchanged)
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

export async function exportDeckAsImage() {
    const html2canvas = await getHtml2Canvas();
    if (!html2canvas) return; // Stop if the library failed to load

    // ... (The rest of this function remains unchanged)
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

    const CARDS_PER_PAGE = 9;
    const numPages = Math.ceil(allCardsToPrint.length / CARDS_PER_PAGE);
    if (!confirm(`This will generate ${numPages} print sheet(s) for ${allCardsToPrint.length} total cards. Continue?`)) {
        return;
    }

    const DPI = 300;
    const CARD_RENDER_WIDTH_PX = 2.5 * DPI;
    const CARD_RENDER_HEIGHT_PX = 3.5 * DPI;
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    for (let page = 0; page < numPages; page++) {
        const canvas = document.createElement('canvas');
        canvas.width = 8.5 * DPI;
        canvas.height = 11 * DPI;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const startIndex = page * CARDS_PER_PAGE;
        const endIndex = startIndex + CARDS_PER_PAGE;
        const cardsOnThisPage = allCardsToPrint.slice(startIndex, endIndex);

        for (let i = 0; i < cardsOnThisPage.length; i++) {
            const card = cardsOnThisPage[i];
            const row = Math.floor(i / 3), col = i % 3;
            const x = (0.5 * DPI) + (col * CARD_RENDER_WIDTH_PX), y = (0.5 * DPI) + (row * CARD_RENDER_HEIGHT_PX);
            
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
        const wrestlerName = state.selectedWrestler ? toPascalCase(state.selectedWrestler.title) : "Deck";
        a.download = `${wrestlerName}-Page-${page + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    document.body.removeChild(tempContainer);
    alert('All print sheets have been generated and downloaded!');
}

function sortCardsForPrinting(cardDatabase) {
    // ... (This function remains unchanged)
    const wrestlers = cardDatabase.filter(c => c.card_type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const otherCards = cardDatabase.filter(c => c.card_type !== 'Wrestler');

    const kitMap = new Map();
    otherCards.filter(card => state.isKitCard(card)).forEach(kitCard => {
        const wrestlerName = kitCard['Signature For'];
        if (!kitMap.has(wrestlerName)) {
            kitMap.set(wrestlerName, []);
        }
        kitMap.get(wrestlerName).push(kitCard);
    });

    const sortedPrintList = [];
    wrestlers.forEach(wrestler => {
        sortedPrintList.push(wrestler);
        const kits = kitMap.get(wrestler.title);
        if (kits) {
            kits.sort((a, b) => a.title.localeCompare(b.title));
            sortedPrintList.push(...kits);
        }
    });

    const nonWrestlerNonKitCards = otherCards
        .filter(card => !state.isKitCard(card))
        .sort((a, b) => {
            if (a.card_type !== b.card_type) return a.card_type.localeCompare(b.card_type);
            if ((a.cost ?? 99) !== (b.cost ?? 99)) return (a.cost ?? 99) - (b.cost ?? 99);
            return a.title.localeCompare(b.title);
        });

    sortedPrintList.push(...nonWrestlerNonKitCards);
    return sortedPrintList;
}

export async function exportMasterSet() {
    const html2canvas = await getHtml2Canvas();
    if (!html2canvas) return; // Stop if the library failed to load

    // ... (The rest of this function remains unchanged)
    if (!confirm("This will generate a print sheet for every card in the database. This may be slow and could generate many files. Continue?")) {
        return;
    }

    console.log('Starting master set export...');
    
    const cardsToPrint = sortCardsForPrinting(state.cardDatabase);
    const cardsPerPage = 9;
    const totalPages = Math.ceil(cardsToPrint.length / cardsPerPage);
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    for (let i = 0; i < totalPages; i++) {
        const pageNumber = i + 1;
        console.log(`Generating page ${pageNumber} of ${totalPages}...`);

        const printSheet = document.createElement('div');
        printSheet.style.display = 'grid';
        printSheet.style.gridTemplateColumns = 'repeat(3, 750px)';
        printSheet.style.gap = '0';
        printSheet.style.width = '2250px';
        printSheet.style.height = '3150px';
        
        const pageCards = cardsToPrint.slice(i * cardsPerPage, (i + 1) * cardsPerPage);
        
        let pageHTML = '';
        for (const card of pageCards) {
            pageHTML += await generatePlaytestCardHTML(card, tempContainer);
        }
        printSheet.innerHTML = pageHTML;

        document.body.appendChild(printSheet);

        try {
            const canvas = await html2canvas(printSheet, { scale: 1, logging: false });
            const link = document.createElement('a');
            link.download = `AEW_Master_Set_Page_${pageNumber}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (canvasError) {
            console.error(`Failed to generate canvas for page ${pageNumber}:`, canvasError);
        } finally {
            document.body.removeChild(printSheet);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    document.body.removeChild(tempContainer);
    alert('Master set export finished!');
}

