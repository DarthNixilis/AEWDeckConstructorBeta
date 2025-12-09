// card-renderer.js
import * as state from './config.js';
import { toPascalCase } from './config.js';

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

// FIX 6: Export generatePlaytestCardHTML
export function generatePlaytestCardHTML(card) {
    const isPersona = card.card_type === 'Wrestler' || card.card_type === 'Manager';
    
    // Determine the color for the card type indicator
    let typeColor = 'black';
    if (card.card_type === 'Strike') typeColor = '#dc3545'; // Red-ish
    else if (card.card_type === 'Grapple') typeColor = '#007bff'; // Blue-ish
    else if (card.card_type === 'Submission') typeColor = '#ffc107'; // Yellow-ish
    else if (card.card_type === 'Action') typeColor = '#6f42c1'; // Purple-ish
    else if (card.card_type === 'Response') typeColor = '#28a745'; // Green-ish

    const momentumText = card.momentum != null ? `M: ${card.momentum}` : '';
    const damageText = !isPersona && card.damage != null ? `D: ${card.damage}` : '';
    const costText = !isPersona && card.cost != null ? `Cost: ${card.cost}` : '';
    
    // Apply syntax highlighting to keywords in text_box
    const rawText = card.text_box?.raw_text || 'No text provided.';
    const keywordList = Object.keys(state.keywordDatabase);
    let highlightedText = rawText;

    if (keywordList.length > 0) {
        // Create a regex that matches any keyword globally
        const keywordRegex = new RegExp(`(${keywordList.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'gi');
        highlightedText = rawText.replace(keywordRegex, '<strong style="color: #6f42c1;">$1</strong>');
    }
    
    return `
        <div class="card-visual playtest-proxy-visual" data-title="${card.title}" style="border: 2px solid ${typeColor};">
            <div class="playtest-header" style="border-bottom: 2px solid ${typeColor};">
                <span class="playtest-title">${card.title}</span> 
                <span class="playtest-set">(${card.set})</span>
            </div>
            <div class="playtest-cost-type">
                <span style="font-weight: bold; color: ${typeColor};">${card.card_type}</span> ${costText ? ` | ${costText}` : ''}
            </div>
            <div class="playtest-stats">
                ${damageText} ${momentumText ? (damageText ? '| ' : '') + momentumText : ''}
            </div>
            <div class="playtest-text">
                ${highlightedText}
            </div>
            <div class="playtest-signature">
                ${card['Signature For'] ? `Signature for: ${card['Signature For']}` : ''}
            </div>
        </div>
    `;
}

export async function generateCardVisualHTML(card, tempContainer) {
    // Always generate the full HTML structure
    const imageName = toPascalCase(card.title);
    const basePath = window.location.pathname.includes('/RepoName/') 
        ? window.location.pathname.substring(0, window.location.pathname.indexOf('/', 1) + 1)
        : '/';
    const imagePath = `${basePath}card-images/${imageName}.png`;

    const isPersona = card.card_type === 'Wrestler' || card.card_type === 'Manager';
    const targetValue = card.target;
    
    const titleHTML = getFittedTitleHTML(card.title, tempContainer);
    const costHTML = !isPersona && card.cost != null ? 
        `<div style="font-size: 60px; font-weight: bold; flex-shrink: 0; min-width: 120px; text-align: right;">${card.cost}C</div>` :
        `<div style="width: 120px; flex-shrink: 0;"></div>`; // Spacer for alignment

    const keywords = card.text_box?.keywords?.map(k => {
        const definition = state.keywordDatabase[k.name.trim()] || 'No definition available.';
        return `<span class="card-keyword" title="${definition}">${k.name.trim()}</span>`;
    }).join(', ');
    
    const traits = card.text_box?.traits?.map(t => `<span class="card-trait">${t.name.trim()}</span>`).join(', ');

    let typeLineHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div style="font-size: 30px; font-weight: 700;">${card.card_type}</div>
        <div style="font-size: 24px; font-style: italic;">${card.set}</div>
    </div>`;

    if (keywords || traits) {
        typeLineHTML += `<div style="font-size: 24px; margin-bottom: 15px; font-weight: 600;">
            ${keywords ? `Keywords: ${keywords}` : ''}
            ${keywords && traits ? ' | ' : ''}
            ${traits ? `Traits: ${traits}` : ''}
        </div>`;
    }

    const rawText = card.text_box?.raw_text || '';
    let textBoxFontSize = 28;
    if (rawText.length > 200) { textBoxFontSize = 24; }
    if (rawText.length > 300) { textBoxFontSize = 20; }
    
    // Apply syntax highlighting to keywords in text_box
    const keywordList = Object.keys(state.keywordDatabase);
    let highlightedText = rawText;

    if (keywordList.length > 0) {
        // Create a regex that matches any keyword globally
        const keywordRegex = new RegExp(`(${keywordList.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'gi');
        highlightedText = rawText.replace(keywordRegex, '<strong style="color: #6f42c1;">$1</strong>');
    }

    return `
        <div class="card-visual official-visual" style="width: 750px; height: 1050px; padding: 30px; display: flex; flex-direction: column; color: black; font-family: Arial, sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid black; padding-bottom: 15px; margin-bottom: 15px; gap: 15px;">
                <div style="font-size: 50px; font-weight: bold; line-height: 1.2; flex-shrink: 0; min-width: 120px;">
                    ${!isPersona ? `<span>D: ${card.damage ?? '–'}</span><br>` : ''}
                    <span>M: ${card.momentum ?? '–'}</span>
                    ${targetValue ? `<br><span>T: ${targetValue}</span>` : ''}
                </div>
                ${titleHTML}
                ${costHTML}
            </div>
            <div style="height: 200px; border: 3px solid #ccc; border-radius: 20px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; font-style: italic; font-size: 40px; color: #888; background-size: cover; background-position: center; background-image: url(${imagePath});">
                ${card.hasImage ? '' : 'Art Area (No Official Image)'}
            </div>
            ${typeLineHTML}
            <div style="background-color: #f8f9fa; border: 2px solid #ccc; border-radius: 20px; padding: 25px; font-size: ${textBoxFontSize}px; line-height: 1.4; text-align: left; flex-grow: 1;">
                ${highlightedText}
            </div>
            <div style="font-size: 20px; text-align: right; margin-top: 15px;">
                ${card['Wrestler Kit'] === 'TRUE' ? `KIT CARD: Signature for ${card['Signature For']}` : ''}
            </div>
        </div>
    `;
}

