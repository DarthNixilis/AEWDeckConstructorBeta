// utils.js

export const CACHE_KEY = 'aewDeckBuilderState_v1'; // Versioned key for easier cache management in the future

/**
 * A function that delays the execution of a function until after a certain amount of time has passed without it being called.
 * @param {Function} func The function to execute after the debounce time.
 * @param {number} delay The number of milliseconds to wait before executing the function.
 * @returns {Function} A new debounced function.
 */
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

/**
 * Displays a fatal error message to the user, replacing the entire application body.
 * This is used when the application cannot start at all.
 * @param {Error} error The error object that caused the failure.
 */
export function showFatalError(error) {
    console.error('CRITICAL ERROR:', error);
    document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif; color: #d9534f;">
        <h2>Application Failed to Load</h2>
        <p>A critical error prevented the application from starting. This is often due to missing or corrupt data files (cardDatabase.txt, keywords.txt) or a network issue.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 4px;">Stack: ${error.stack}</pre>
    </div>`;
}

/**
 * A higher-order function that wraps an async function in a retry loop.
 * @param {Function} fn The async function to retry.
 * @param {number} maxRetries The maximum number of times to retry.
 * @param {number} delay The base delay between retries, which increases with each attempt.
 * @returns {Function} A new function that will automatically retry on failure.
 */
export function withRetry(fn, maxRetries = 2, delay = 1000) {
    return async function(...args) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;
                logToScreen(`Attempt ${attempt} failed: ${error.message}`, true);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        }
        throw lastError;
    };
}

/**
 * Logs a message to both the on-screen debug panel and the browser console.
 * @param {string} message The message to log.
 * @param {boolean} [isError=false] If true, the message will be styled as an error.
 */
export function logToScreen(message, isError = false) {
    const panel = document.getElementById('debug-panel');
    if (panel) {
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        if (isError) {
            entry.style.color = '#ff4d4d'; // A brighter red for errors
        }
        panel.appendChild(entry);
        panel.scrollTop = panel.scrollHeight; // Auto-scroll to the bottom
    }
    // Also log to the console for standard debugging practices
    isError ? console.error(message) : console.log(message);
}

