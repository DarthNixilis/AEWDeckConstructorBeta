// dev-tools.js
import * as state from './state.js';
import { sortCardsForPrinting } from './utils.js';

async function exportAllCardsToPrint() {
    console.log('Print button clicked. Attempting to load printing library...');
    
    try {
        // --- THIS IS THE CRITICAL FIX ---
        // Dynamically import html2canvas only when the button is clicked.
        // This prevents the library from crashing the app on startup.
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
        console.log('html2canvas loaded successfully.');

        // Now that the library is loaded, proceed with printing.
        const cardsToPrint = sortCardsForPrinting(state.cardDatabase);
        const cardsPerPage = 9;
        const totalPages = Math.ceil(cardsToPrint.length / cardsPerPage);

        for (let i = 0; i < totalPages; i++) {
            const pageNumber = i + 1;
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
                const canvas = await html2canvas(pageContainer, { scale: 3, useCORS: true, logging: false });
                const link = document.createElement('a');
                link.download = `AEW_TCG_Master_Set_Page_${pageNumber}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (canvasError) {
                console.error(`Failed to generate canvas for page ${pageNumber}:`, canvasError);
            } finally {
                document.body.removeChild(pageContainer);
            }
        }
    } catch (error) {
        console.error('Failed to load or use the html2canvas library:', error);
        alert('Could not load or use the printing library. Please check your internet connection and try again.');
    }
}

export function initializeDevTools() {
    const devToolsPanel = document.createElement('div');
    devToolsPanel.id = 'devToolsPanel';
    devToolsPanel.innerHTML = `
        <h3>Developer Tools</h3>
        <button id="printMasterSetBtn">Print Master Set</button>
    `;
    document.body.appendChild(devToolsPanel);

    // This is the event listener that was never being attached before.
    document.getElementById('printMasterSetBtn').addEventListener('click', exportAllCardsToPrint);
}

