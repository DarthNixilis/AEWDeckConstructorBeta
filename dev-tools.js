// dev-tools.js
import * as state from './state.js';
import { sortCardsForPrinting } from './utils.js';

async function exportAllCardsToPrint() {
    console.log('Starting master set export...');
    
    // --- THIS IS THE CRITICAL FIX ---
    // Dynamically import html2canvas only when the button is clicked.
    // This prevents the library from loading and crashing the app on startup.
    try {
        const { default: html2canvas } = await import('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
        console.log('html2canvas loaded successfully.');

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
                const canvas = await html2canvas(pageContainer, {
                    scale: 3,
                    useCORS: true,
                    logging: false, // Keep logging clean
                });

                const link = document.createElement('a');
                link.download = `AEW_TCG_Master_Set_Page_${pageNumber}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();

            } catch (canvasError) {
                console.error(`Failed to generate canvas for page ${pageNumber}:`, canvasError);
                alert(`An error occurred while generating page ${pageNumber}.`);
            } finally {
                document.body.removeChild(pageContainer);
            }
        }
        console.log('Master set export finished.');

    } catch (error) {
        console.error('Failed to load html2canvas library:', error);
        alert('Could not load the printing library. Please check your internet connection and try again.');
    }
    // --- END OF CRITICAL FIX ---
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

