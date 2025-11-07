// dev-tools.js
import * as state from './state.js';
import { sortCardsForPrinting } from './utils.js';

async function exportAllCardsToPrint() {
    console.log('Starting master set export...');
    
    try {
        const { default: html2canvas } = await import('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
        console.log('html2canvas loaded successfully.');

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
        console.error('Failed to load html2canvas library:', error);
        alert('Could not load the printing library.');
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

    document.getElementById('printMasterSetBtn').addEventListener('click', exportAllCardsToPrint);
}

