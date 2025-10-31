// main.js

import * as state from './config.js';
import * as ui from './ui.js';
import * as filters from './filters.js';
import * as deckState from './deck-state.js'; // NEW
import * as deckActions from './deck-actions.js'; // NEW

// --- DOM ELEMENT REFERENCES ---
const searchInput = document.getElementById('searchInput');
const exportDeckBtn = document.getElementById('exportDeck');
const clearDeckBtn = document.getElementById('clearDeck');
const wrestlerSelect = document.getElementById('wrestlerSelect');
const managerSelect = document.getElementById('managerSelect');
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
const searchResults = document.getElementById('searchResults');
const cardModal = document.getElementById('cardModal');

