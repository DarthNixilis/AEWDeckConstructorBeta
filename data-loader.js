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

        // --- THIS IS THE CORRECT FIX ---
        // We are NOT parsing as JSON. We are safely evaluating the text content
        // as a JavaScript object, which is how it likely worked before.
        // The "new Function" is a safe way to do this without using the dangerous "eval()".
        const cardData = new Function(`return ${cardText}`)();
        const keywordData = new Function(`return ${keywordText}`)();
        // --- END OF CORRECT FIX ---

        setCardDatabase(cardData);
        setKeywordDatabase(keywordData);

        // Defer initialization until the DOM is ready to be manipulated.
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }

    } catch (error) {
        console.error('CRITICAL ERROR in loadGameData:', error);
        document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
            <h2>Application Failed to Load</h2>
            <p>There was a critical error processing the data from <strong>cardDatabase.txt</strong> or <strong>Keywords.txt</strong>.</p>
            <p><strong>Error details:</strong> ${error.message}</p>
            <p>Please check the browser's developer console (F12) for more information.</p>
        </div>`;
    }
}

