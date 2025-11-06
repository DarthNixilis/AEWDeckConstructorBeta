// ui-renderer.js
import * as state from './state.js';

// ... (Element cache and other functions remain the same) ...

export function renderCardPool(cards) {
    console.log('renderCardPool called with', cards.length, 'cards');
    
    const container = document.getElementById('searchResults');
    if (!container) {
        console.error('searchResults container not found!');
        return;
    }

    // --- DEEPSEEK'S DEBUG: Simple Fallback Rendering ---
    container.innerHTML = '';
    
    if (cards.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: red;">
                <strong>NO CARDS TO DISPLAY</strong><br>
                Total in database: ${state.cardDatabase.length}<br>
                Filtered count: 0
            </div>
        `;
        return;
    }

    // Simple list as fallback
    cards.slice(0, 50).forEach(card => {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `<strong>${card.title}</strong> - ${card.type} (Cost: ${card.cost ?? 'N/A'})`;
        container.appendChild(div);
    });
    
    if (cards.length > 50) {
        const more = document.createElement('div');
        more.style.padding = '10px';
        more.style.textAlign = 'center';
        more.style.color = '#666';
        more.textContent = `... and ${cards.length - 50} more cards`;
        container.appendChild(more);
    }
    // --- END OF DEEPSEEK'S DEBUG ---
}

// ... (The rest of the rendering functions remain, but will be bypassed by the debug code) ...

