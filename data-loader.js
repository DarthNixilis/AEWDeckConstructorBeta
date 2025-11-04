// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

export async function loadGameData() {
    try {
        // Fetch both files as plain text first.
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch('./cardDatabase.txt'),
            fetch('./Keywords.txt') 
        ]);

        if (!cardResponse.ok || !keywordResponse.ok) {
            throw new Error(`Network response was not ok. Card status: ${cardResponse.status}, Keyword status: ${keywordResponse.status}`);
        }

        // --- THIS IS THE FIX ---
        // 1. Read the content of the files as plain text.
        const cardText = await cardResponse.text();
        const keywordText = await keywordResponse.text();

        // 2. Now, try to parse that text as JSON. This is where the error was happening.
        const cardData = JSON.parse(cardText);
        const keywordData = JSON.parse(keywordText);
        // --- END OF FIX ---

        setCardDatabase(cardData);
        setKeywordDatabase(keywordData);
        
        initializeApp();

    } catch (error) {
        console.error('Failed to load or parse game data:', error);
        // I've made the error message more specific to help debug if it happens again.
        document.body.innerHTML = `<p>Error loading application data. This usually means there is a syntax error inside cardDatabase.txt or Keywords.txt. Please check the browser console for more details.</p>`;
    }
}

