// exporter.js
import * as state from './state.js';

function downloadFile(filename, content, mimeType) {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function generateTextList() {
    let text = '--- Starting Deck ---\n';
    const startingCounts = state.startingDeck.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).sort().forEach(([title, count]) => text += `${count}x ${title}\n`);
    text += '\n--- Purchase Deck ---\n';
    const purchaseCounts = state.purchaseDeck.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).sort().forEach(([title, count]) => text += `${count}x ${title}\n`);
    return text;
}

export function handleExport(action) {
    switch (action) {
        case 'export-text':
            downloadFile('decklist.txt', generateTextList(), 'text/plain');
            break;
        // Other export cases can be re-implemented here later
        default:
            console.warn(`Export action "${action}" not yet implemented.`);
            break;
    }
}

