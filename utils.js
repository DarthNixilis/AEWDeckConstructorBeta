// utils.js
export const CACHE_KEY = 'aewDeckBuilderState_v1'; // Versioned key

export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

export function showFatalError(error) {
    console.error('CRITICAL ERROR:', error);
    document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif; color: #d9534f;">
        <h2>Application Failed to Load</h2>
        <p>A critical error prevented the application from starting. This is often due to missing or corrupt data files (cardDatabase.txt, Keywords.txt) or a network issue.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 4px;">Stack: ${error.stack}</pre>
    </div>`;
}

export function withRetry(fn, maxRetries = 2, delay = 1000) {
    return async function(...args) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt} of ${maxRetries} failed:`, error.message);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        }
        throw lastError;
    };
}

