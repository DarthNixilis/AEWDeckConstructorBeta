// main.js
import { loadGameData } from './data-loader.js';

// This is the final attempt.
// Wrap the entire application startup in a try/catch block.
// If there is ANY error during initialization, it will be displayed on the screen.
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadGameData();
    } catch (error) {
        console.error('A FATAL, UNCAUGHT ERROR OCCURRED DURING STARTUP:', error);
        document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif; color: red;">
            <h2>A FATAL ERROR OCCURRED</h2>
            <p>The application could not start due to an unexpected error. This is the final catch block.</p>
            <p><strong>Error details:</strong> ${error.message}</p>
            <pre>Stack Trace:\n${error.stack}</pre>
        </div>`;
    }
});

