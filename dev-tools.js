// dev-tools.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';

/**
 * Creates a floating "Dev Tools" panel and adds our special button to it.
 */
function initializeDevTools() {
    const devContainer = document.createElement('div');
    devContainer.id = 'dev-tools-panel';
    
    // --- The One Button to Rule Them All ---
    const printMasterBtn = document.createElement('button');
    printMasterBtn.textContent = 'Dev: Print Master Set';
    printMasterBtn.title = 'Exports ONE of every single card, sorted by Type > Cost > Name, with Wrestler Kits grouped.';
    printMasterBtn.addEventListener('click', exportMasterSet);

    devContainer.appendChild(printMasterBtn);
    document.body.appendChild(devContainer);

    console.log("Developer tools UI initialized.");
}

/**
 * The ultimate export function. Creates a master set sorted by your specific rules.
 */
async function exportMasterSet() {
    // --- THE ULTIMATE SORTING ALGORITHM ---

    // 1. Create buckets for each card type
    const cardGroups = {};
    const wrestlers = [];

    state.cardDatabase.forEach(card => {
        if (!card || !card.title) return;

        if (card.card_type === 'Wrestler') {
            wrestlers.push(card);
        } else {
            if (!cardGroups[card.card_type]) {
                cardGroups[card.card_type] = [];
            }
            cardGroups[card.card_type].push(card);
        }
    });

    // 2. For each wrestler, find their kit cards and remove them from the main groups
    const wrestlerKits = {};
    wrestlers.forEach(wrestler => {
        wrestlerKits[wrestler.title] = [];
        // Find kit cards in the 'Action', 'Response', etc. groups
        Object.keys(cardGroups).forEach(groupName => {
            cardGroups[groupName] = cardGroups[groupName].filter(card => {
                if (state.isKitCard(card) && card['Signature For'] === wrestler.title) {
                    wrestlerKits[wrestler.title].push(card);
                    return false; // Remove from the main group
                }
                return true;
            });
        });
        // Sort the kit cards for this wrestler
        wrestlerKits[wrestler.title].sort((a, b) => a.title.localeCompare(b.title));
    });
    
    // 3. Sort the wrestlers themselves alphabetically
    wrestlers.sort((a, b) => a.title.localeCompare(b.title));

    // 4. Sort every other group by Cost, then by Title
    for (const groupName in cardGroups) {
        cardGroups[groupName].sort((a, b) => {
            // Primary sort: Cost (ascending)
            const costA = a.cost ?? 99; // Treat null/N/A cost as high
            const costB = b.cost ?? 99;
            if (costA !== costB) {
                return costA - costB;
            }
            // Secondary sort: Title (alphabetical)
            return a.title.localeCompare(b.title);
        });
    }

    // 5. Assemble the final, sorted list of all cards
    const allCardsToPrint = [];
    // Add Wrestlers and their kits first
    wrestlers.forEach(wrestler => {
        allCardsToPrint.push(wrestler);
        allCardsToPrint.push(...wrestlerKits[wrestler.title]);
    });

    // Define the desired order for the other groups
    const groupOrder = ['Manager', 'Action', 'Response', 'Submission', 'Strike', 'Grapple'];
    groupOrder.forEach(groupName => {
        if (cardGroups[groupName]) {
            allCardsToPrint.push(...cardGroups[groupName]);
        }
    });

    // --- END OF SORTING ALGORITHM ---

    if (allCardsToPrint.length === 0) {
        alert("Card database is empty. Nothing to print.");
        return;
    }

    const CARDS_PER_PAGE = 9;
    const numPages = Math.ceil(allCardsToPrint.length / CARDS_PER_PAGE);
    if (!confirm(`This will generate a complete Master Set (${allCardsToPrint.length} cards) across ${numPages} print sheet(s), sorted by your custom rules. Continue?`)) {
        return;
    }

    // The rest of the printing process is the same
    const DPI = 300;
    const CARD_RENDER_WIDTH_PX = 2.5 * DPI;
    const CARD_RENDER_HEIGHT_PX = 3.5 * DPI;
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    try {
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

            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.fillText(`Master Set - Page ${page + 1}`, canvas.width / 2, 100);

            for (let i = 0; i < cardsOnThisPage.length; i++) {
                const card = cardsOnThisPage[i];
                const row = Math.floor(i / 3), col = i % 3;
                const x = (0.5 * DPI) + (col * CARD_RENDER_WIDTH_PX);
                const y = (0.5 * DPI) + (row * CARD_RENDER_HEIGHT_PX);
                
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
            a.download = `AEW-TCG-Master-Set-Page-${page + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } finally {
        document.body.removeChild(tempContainer);
        alert('Full Master Set export has finished!');
    }
}

// Initialize the dev tools UI when the page loads
document.addEventListener('DOMContentLoaded', initializeDevTools);

