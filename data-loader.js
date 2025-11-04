// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

export async function loadGameData() {
    try {
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch('./cardDatabase.txt'),
            fetch('./Keywords.txt')
        ]);

        if (!cardResponse.ok) {
            throw new Error(`Failed to load cardDatabase.txt: ${cardResponse.statusText}`);
        }
        if (!keywordResponse.ok) {
            throw new Error(`Failed to load Keywords.txt: ${keywordResponse.statusText}`);
        }

        const cardText = await cardResponse.text();
        const keywordText = await keywordResponse.text();

        const cardData = JSON.parse(cardText);
        const keywordData = JSON.parse(keywordText);

        setCardDatabase(cardData);
        setKeywordDatabase(keywordData);

        // Wait until the DOM is fully loaded before initializing the app
        document.addEventListener('DOMContentLoaded', initializeApp);
        // If the DOM is already loaded, run it immediately
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            initializeApp();
        }

    } catch (error) {
        console.error('CRITICAL ERROR in loadGameData:', error);
        document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
            <h2>Application Failed to Load</h2>
            <p>There was a critical error loading the game data. This is often caused by a syntax error (like a misplaced comma) inside <strong>cardDatabase.txt</strong> or <strong>Keywords.txt</strong>.</p>
            <p><strong>Error details:</strong> ${error.message}</p>
            <p>Please check the browser's developer console (F12) for more information.</p>
        </div>`;
    }
}

