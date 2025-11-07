// utils.js

/**
 * A simple retry wrapper for async functions.
 * @param {Function} fn The async function to try.
 * @param {number} retries Number of retries.
 * @param {number} delay Delay between retries in ms.
 * @returns {Function}
 */
export function withRetry(fn, retries = 3, delay = 1000) {
    return async function(...args) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn(...args);
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
                if (i === retries - 1) throw error;
                await new Promise(res => setTimeout(res, delay));
            }
        }
    };
}

/**
 * Displays a fatal error message to the user.
 * @param {string} message The error message to display.
 */
export function showFatalError(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.innerHTML = `
            <div style="text-align: center; color: red; padding: 20px;">
                <h2>A Fatal Error Occurred</h2>
                <p>${message}</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

/**
 * Sorts the card database for printing.
 * Wrestlers are grouped with their Kit cards.
 * @param {Array} cardDatabase The full array of card objects.
 * @returns {Array} The sorted array of cards.
 */
export function sortCardsForPrinting(cardDatabase) {
    const wrestlers = cardDatabase.filter(c => c.type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const otherCards = cardDatabase.filter(c => c.type !== 'Wrestler');

    const kitMap = new Map();
    otherCards.filter(c => c.traits && c.traits.includes('Kit')).forEach(kitCard => {
        const wrestlerName = kitCard.title.split('\'s ')[0];
        if (!kitMap.has(wrestlerName)) {
            kitMap.set(wrestlerName, []);
        }
        kitMap.get(wrestlerName).push(kitCard);
    });

    const sortedPrintList = [];
    wrestlers.forEach(wrestler => {
        sortedPrintList.push(wrestler);
        const kits = kitMap.get(wrestler.title);
        if (kits) {
            kits.sort((a, b) => a.title.localeCompare(b.title));
            sortedPrintList.push(...kits);
        }
    });

    const nonWrestlerNonKitCards = otherCards
        .filter(c => !c.traits || !c.traits.includes('Kit'))
        .sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            if ((a.cost ?? 99) !== (b.cost ?? 99)) return (a.cost ?? 99) - (b.cost ?? 99);
            return a.title.localeCompare(b.title);
        });

    sortedPrintList.push(...nonWrestlerNonKitCards);
    return sortedPrintList;
}

