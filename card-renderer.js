// card-renderer.js

import * as state from './config.js';
import { toPascalCase } from './config.js';

// --- PRIVATE: Renders the small placeholder visual for the grid view ---
function generateCardPlaceholderHTML(card) {
    const imageName = toPascalCase(card.title);
    const imagePath = `card-images/${imageName}.png?v=${new Date().getTime()}`;
    const typeClass = `type-${card.card_type.toLowerCase()}`;
    const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;

    const placeholderHTML = `
        <div class="placeholder-card">
            <div class="placeholder-header"><span>${card.title}</span></div>
            <div class="placeholder-stats-line">
                <div class="stats-left">
                    <span>D: ${card.damage ?? 'N/A'}</span>
                    <span>M: ${card.momentum ?? 'N/A'}</span>
                    ${targetValue ? `<span>T: ${targetValue}</span>` : ''}
                </div>
                <div class="cost-right"><span>C: ${card.cost ?? 'N/A'}</span></div>
            </div>
            <div class="placeholder-art-area"><span>Art Missing</span></div>
            <div class="placeholder-type-line ${typeClass}"><span>${card.card_type}</span></div>
            <div class="placeholder-text-box">
                <p>${card.text_box?.raw_text || ''}</p>
            </div>
        </div>`;
    return `<img src="${imagePath}" alt="${card.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display: none;">${placeholderHTML}</div>`;
}

// --- PUBLIC: Used by ui.js to render cards in the main card pool ---
export function generateCardVisualHTML(card) {
    return generateCardPlaceholderHTML(card);
}

// --- PRIVATE: Helper for fitting titles on playtest cards ---
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

// --- PUBLIC: The main playtest card HTML generator, used by deck-actions.js ---
export async function generatePlaytestCardHTML(card, tempContainer) {
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

    // --- Brute-force formatting logic ---
    let rawText = card.text_box?.raw_text || '';
    const abilityKeywords = ['Ongoing', 'Enters', 'Finisher', 'Tie-Up Action', 'Recovery Action', 'Tie-Up Enters', 'Ready Enters'];
    const personaExceptions = ['Chris Jericho'];
    const delimiter = '|||';

    let tempText = rawText;
    abilityKeywords.forEach(kw => {
        const regex = new RegExp(`(^|\\s)(${kw})`, 'g');
        tempText = tempText.replace(regex, `$1${delimiter}$2`);
    });

    let lines = tempText.split(delimiter).map(line => line.trim()).filter(line => line);
    const finalLines = [];
    for (let i = 0; i < lines.length; i++) {
        let currentLine = lines[i];
        let isException = false;
        if (finalLines.length > 0) {
            const previousLine = finalLines[finalLines.length - 1];
            for (const persona of personaExceptions) {
                if (previousLine.endsWith(persona) && abilityKeywords.some(kw => currentLine.startsWith(kw))) {
                    isException = true;
                    break;
                }
            }
             if (previousLine.includes("gains '") && abilityKeywords.some(kw => currentLine.startsWith(kw))) {
                 isException = true;
             }
        }

        if (isException) {
            finalLines[finalLines.length - 1] += ` ${currentLine}`;
        } else {
            finalLines.push(currentLine);
        }
    }
    const formattedText = finalLines.join('<br><br>');
    // --- End of logic ---

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
