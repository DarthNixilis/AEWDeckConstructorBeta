// importer.js
import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';

// Helper function for case-insensitive lookup
function getCanonicalCardTitle(title) {
    const lowerTitle = title.toLowerCase();
    // cardTitleCache keys are canonical (e.g., "Buckshot Lariat")
    for (const canonicalTitle in state.cardTitleCache) {
        if (canonicalTitle.toLowerCase() === lowerTitle) {
            return canonicalTitle;
        }
    }
    return null;
}

export function parseAndLoadDeck(text) {
    const importStatus = document.getElementById('importStatus');
    const importModal = document.getElementById('importModal');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    try {
        const lines = text.trim().split(/\r?\n/);
        let newWrestler = null, newManager = null, newStartingDeck = [], newPurchaseDeck = [], currentSection = '';
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.toLowerCase().startsWith('kit')) return;
            
            if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
                const wrestlerName = trimmedLine.substring(9).trim();
                const canonicalWrestlerName = getCanonicalCardTitle(wrestlerName);
                if (canonicalWrestlerName) {
                    const wrestler = state.cardTitleCache[canonicalWrestlerName];
                    if (wrestler && wrestler.card_type === 'Wrestler') newWrestler = wrestler;
                }
            } else if (trimmedLine.toLowerCase().startsWith('manager:')) {
                const managerName = trimmedLine.substring(8).trim();
                if (managerName.toLowerCase() !== 'none') {
                    const canonicalManagerName = getCanonicalCardTitle(managerName); // FIX: Added canonical lookup
                    if (canonicalManagerName) {                                    
                        const manager = state.cardTitleCache[canonicalManagerName]; // FIX: Used canonical name
                        if (manager && manager.card_type === 'Manager') newManager = manager;
                    }
                }
            } else if (trimmedLine.startsWith('--- Starting Deck')) {
                currentSection = 'starting';
            } else if (trimmedLine.startsWith('--- Purchase Deck')) {
                currentSection = 'purchase';
            } else {
                const match = trimmedLine.match(/^(\d+)x\s+(.+)/);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const cardName = match[2].trim();
                    
                    // Already using canonical lookup here for general cards
                    const canonicalCardName = getCanonicalCardTitle(cardName);

                    if (canonicalCardName) {
                        for (let i = 0; i < count; i++) {
                            if (currentSection === 'starting') newStartingDeck.push(canonicalCardName);
                            else if (currentSection === 'purchase') newPurchaseDeck.push(canonicalCardName);
                        }
                    }
                }
            }
        });
        state.setSelectedWrestler(newWrestler);
        state.setSelectedManager(newManager);
        wrestlerSelect.value = newWrestler ? newWrestler.title : "";
        managerSelect.value = newManager ? newManager.title : "";
        state.setStartingDeck(newStartingDeck);
        state.setPurchaseDeck(newPurchaseDeck);
        renderDecks();
        renderPersonaDisplay();
        document.dispatchEvent(new Event('filtersChanged'));
        importStatus.textContent = 'Deck imported successfully!';
        importStatus.style.color = 'green';
        setTimeout(() => { importModal.style.display = 'none'; }, 1500);
    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `An unexpected error occurred: ${error.message}`;
        importStatus.style.color = 'red';
    }
}

