document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REFERENCES ---
    const searchInput = document.getElementById('searchInput');
    const cascadingFiltersContainer = document.getElementById('cascadingFiltersContainer');
    const searchResults = document.getElementById('searchResults');
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const startingDeckCount = document.getElementById('startingDeckCount');
    const purchaseDeckCount = document.getElementById('purchaseDeckCount');
    const exportDeckBtn = document.getElementById('exportDeck');
    const clearDeckBtn = document.getElementById('clearDeck');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const personaDisplay = document.getElementById('personaDisplay');
    const cardModal = document.getElementById('cardModal');
    const modalCardContent = document.getElementById('modalCardContent');
    const modalCloseButton = cardModal.querySelector('.modal-close-button');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const sortSelect = document.getElementById('sortSelect');
    const showZeroCostCheckbox = document.getElementById('showZeroCost');
    const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
    const gridSizeControls = document.getElementById('gridSizeControls');
    const importDeckBtn = document.getElementById('importDeck');
    const importModal = document.getElementById('importModal');
    const importModalCloseBtn = importModal.querySelector('.modal-close-button');
    const deckFileInput = document.getElementById('deckFileInput');
    const deckTextInput = document.getElementById('deckTextInput');
    const processImportBtn = document.getElementById('processImportBtn');
    const importStatus = document.getElementById('importStatus');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');
    const startingDeckHeader = document.getElementById('startingDeckHeader');
    const purchaseDeckHeader = document.getElementById('purchaseDeckHeader');

    // --- STATE MANAGEMENT ---
    let cardDatabase = [];
    let keywordDatabase = {};
    let startingDeck = [];
    let purchaseDeck = [];
    let selectedWrestler = null;
    let selectedManager = null;
    let activeFilters = [{}, {}, {}];
    let currentViewMode = 'grid';
    let currentSort = 'alpha-asc';
    let showZeroCost = true;
    let showNonZeroCost = true;
    let numGridColumns = 2;
    let lastFocusedElement;
    const CACHE_KEY = 'aewDeckBuilderCache';

    // --- UTILITY ---
    function toPascalCase(str) { if (!str) return ''; return str.replace(/[^a-zA-Z0-9\s]+/g, '').split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(''); }
    function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; }

    // --- CACHING ---
    function saveStateToCache() {
        const state = { wrestler: selectedWrestler ? selectedWrestler.title : null, manager: selectedManager ? selectedManager.title : null, startingDeck: startingDeck, purchaseDeck: purchaseDeck };
        localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    }

    function loadStateFromCache() {
        const cachedState = localStorage.getItem(CACHE_KEY);
        if (cachedState) {
            const state = JSON.parse(cachedState);
            startingDeck = state.startingDeck || [];
            purchaseDeck = state.purchaseDeck || [];
            if (state.wrestler) {
                const wrestlerExists = Array.from(wrestlerSelect.options).some(opt => opt.value === state.wrestler);
                if (wrestlerExists) {
                    wrestlerSelect.value = state.wrestler;
                    selectedWrestler = cardDatabase.find(c => c.title === state.wrestler);
                }
            }
            if (state.manager) {
                const managerExists = Array.from(managerSelect.options).some(opt => opt.value === state.manager);
                if (managerExists) {
                    managerSelect.value = state.manager;
                    selectedManager = cardDatabase.find(c => c.title === state.manager);
                }
            }
        }
    }

    // --- DATA LOADING ---
    async function loadGameData() {
        try {
            searchResults.innerHTML = '<p>Loading card data...</p>';
            const [cardResponse, keywordResponse] = await Promise.all([
                fetch(`./cardDatabase.txt?v=${new Date().getTime()}`),
                fetch(`./keywords.txt?v=${new Date().getTime()}`)
            ]);
            if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
            if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);
            
            const tsvData = await cardResponse.text();
            const cardLines = tsvData.trim().split(/\r?\n/);
            const cardHeaders = cardLines.shift().trim().split('\t').map(h => h.trim());
            cardDatabase = cardLines.map(line => {
                const values = line.split('\t');
                const card = {};
                cardHeaders.forEach((header, index) => {
                    const value = (values[index] || '').trim();
                    if (value === 'null' || value === '') card[header] = null;
                    else if (!isNaN(value) && value !== '') card[header] = Number(value);
                    else card[header] = value;
                });
                card.title = card['Card Name'];
                card.card_type = card['Type'];
                card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
                card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
                card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];
                card.text_box = { raw_text: card['Card Raw Game Text'] };
                if (card.Keywords) card.text_box.keywords = card.Keywords.split(',').map(name => ({ name: name.trim() })).filter(k => k.name);
                else card.text_box.keywords = [];
                if (card.Traits) card.text_box.traits = card.Traits.split(',').map(traitStr => {
                    const [name, value] = traitStr.split(':');
                    return { name: name.trim(), value: value ? value.trim() : undefined };
                }).filter(t => t.name);
                else card.text_box.traits = [];
                return card;
            }).filter(card => card.title);

            const keywordText = await keywordResponse.text();
            keywordDatabase = {};
            const keywordLines = keywordText.trim().split(/\r?\n/);
            keywordLines.forEach(line => {
                if (line.trim() === '') return;
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    keywordDatabase[key] = value;
                }
            });

            initializeApp();

        } catch (error) {
            console.error("Fatal Error during data load:", error);
            searchResults.innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><strong>FATAL ERROR:</strong> ${error.message}<br><br><button onclick="location.reload()">Retry</button></div>`;
        }
    }

    // --- INITIALIZATION ---
    function initializeApp() {
        setupEventListeners();
        addDeckSearchFunctionality();
        
        viewModeToggle.textContent = currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        gridSizeControls.querySelector(`[data-columns="${numGridColumns}"]`).classList.add('active');

        populatePersonaSelectors();
        loadStateFromCache(); 
        
        renderCascadingFilters();
        renderDecks();
        renderPersonaDisplay();
        refreshCardPool();
    }

    // --- DECK & PERSONA HELPERS ---
    function isKitCard(card) { return card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE'; }
    function isSignatureFor(card) {
        if (!card || !card['Signature For']) return false;
        const activePersonaTitles = [];
        if (selectedWrestler) activePersonaTitles.push(selectedWrestler.title);
        if (selectedManager) activePersonaTitles.push(selectedManager.title);
        return activePersonaTitles.includes(card['Signature For']);
    }

    // --- RENDERING ---
    function renderCardPool(cards) {
        searchResults.innerHTML = '';
        searchResults.className = `card-list ${currentViewMode}-view`;
        if (currentViewMode === 'grid') searchResults.setAttribute('data-columns', numGridColumns);
        else searchResults.removeAttribute('data-columns');
        
        if (cards.length === 0) {
            searchResults.innerHTML = '<p>No cards match the current filters.</p>';
            return;
        }
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = currentViewMode === 'list' ? 'card-item' : 'grid-card-item';
            if (isSignatureFor(card)) cardElement.classList.add('signature-highlight');
            cardElement.dataset.title = card.title;
            if (currentViewMode === 'list') {
                cardElement.innerHTML = `<span data-title="${card.title}">${card.title} (C:${card.cost ?? 'N/A'}, D:${card.damage ?? 'N/A'}, M:${card.momentum ?? 'N/A'})</span>`;
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'card-buttons';
                if (card.cost === 0) buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
                else buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
                cardElement.appendChild(buttonsDiv);
            } else {
                const visualHTML = generateCardVisualHTML(card);
                cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div>`;
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'card-buttons';
                if (card.cost === 0) buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
                else buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
                cardElement.appendChild(buttonsDiv);
            }
            searchResults.appendChild(cardElement);
        });
    }

    function generateCardVisualHTML(card) {
        const imageName = toPascalCase(card.title);
        const imagePath = `card-images/${imageName}.png?v=${new Date().getTime()}`;
        const keywords = card.text_box?.keywords || [];
        const traits = card.text_box?.traits || [];
        let keywordsText = keywords.map(kw => `<strong>${kw.name.trim()}:</strong> ${keywordDatabase[kw.name.trim()] || 'Definition not found.'}`).join('<br>');
        let traitsText = traits.map(tr => `<strong>${tr.name.trim()}</strong>${tr.value ? `: ${tr.value}` : ''}`).join('<br>');
        const targetTrait = traits.find(t => t.name.trim() === 'Target');
        const targetValue = targetTrait ? targetTrait.value : null;
        const typeClass = `type-${card.card_type.toLowerCase()}`;
        const placeholderHTML = `
            <div class="placeholder-card">
                <div class="placeholder-header"><span>${card.title}</span></div>
                <div class="placeholder-stats-line">
                    <div class="stats-left">
                        <span>D: ${card.damage ?? 'N/A'}</span>
                        <span>M: ${card.momentum ?? 'N/A'}</span>
                        ${targetValue ? `<span>T: ${targetValue}</span>` : ''}
                    </div>
                    <div class="cost-right"><span>C: ${card.cost ?? 'N/A'}</span></div>
                </div>
                <div class="placeholder-art-area"><span>Art Missing</span></div>
                <div class="placeholder-type-line ${typeClass}"><span>${card.card_type}</span></div>
                <div class="placeholder-text-box">
                    <p>${card.text_box?.raw_text || ''}</p>
                    ${keywordsText ? `<hr><p>${keywordsText}</p>` : ''}
                    ${traitsText ? `<hr><p>${traitsText}</p>` : ''}
                </div>
            </div>`;
        return `<img src="${imagePath}" alt="${card.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display: none;">${placeholderHTML}</div>`;
    }

    function renderPersonaDisplay() {
        if (!selectedWrestler) { personaDisplay.style.display = 'none'; return; }
        personaDisplay.style.display = 'block';
        personaDisplay.innerHTML = '<h3>Persona & Kit</h3><div class="persona-card-list"></div>';
        const list = personaDisplay.querySelector('.persona-card-list');
        list.innerHTML = ''; 
        const cardsToShow = new Set();
        const activePersona = [];
        if (selectedWrestler) activePersona.push(selectedWrestler);
        if (selectedManager) activePersona.push(selectedManager);
        activePersona.forEach(p => cardsToShow.add(p));
        const activePersonaTitles = activePersona.map(p => p.title);
        const kitCards = cardDatabase.filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
        kitCards.forEach(card => cardsToShow.add(card));
        const sortedCards = Array.from(cardsToShow).sort((a, b) => {
            if (a.card_type === 'Wrestler') return -1; if (b.card_type === 'Wrestler') return 1;
            if (a.card_type === 'Manager') return -1; if (b.card_type === 'Manager') return 1;
            return a.title.localeCompare(b.title);
        });
        sortedCards.forEach(card => {
            const item = document.createElement('div');
            item.className = 'persona-card-item';
            item.textContent = card.title;
            item.dataset.title = card.title;
            list.appendChild(item);
        });
    }

    function showCardModal(cardTitle) {
        lastFocusedElement = document.activeElement;
        const card = cardDatabase.find(c => c.title === cardTitle);
        if (!card) return;
        modalCardContent.innerHTML = generateCardVisualHTML(card);
        cardModal.style.display = 'flex';
        cardModal.setAttribute('role', 'dialog');
        cardModal.setAttribute('aria-modal', 'true');
        modalCloseButton.focus();
    }

    function renderDecks() {
        renderDeckList(startingDeckList, startingDeck, 'starting');
        renderDeckList(purchaseDeckList, purchaseDeck, 'purchase');
        updateDeckCounts();
        saveStateToCache();
    }

    function renderDeckList(element, deck, deckName) {
        element.innerHTML = '';
        const cardCounts = deck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
        Object.entries(cardCounts).forEach(([cardTitle, count]) => {
            const card = cardDatabase.find(c => c.title === cardTitle);
            if (!card) return;
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            cardElement.innerHTML = `<span data-title="${card.title}">${count}x ${card.title}</span><button data-title="${card.title}" data-deck="${deckName}">Remove</button>`;
            element.appendChild(cardElement);
        });
    }
    
    function updateDeckCounts() {
        startingDeckCount.textContent = startingDeck.length;
        purchaseDeckCount.textContent = purchaseDeck.length;
        startingDeckCount.parentElement.style.color = startingDeck.length === 24 ? 'green' : 'red';
        startingDeckHeader.style.color = startingDeck.length === 24 ? 'green' : 'inherit';
        purchaseDeckCount.parentElement.style.color = purchaseDeck.length >= 36 ? 'green' : 'red';
        purchaseDeckHeader.style.color = purchaseDeck.length >= 36 ? 'green' : 'inherit';
    }

    // --- DECK CONSTRUCTION & MANIPULATION ---
    function addCardToDeck(cardTitle, targetDeck) {
        const card = cardDatabase.find(c => c.title === cardTitle);
        if (!card) return;
        if (isKitCard(card)) { alert(`"${card.title}" is a Kit card and cannot be added to your deck during construction.`); return; }
        const totalCount = (startingDeck.filter(title => title === cardTitle).length) + (purchaseDeck.filter(title => title === cardTitle).length);
        if (totalCount >= 3) { alert(`Rule Violation: Max 3 copies of "${card.title}" allowed in total.`); return; }
        if (targetDeck === 'starting') {
            if (card.cost !== 0) { alert(`Rule Violation: Only 0-cost cards allowed in Starting Deck.`); return; }
            if (startingDeck.length >= 24) { alert(`Rule Violation: Starting Deck is full (24 cards).`); return; }
            if (startingDeck.filter(title => title === cardTitle).length >= 2) { alert(`Rule Violation: Max 2 copies of "${card.title}" allowed in Starting Deck.`); return; }
            startingDeck.push(cardTitle);
        } else { purchaseDeck.push(cardTitle); }
        renderDecks();
    }

    function removeCardFromDeck(cardTitle, deckName) {
        const deck = deckName === 'starting' ? startingDeck : purchaseDeck;
        const cardIndex = deck.lastIndexOf(cardTitle);
        if (cardIndex > -1) { deck.splice(cardIndex, 1); renderDecks(); }
    }

    // --- FILTERS & SORTING ---
    const filterFunctions = {
        'Card Type': (card, value) => { if (value === 'Maneuver') return ['Strike', 'Grapple', 'Submission'].includes(card.card_type); return card.card_type === value; },
        'Keyword': (card, value) => card.text_box?.keywords?.some(k => k.name.trim() === value),
        'Trait': (card, value) => card.text_box?.traits?.some(t => t.name.trim() === value),
    };

    function getAvailableFilterOptions(cards) {
        const options = { 'Card Type': new Set(), 'Keyword': new Set(), 'Trait': new Set() };
        cards.forEach(card => {
            if (card && card.card_type) options['Card Type'].add(card.card_type);
            if (card && card.text_box?.keywords) card.text_box.keywords.forEach(k => { if (k.name) options['Keyword'].add(k.name.trim()); });
            if (card && card.text_box?.traits) card.text_box.traits.forEach(t => { if (t.name) options['Trait'].add(t.name.trim()); });
        });
        const sortedTypes = Array.from(options['Card Type']).sort();
        if (sortedTypes.some(type => ['Strike', 'Grapple', 'Submission'].includes(type))) sortedTypes.unshift('Maneuver');
        return { 'Card Type': sortedTypes, 'Keyword': Array.from(options['Keyword']).sort(), 'Trait': Array.from(options['Trait']).sort() };
    }

    function renderCascadingFilters() {
        cascadingFiltersContainer.innerHTML = '';
        const availableOptions = getAvailableFilterOptions(cardDatabase);
        ['Card Type', 'Keyword', 'Trait'].forEach((category, index) => {
            const select = document.createElement('select');
            select.innerHTML = `<option value="">-- Select ${category} --</option>`;
            availableOptions[category].forEach(opt => select.add(new Option(opt, opt)));
            select.value = activeFilters[index]?.value || '';
            select.onchange = (e) => {
                activeFilters[index] = { category: category, value: e.target.value };
                for (let j = index + 1; j < 3; j++) activeFilters[j] = {};
                renderCascadingFilters();
                refreshCardPool();
            };
            cascadingFiltersContainer.appendChild(select);
        });
    }

    function refreshCardPool() {
        const query = searchInput.value.toLowerCase();
        let cards = cardDatabase.filter(card => {
            if (!card || !card.title) return false; 
            if (card.card_type === 'Wrestler' || card.card_type === 'Manager' || isKitCard(card)) return false;
            if (!showZeroCost && card.cost === 0) return false;
            if (!showNonZeroCost && card.cost > 0) return false;
            const rawText = card.text_box?.raw_text || '';
            return query === '' || card.title.toLowerCase().includes(query) || rawText.toLowerCase().includes(query);
        });

        activeFilters.forEach(filter => {
            if (filter && filter.value) {
                const filterFunc = filterFunctions[filter.category];
                if (filterFunc) cards = cards.filter(card => filterFunc(card, filter.value));
            }
        });

        const [sortBy, direction] = currentSort.split('-');
        cards.sort((a, b) => {
            let valA, valB;
            switch (sortBy) {
                case 'alpha': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
                case 'cost': valA = a.cost ?? -1; valB = b.cost ?? -1; break;
                case 'damage': valA = a.damage ?? -1; valB = b.damage ?? -1; break;
                case 'momentum': valA = a.momentum ?? -1; valB = b.momentum ?? -1; break;
                default: return 0;
            }
            if (direction === 'asc') return valA > valB ? 1 : -1;
            else return valA < valB ? 1 : -1;
        });

        renderCardPool(cards);
    }

    // --- DECK IMPORT/EXPORT ---
    function validateDeck() {
        const issues = [];
        if (!selectedWrestler) issues.push("No wrestler selected.");
        if (!selectedManager) issues.push("No manager selected.");
        if (startingDeck.length !== 24) issues.push(`Starting deck has ${startingDeck.length} cards (needs 24).`);
        if (purchaseDeck.length < 36) issues.push(`Purchase deck has ${purchaseDeck.length} cards (needs at least 36).`);
        const allCardTitles = [...startingDeck, ...purchaseDeck];
        const cardCounts = allCardTitles.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
        Object.entries(cardCounts).forEach(([cardTitle, count]) => {
            if (count > 3) {
                const card = cardDatabase.find(c => c.title === cardTitle);
                issues.push(`Too many copies of ${card.title} (${count} copies, max 3).`);
            }
        });
        return issues;
    }

    function generatePlainTextDeck() {
        const activePersonaTitles = [];
        if (selectedWrestler) activePersonaTitles.push(selectedWrestler.title);
        if (selectedManager) activePersonaTitles.push(selectedManager.title);
        const kitCards = cardDatabase.filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For'])).sort((a, b) => a.title.localeCompare(b.title));
        let text = `Wrestler: ${selectedWrestler.title}\n`;
        text += `Manager: ${selectedManager ? selectedManager.title : 'None'}\n`;
        kitCards.forEach((card, index) => { text += `Kit${index + 1}: ${card.title}\n`; });
        text += `\n--- Starting Deck (${startingDeck.length}/24) ---\n`;
        const startingCounts = startingDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
        Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
        text += `\n--- Purchase Deck (${purchaseDeck.length}/36+) ---\n`;
        const purchaseCounts = purchaseDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
        Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { text += `${count}x ${cardTitle}\n`; });
        return text;
    }

    function parseAndLoadDeck(text) {
        try {
            const lines = text.trim().split(/\r?\n/);
            let newWrestler = null;
            let newManager = null;
            let newStartingDeck = [];
            let newPurchaseDeck = [];
            let currentSection = '';

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
                    const wrestlerName = trimmedLine.substring(9).trim();
                    const wrestler = cardDatabase.find(c => c.title === wrestlerName && c.card_type === 'Wrestler');
                    if (wrestler) newWrestler = wrestler;
                } else if (trimmedLine.toLowerCase().startsWith('manager:')) {
                    const managerName = trimmedLine.substring(8).trim();
                    if (managerName.toLowerCase() !== 'none') {
                        const manager = cardDatabase.find(c => c.title === managerName && c.card_type === 'Manager');
                        if (manager) newManager = manager;
                    }
                } else if (trimmedLine.startsWith('--- Starting Deck')) {
                    currentSection = 'starting';
                } else if (trimmedLine.startsWith('--- Purchase Deck')) {
                    currentSection = 'purchase';
                } else if (trimmedLine.toLowerCase().startsWith('kit')) {
                    // Ignore Kit lines for now
                } else {
                    const match = trimmedLine.match(/^(\d+)x\s+(.+)/);
                    if (match) {
                        const count = parseInt(match[1], 10);
                        const cardName = match[2].trim();
                        const card = cardDatabase.find(c => c.title === cardName);
                        if (card) {
                            for (let i = 0; i < count; i++) {
                                if (currentSection === 'starting') newStartingDeck.push(card.title);
                                else if (currentSection === 'purchase') newPurchaseDeck.push(card.title);
                            }
                        }
                    }
                }
            });

            if (!newWrestler) {
                importStatus.textContent = 'Error: Wrestler not found or invalid in the decklist.';
                importStatus.style.color = 'red';
                return;
            }

            selectedWrestler = newWrestler;
            selectedManager = newManager;
            startingDeck = newStartingDeck;
            purchaseDeck = newPurchaseDeck;

            wrestlerSelect.value = selectedWrestler.title;
            managerSelect.value = selectedManager ? selectedManager.title : "";
            renderDecks();
            renderPersonaDisplay();
            refreshCardPool();

            importStatus.textContent = 'Deck imported successfully!';
            importStatus.style.color = 'green';
            setTimeout(() => { importModal.style.display = 'none'; }, 1500);

        } catch (error) {
            console.error('Error parsing decklist:', error);
            importStatus.textContent = `An unexpected error occurred: ${error.message}`;
            importStatus.style.color = 'red';
        }
    }

    async function exportDeckAsImage() {
        const allCards = [...startingDeck, ...purchaseDeck];
        const uniqueCardTitles = [...new Set(allCards)];
        const cardsToPrint = uniqueCardTitles.map(title => cardDatabase.find(c => c.title === title));
        
        if (cardsToPrint.length === 0) {
            alert("There are no cards in the deck to export.");
            return;
        }

        const cardWidth = 375;
        const cardHeight = 523;
        const padding = 20;
        const cardsPerRow = 9;
        const numRows = Math.ceil(cardsToPrint.length / cardsPerRow);

        const canvas = document.createElement('canvas');
        canvas.width = (cardWidth * cardsPerRow) + (padding * (cardsPerRow + 1));
        canvas.height = (numRows * cardHeight) + (padding * (numRows + 1));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        alert(`Generating image for ${cardsToPrint.length} unique cards. This may take a moment...`);

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        for (let i = 0; i < cardsToPrint.length; i++) {
            const card = cardsToPrint[i];
            const row = Math.floor(i / cardsPerRow);
            const col = i % cardsPerRow;

            const x = (col * cardWidth) + (padding * (col + 1));
            const y = (row * cardHeight) + (padding * (row + 1));

            const cardElement = document.createElement('div');
            cardElement.style.width = `${cardWidth}px`;
            cardElement.style.height = `${cardHeight}px`;
            cardElement.innerHTML = generateCardVisualHTML(card);
            tempContainer.appendChild(cardElement);
            
            await new Promise(resolve => setTimeout(resolve, 50));

            const cardCanvas = await html2canvas(cardElement, {
                width: cardWidth,
                height: cardHeight,
                scale: 1
            });
            ctx.drawImage(cardCanvas, x, y);
            tempContainer.innerHTML = '';
        }
        document.body.removeChild(tempContainer);

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${toPascalCase(selectedWrestler.title)}-Deck.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        alert('Deck image generated and download has started!');
    }

    // --- EVENT LISTENERS ---
    function addDeckSearchFunctionality() {
        const startingDeckSearch = document.createElement('input');
        startingDeckSearch.type = 'text';
        startingDeckSearch.placeholder = 'Search starting deck...';
        startingDeckSearch.className = 'deck-search-input';
        startingDeckSearch.addEventListener('input', debounce(() => filterDeckList(startingDeckList, startingDeckSearch.value), 300));
        
        const purchaseDeckSearch = document.createElement('input');
        purchaseDeckSearch.type = 'text';
        purchaseDeckSearch.placeholder = 'Search purchase deck...';
        purchaseDeckSearch.className = 'deck-search-input';
        purchaseDeckSearch.addEventListener('input', debounce(() => filterDeckList(purchase

