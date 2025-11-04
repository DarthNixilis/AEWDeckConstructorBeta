// config.js
export const CACHE_KEY = 'aewDeckBuilderState';

export function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase())
              .replace(/[^a-zA-Z0-9]/g, '');
}

export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

export function isKitCard(card) {
    return card && card.traits && card.traits.includes('Kit');
}

export function isSignatureFor(card) {
    return card && card.traits && card.traits.includes('Signature');
}

