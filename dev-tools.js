// dev-tools.js
import * as state from './state.js';
import { sortCardsForPrinting } from './utils.js';

// This function now correctly tells html2canvas to avoid WebGPU
async function exportAllCardsToPrint() {
    console.log('Starting master set export...');
    const cardsToPrint = sortCardsForPrinting(state.cardDatabase);
    const cardsPerPage = 9;
    const totalPages = Math.ceil(cardsToPrint.length / cardsPerPage);

    for (let i = 0; i < totalPages; i++) {
        const pageNumber = i + 1;
        console.log(`Generating page ${pageNumber} of ${totalPages}...`);

        const pageContainer = document.createElement('div');
        pageContainer.className = 'print-sheet';

        const pageCards = cardsToPrint.slice(i * cardsPerPage, (i + 1) * cardsPerPage);
        pageCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'print-card';
            cardElement.innerHTML = `
                <div class="print-card-title">${card.title}</div>
                <div class="print-card-type">${card.type}</div>
                <div class="print-card-stats">Cost: ${card.cost ?? 'N/A'} | Dmg: ${card.damage ?? 'N/A'}</div>
                <div class="print-card-text">${card.card_raw_game_text || ''}</div>
            `;
            pageContainer.appendChild(cardElement);
        });

        document.body.appendChild(pageContainer);

        try {
            // --- THIS IS THE CRITICAL FIX ---
            // We explicitly disable WebGPU to prevent crashes on mobile browsers.
            const canvas = await html2canvas(pageContainer, {
                scale: 3, // for 300 DPI on a 96 DPI screen
                useCORS: true,
                logging: true,
                onclone: (doc) => {
                    // This ensures styles are applied correctly in the cloned document
                    const style = doc.createElement('style');
                    style.innerHTML = `
                        .print-sheet { display: grid !important; }
                        .print-card { border: 1px solid black !important; }
                    `;
                    doc.head.appendChild(style);
                },
                // Add any other options needed, but avoid hardware acceleration
            });
            // --- END OF CRITICAL FIX ---

            const link = document.createElement('a');
            link.download = `AEW_TCG_Master_Set_Page_${pageNumber}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (error) {
            console.error(`Failed to generate canvas for page ${pageNumber}:`, error);
            alert(`An error occurred while generating page ${pageNumber}. Check the console for details.`);
        } finally {
            document.body.removeChild(pageContainer);
        }
    }
    console.log('Master set export finished.');
}


export function initializeDevTools() {
    const devToolsPanel = document.createElement('div');
    devToolsPanel.id = 'devToolsPanel';
    devToolsPanel.innerHTML = `
        <h3>Developer Tools</h3>
        <button id="printMasterSetBtn">Print Master Set</button>
    `;
    document.body.appendChild(devToolsPanel);

    document.getElementById('printMasterSetBtn').addEventListener('click', exportAllCardsToPrint);
}
