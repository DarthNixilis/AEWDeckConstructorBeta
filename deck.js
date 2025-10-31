// deck.js

import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';
import { toPascalCase } from './config.js';

// --- DECK MANIPULATION ---
export function addCardToDeck(cardTitle, targetDeck) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;
    if (state.isKitCard(card)) {
        alert(`"${card.title}" is a Kit card and cannot be added to your deck during construction.`);
        return;
    }
    const totalCount = (state.startingDeck.filter(title => title === cardTitle).length) + (state.purchaseDeck.filter(title => title === cardTitle).length);
    if (totalCount >= 3) {
        alert(`Rule Violation: Max 3 copies of "${card.title}" allowed in total.`);
        return;
    }
    if (targetDeck === 'starting') {
        if (card.cost !== 0) { alert(`Rule Violation: Only 0-cost cards allowed in Starting Deck.`); return; }
        if (state.startingDeck.length >= 24) { alert(`Rule Violation: Starting Deck is full (24 cards).`); return; }
        if (state.startingDeck.filter(title => title === cardTitle).length >= 2) { alert(`Rule Violation: Max 2 copies of "${card.title}" allowed in Starting Deck.`); return; }
        state.startingDeck.push(cardTitle);
    } else {
        state.purchaseDeck.push(cardTitle);
    }
    renderDecks();
}

export function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const cardIndex = deck.lastIndexOf(cardTitle);
    if (cardIndex > -1) {
        deck.splice(cardIndex, 1);
        renderDecks();
    }
}

