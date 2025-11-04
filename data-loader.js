// data-loader.js
import { setCardDatabase, setKeywordDatabase } from './state.js';
import { initializeApp } from './app-init.js';

export async function loadGameData() {
    try {
        // This now correctly points to your .txt files
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch('./cardDatabase.txt'),
            fetch('./Keywords.txt') 
        ]);

        if (!cardResponse.ok || !keywordResponse.ok) {
            throw new Error(`Network response was not ok. Card status: ${cardResponse.status}, Keyword status: ${keywordResponse.status}`);
        }
        const cardData = await cardResponse.json();
        const keywordData = await keywordResponse.json();

        setCardDatabase(cardData);
        setKeywordDatabase(keywordData);
        
        initializeApp();

    } catch (error) {
        console.error('Failed to load game data:', error);
        document.body.innerHTML = `<p>Error loading application data. Please check the console and verify that cardDatabase.txt and Keywords.txt exist and are valid JSON.</p>`;
    }
}

