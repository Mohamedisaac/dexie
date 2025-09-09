'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // 1. SETUP: VARIABLES AND DATABASE
    // ===================================================================
    // ... (All previous variables are the same)
    
    // NEW: Theme Toggle reference
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const body = document.body;

    // ... (The rest of the variables are the same)
    const db = new Dexie('TerminologyDictionary');
    const dictionaryFiles = ['xisaab.json', 'bayoloji.json', 'fisikis.json', 'soomaali_mansuur.json', 'juqraafi.json', 'doorashooyinka.json'];
    const installButton = document.getElementById('install-button');
    const searchTab = document.getElementById('search-tab');
    const showAllTab = document.getElementById('show-all-tab');
    const searchTabBtn = document.getElementById('search-tab-btn');
    const showAllTabBtn = document.getElementById('show-all-tab-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const dictionarySelect = document.getElementById('dictionary-select');
    const viewport = document.getElementById('virtual-viewport');
    const content = document.getElementById('virtual-content');
    const infoButton = document.getElementById('info-button');
    const aboutModal = document.getElementById('about-modal');
    const modalCloseButton = document.querySelector('.modal-close-button');
    let currentDictionary = '';
    let totalEntries = 0;
    const entryHeight = 45;
    let deferredPrompt;
    let isScrolling = false;
    db.version(1).stores({
        xisaab: '++id, term, definition',
        bayoloji: '++id, term, definition',
        fisikis: '++id, term, definition',
        soomaali_mansuur: '++id, term, definition',
        juqraafi: '++id, term, definition',
        doorashooyinka: '++id, term, definition'
    });

    // ===================================================================
    // 2. CORE FUNCTIONS (Unchanged)
    // ===================================================================
    async function populateDatabase() { /* ... */ }
    async function renderVisibleEntries() { /* ... */ }
    function loadDictionaryList() { /* ... */ }

    // ===================================================================
    // 3. EVENT LISTENERS
    // ===================================================================
    
    // --- NEW: Theme Toggle Listener ---
    themeToggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        // Save preference and update icon
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggleButton.textContent = '☀️';
        } else {
            localStorage.removeItem('theme');
            themeToggleButton.textContent = '🌙';
        }
    });

    // --- Other Listeners (Unchanged) ---
    // ... (All other event listeners are the same)
    infoButton.addEventListener('click', () => { aboutModal.classList.add('show'); });
    modalCloseButton.addEventListener('click', () => { aboutModal.classList.remove('show'); });
    aboutModal.addEventListener('click', (event) => { if (event.target === aboutModal) { aboutModal.classList.remove('show'); } });
    searchTabBtn.addEventListener('click', () => { searchTab.classList.add('active'); showAllTab.classList.remove('active'); searchTabBtn.classList.add('active'); showAllTabBtn.classList.remove('active'); });
    showAllTabBtn.addEventListener('click', () => { showAllTab.classList.add('active'); searchTab.classList.remove('active'); showAllTabBtn.classList.add('active'); searchTabBtn.classList.remove('active'); if (totalEntries > 0) { setTimeout(renderVisibleEntries, 0); } });
    search