// --- DECK EXPORT & IMPORT ---
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
                const wrestler = state.cardTitleCache[wrestlerName];
                if (wrestler && wrestler.card_type === 'Wrestler') newWrestler = wrestler;
            } else if (trimmedLine.toLowerCase().startsWith('manager:')) {
                const managerName = trimmedLine.substring(8).trim();
                if (managerName.toLowerCase() !== 'none') {
                    const manager = state.cardTitleCache[managerName];
                    if (manager && manager.card_type === 'Manager') newManager = manager;
                }
            } else if (trimmedLine.startsWith('--- Starting Deck')) { currentSection = 'starting'; }
            else if (trimmedLine.startsWith('--- Purchase Deck')) { currentSection = 'purchase'; }
            else {
                const match = trimmedLine.match(/^(\d+)x\s+(.+)/);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const cardName = match[2].trim();
                    const card = state.cardTitleCache[cardName];
                    if (card) {
                        for (let i = 0; i < count; i++) {
                            if (currentSection === 'starting') newStartingDeck.push(card.title);
                            else if (currentSection === 'purchase') newPurchaseDeck.push(card.title);
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

// --- IMAGE EXPORT LOGIC ---
export async function exportDeckAsImage() {
    // --- BUGFIX #2: Correctly gather all cards, preserving quantities ---
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
    
    // Create a truly unique list of these cards to avoid printing a Wrestler twice
    const finalUniquePersonaAndKit = [...new Map(uniquePersonaAndKit.map(card => [card.title, card])).values()];

    // Get the full, non-unique list of all cards from the decks
    const mainDeckCards = [...state.startingDeck, ...state.purchaseDeck].map(title => state.cardTitleCache[title]);

    // Combine the unique persona/kit cards with the full deck list
    const allCardsToPrint = [...finalUniquePersonaAndKit, ...mainDeckCards].filter(card => card !== undefined);
    // --- END BUGFIX #2 ---

    if (allCardsToPrint.length === 0) {
        alert("There are no cards in the deck to export.");
        return;
    }

    const CARDS_PER_PAGE = 9;
    const numPages = Math.ceil(allCardsToPrint.length / CARDS_PER_PAGE);
    if (!confirm(`This will generate ${numPages} print sheet(s) for ${allCardsToPrint.length} total cards (including Persona, Kit, and all copies). This may take a moment. Continue?`)) {
        return;
    }

    const DPI = 300;
    const CARD_RENDER_WIDTH_PX = 2.5 * DPI;
    const CARD_RENDER_HEIGHT_PX = 3.5 * DPI;
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    let successCount = 0, errorCount = 0;

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
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`Failed to render card "${card.title}" to canvas:`, error);
                ctx.fillStyle = 'red';
                ctx.fillRect(x, y, CARD_RENDER_WIDTH_PX, CARD_RENDER_HEIGHT_PX);
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.font = '48px Arial';
                ctx.fillText(`Error: ${card.title}`, x + CARD_RENDER_WIDTH_PX / 2, y + CARD_RENDER_HEIGHT_PX / 2);
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
    let message = `Successfully generated ${successCount} cards.`;
    if (errorCount > 0) message = `Generated ${successCount} cards successfully. ${errorCount} cards failed to render. Check console for details.`;
    alert(message);
}

function getFittedTitleHTML(title, container) {
    let fontSize = 64;
    const MAX_WIDTH = 400;
    const MIN_FONT_SIZE = 32;
    const ruler = document.createElement('span');
    ruler.style.visibility = 'hidden';
    ruler.style.position = 'absolute';
    ruler.style.whiteSpace = 'nowrap';
    ruler.style.fontWeight = '900';
    ruler.style.fontFamily = 'Arial, sans-serif';
    ruler.textContent = title;
    container.appendChild(ruler);
    while (fontSize > MIN_FONT_SIZE) {
        ruler.style.fontSize = `${fontSize}px`;
        if (ruler.offsetWidth <= MAX_WIDTH) break;
        fontSize -= 2;
    }
    container.removeChild(ruler);
    return `<div style="font-size: ${fontSize}px; font-weight: 900; text-align: center; flex-grow: 1;">${title}</div>`;
}

async function generatePlaytestCardHTML(card, tempContainer) {
    const isPersona = card.card_type === 'Wrestler' || card.card_type === 'Manager';
    const keywords = card.text_box?.keywords || [];
    const traits = card.text_box?.traits || [];
    const reminderFontSize = '0.75em';

    let keywordsText = keywords.map(kw => {
        const definition = state.keywordDatabase[kw.name.trim()] || 'Definition not found.';
        return `<strong>${kw.name.trim()}:</strong> <span style="font-size: ${reminderFontSize}; font-style: italic;">${definition}</span>`;
    }).join('<br><br>');

    let traitsText = traits.map(tr => `<strong>${tr.name.trim()}</strong>`).join(', ');
    if (traitsText) {
        traitsText = `<p style="margin-bottom: 25px;"><span style="font-size: ${reminderFontSize}; font-style: italic;">${traitsText}</span></p>`;
    }

    const reminderBlock = traitsText + keywordsText;
    const targetTrait = traits.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;
    const typeColors = { 'Action': '#9c5a9c', 'Response': '#c84c4c', 'Submission': '#5aa05a', 'Strike': '#4c82c8', 'Grapple': '#e68a00' };
    const typeColor = typeColors[card.card_type] || '#6c757d';

    let rawText = card.text_box?.raw_text || '';
    const quotes = [];
    rawText = rawText.replace(/'[^']*'/g, (match) => {
        quotes.push(match);
        return `__QUOTE_${quotes.length - 1}__`;
    });

    // --- BUGFIX #1: Smarter line breaking ---
    const abilityKeywords = ['Ongoing', 'Enters', 'Finisher', 'Tie-Up Action', 'Recovery Action', 'Tie-Up Enters', 'Ready Enters'];
    // This list prevents breaks like "Chris Jericho Enters..."
    const personaExceptions = ['Chris Jericho']; 
    const regex = new RegExp(`\\b(${abilityKeywords.join('|')})\\b`, 'g');
    
    let formattedText = rawText.replace(regex, (match, p1, offset) => {
        // Find the word right before the match
        const precedingText = rawText.substring(0, offset);
        const lastWord = precedingText.trim().split(/\s+/).pop();
        
        // If the keyword is at the start, or the preceding word is not a persona name, add a break.
        if (offset === 0 || !personaExceptions.includes(lastWord)) {
            return '<br><br>' + match;
        }
        // Otherwise, it's a persona ability, so don't add a break.
        return match;
    });
    // --- END BUGFIX #1 ---

    formattedText = formattedText.replace(/__QUOTE_(\d+)__/g, (match, index) => {
        return quotes[parseInt(index, 10)];
    });

    const fullText = formattedText + reminderBlock;
    let textBoxFontSize = 42;
    if (fullText.length > 250) { textBoxFontSize = 34; } 
    else if (fullText.length > 180) { textBoxFontSize = 38; }

    const titleHTML = getFittedTitleHTML(card.title, tempContainer);

    const costHTML = !isPersona ? `<div style="font-size: 60px; font-weight: bold; border: 3px solid black; padding: 15px 35px; border-radius: 15px; flex-shrink: 0;">${card.cost ?? '–'}</div>` : '<div style="width: 120px; flex-shrink: 0;"></div>';
    const typeLineHTML = !isPersona ? `<div style="padding: 15px; text-align: center; font-size: 52px; font-weight: bold; border-radius: 15px; margin-bottom: 15px; color: white; background-color: ${typeColor};">${card.card_type}</div>` : `<div style="text-align: center; font-size: 52px; font-weight: bold; color: #6c757d; margin-bottom: 15px;">${card.card_type}</div>`;

    return `
        <div style="background-color: white; border: 10px solid black; border-radius: 35px; box-sizing: border-box; width: 750px; height: 1050px; padding: 30px; display: flex; flex-direction: column; color: black; font-family: Arial, sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid black; padding-bottom: 15px; margin-bottom: 15px; gap: 15px;">
                <div style="font-size: 50px; font-weight: bold; line-height: 1.2; flex-shrink: 0; min-width: 120px;">
                    ${!isPersona ? `<span>D: ${card.damage ?? '–'}</span><br>` : ''}
                    <span>M: ${card.momentum ?? '–'}</span>
                    ${targetValue ? `<br><span>T: ${targetValue}</span>` : ''}
                </div>
                ${titleHTML}
                ${costHTML}
            </div>
            
            <div style="height: 200px; border: 3px solid #ccc; border-radius: 20px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; font-style: italic; font-size: 40px; color: #888;">Art Area</div>
            
            ${typeLineHTML}
            
            <div style="background-color: #f8f9fa; border: 2px solid #ccc; border-radius: 20px; padding: 25px; font-size: ${textBoxFontSize}px; line-height: 1.4; text-align: center; white-space: pre-wrap; flex-grow: 1; overflow-y: auto;">
                <p style="margin-top: 0;">${formattedText}</p>
                ${reminderBlock ? `<hr style="border-top: 2px solid #ccc; margin: 25px 0;"><div style="margin-bottom: 0;">${reminderBlock}</div>` : ''}
            </div>
        </div>
    `;
}

