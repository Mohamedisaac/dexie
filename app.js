'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // 1. SETUP: VARIABLES AND DATABASE
    // ===================================================================
    // DOM elements
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const body = document.body;
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

    // Database setup
    const db = new Dexie('TerminologyDictionary');
    const dictionaryFiles = ['xisaab.json', 'bayoloji.json', 'fisikis.json', 'soomaali_mansuur.json', 'juqraafi.json', 'doorashooyinka.json'];

    // State variables
    let currentDictionary = '';
    let totalEntries = 0;
    const entryHeight = 45; // Height of each entry in pixels for virtual scrolling
    let deferredPrompt; // For PWA install prompt
    let isScrolling = false; // Flag to debounce scroll events

    // Define database schema
    db.version(1).stores({
        xisaab: '++id, term, definition',
        bayoloji: '++id, term, definition',
        fisikis: '++id, term, definition',
        soomaali_mansuur: '++id, term, definition',
        juqraafi: '++id, term, definition',
        doorashooyinka: '++id, term, definition'
    });

    // ===================================================================
    // 2. CORE FUNCTIONS
    // ===================================================================

    /**
     * Populates the IndexedDB database from JSON dictionary files.
     * Skips population if a table already contains data.
     */
    async function populateDatabase() {
        for (const file of dictionaryFiles) {
            const tableName = file.replace('.json', '');
            const table = db[tableName];
            try {
                const count = await table.count();
                if (count > 0) {
                    // console.log(`Table '${tableName}' already populated.`);
                    continue; // Skip if already populated
                }

                const response = await fetch(file);
                if (!response.ok) {
                    throw new Error(`Network response was not ok for ${file}: ${response.statusText}`);
                }
                const data = await response.json();
                const entries = Object.entries(data).map(([term, definition]) => ({ term, definition }));
                await table.bulkAdd(entries);
                // console.log(`Populated '${tableName}' with ${entries.length} entries.`);
            } catch (error) {
                console.error(`CRITICAL ERROR while populating '${tableName}':`, error);
                // Depending on criticality, you might want to show a user-friendly error.
            }
        }
    }

    /**
     * Renders only the entries currently visible in the virtual viewport.
     * Optimizes performance for large dictionaries.
     */
    async function renderVisibleEntries() {
        if (!viewport || !currentDictionary) return;
        if (viewport.clientHeight === 0) return; // Prevent division by zero or errors if viewport not yet rendered

        const scrollTop = viewport.scrollTop;
        const startIndex = Math.floor(scrollTop / entryHeight);
        // Calculate visible item count and add some buffer for smooth scrolling
        const visibleItemCount = Math.ceil(viewport.clientHeight / entryHeight);
        const endIndex = startIndex + visibleItemCount + 2; // +2 for buffer

        try {
            const visibleEntries = await db[currentDictionary]
                .offset(startIndex)
                .limit(endIndex - startIndex)
                .toArray();

            const fragment = document.createDocumentFragment();
            visibleEntries.forEach(entryData => {
                const entryEl = document.createElement('div');
                entryEl.className = 'entry';
                entryEl.style.height = `${entryHeight}px`; // Maintain consistent height
                entryEl.innerHTML = `<strong>${entryData.term}:</strong> ${entryData.definition}`;
                fragment.appendChild(entryEl);
            });

            // Clear previous content and append new visible entries
            content.innerHTML = '';
            content.style.paddingTop = `${startIndex * entryHeight}px`; // Shift content down to simulate scroll
            content.appendChild(fragment);

        } catch (error) {
            console.error("Error rendering visible entries:", error);
        }
    }

    /**
     * Loads dictionary names into the dropdown select element.
     */
    function loadDictionaryList() {
        // Prevent re-adding options if already loaded (e.g., on multiple calls)
        if (dictionarySelect.options.length > 1) { // 1 for the default "Dooro Qaamuus" option
            return;
        }

        dictionarySelect.innerHTML = '<option value="">Dooro Qaamuus</option>'; // Default option
        for (const file of dictionaryFiles) {
            const dictionaryName = file.replace('.json', '');
            const option = document.createElement('option');
            option.value = dictionaryName;
            // Capitalize first letter for display
            option.textContent = dictionaryName.charAt(0).toUpperCase() + dictionaryName.slice(1);
            dictionarySelect.appendChild(option);
        }
    }

    // ===================================================================
    // 3. EVENT LISTENERS
    // ===================================================================

    // --- Theme Toggle Listener ---
    themeToggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        // Save preference and update icon
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggleButton.textContent = '☀️'; // Sun icon for dark mode
        } else {
            localStorage.removeItem('theme'); // Remove if back to default (light)
            themeToggleButton.textContent = '🌙'; // Moon icon for light mode
        }
    });

    // --- Info Modal Listeners ---
    infoButton.addEventListener('click', () => {
        aboutModal.classList.add('show');
    });

    modalCloseButton.addEventListener('click', () => {
        aboutModal.classList.remove('show');
    });

    // Close modal if user clicks outside of the modal content
    aboutModal.addEventListener('click', (event) => {
        if (event.target === aboutModal) {
            aboutModal.classList.remove('show');
        }
    });

    // --- Tab Switching Listeners ---
    searchTabBtn.addEventListener('click', () => {
        searchTab.classList.add('active');
        showAllTab.classList.remove('active');
        searchTabBtn.classList.add('active');
        showAllTabBtn.classList.remove('active');
    });

    showAllTabBtn.addEventListener('click', () => {
        showAllTab.classList.add('active');
        searchTab.classList.remove('active');
        showAllTabBtn.classList.add('active');
        searchTabBtn.classList.remove('active');
        // Re-render visible entries when switching to "Show All" if a dictionary is selected
        if (totalEntries > 0) {
            setTimeout(renderVisibleEntries, 0); // Use setTimeout to ensure DOM is ready
        }
    });

    // --- Search Input Listener ---
    searchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.trim();
        searchResults.innerHTML = ''; // Clear previous results

        if (searchTerm.length < 1) {
            return; // Don't search for empty or very short terms
        }

        try {
            const allTableNames = db.tables.map(table => table.name);
            const searchPromises = allTableNames.map(tableName =>
                db[tableName]
                    .where('term')
                    .startsWithIgnoreCase(searchTerm) // Case-insensitive search
                    .limit(100) // Limit results for performance
                    .toArray()
            );

            // Execute all search queries concurrently
            const resultsPerTable = await Promise.all(searchPromises);

            let foundResults = false;
            resultsPerTable.flat().forEach(entry => {
                foundResults = true;
                const resultEl = document.createElement('div');
                resultEl.className = 'entry';
                resultEl.innerHTML = `<strong>${entry.term}:</strong> ${entry.definition}`;
                searchResults.appendChild(resultEl);
            });

            if (!foundResults) {
                searchResults.innerHTML = '<div>No results found.</div>';
            }
        } catch (error) {
            console.error("Error during search:", error);
            searchResults.innerHTML = '<div>Error searching for terms.</div>';
        }
    });

    // --- Dictionary Select Listener ---
    dictionarySelect.addEventListener('change', async (e) => {
        const selectedDictionary = e.target.value;
        content.innerHTML = ''; // Clear previous entries
        totalEntries = 0;
        viewport.scrollTop = 0; // Reset scroll position

        if (!selectedDictionary) {
            currentDictionary = '';
            content.style.height = '0px'; // Collapse content area if no dictionary selected
            return;
        }

        currentDictionary = selectedDictionary;
        totalEntries = await db[currentDictionary].count();
        // Set the total height of the scrollable content for virtual scrolling
        content.style.height = `${totalEntries * entryHeight}px`;

        // Render visible entries for the newly selected dictionary
        setTimeout(renderVisibleEntries, 0);
    });

    // --- Virtual Viewport Scroll Listener (Debounced) ---
    viewport.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                renderVisibleEntries();
                isScrolling = false; // Reset flag after rendering
            });
            isScrolling = true; // Set flag to debounce further scroll events
        }
    });

    // --- PWA Install Button Listener ---
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            return;
        }
        installButton.classList.remove('show'); // Hide install button
        deferredPrompt.prompt(); // Show the install prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to PWA install prompt: ${outcome}`);
        deferredPrompt = null; // Clear prompt after use
    });

    // ===================================================================
    // 4. APP INITIALIZATION
    // ===================================================================

    // --- Check for saved theme on page load ---
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        themeToggleButton.textContent = '☀️'; // Sun icon for dark mode
    }

    // --- PWA Lifecycle Listeners ---
    // Listen for the `beforeinstallprompt` event to save the prompt for later
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); // Prevent the default browser prompt
        deferredPrompt = e; // Store the event for later use
        installButton.classList.add('show'); // Show custom install button
    });

    // Listen for the `appinstalled` event
    window.addEventListener('appinstalled', () => {
        // App was successfully installed
        deferredPrompt = null; // Clear deferred prompt
        console.log('PWA was installed');
    });

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // Initialize database and load dictionary list
    populateDatabase();
    loadDictionaryList();
});