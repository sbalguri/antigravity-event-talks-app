// Application State
let appState = {
    releaseNotes: [],
    selectedNotes: new Map(), // Key: uniqueId, Value: note details
    activeFilter: 'all',
    searchQuery: ''
};

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const btnExportCSV = document.getElementById('btn-export-csv');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const iconMoon = document.querySelector('.icon-moon');
const iconSun = document.querySelector('.icon-sun');
const btnRetry = document.getElementById('btn-retry');
const searchInput = document.getElementById('search-input');
const filterChips = document.querySelectorAll('.filter-chip');
const releaseFeed = document.getElementById('release-feed');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');

// Stats Elements
const statTotalDays = document.getElementById('stat-total-days');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');
const statAnnouncements = document.getElementById('stat-announcements');

// Selection Banner Elements
const selectionBanner = document.getElementById('selection-banner');
const selectionCount = document.getElementById('selection-count');
const btnTweetSelected = document.getElementById('btn-tweet-selected');
const btnCopySelected = document.getElementById('btn-copy-selected');
const btnDeselectAll = document.getElementById('btn-deselect-all');

// Composer Modal Elements
const composerModal = document.getElementById('composer-modal');
const modalClose = document.getElementById('modal-close');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const twitterPreviewText = document.getElementById('twitter-preview-text');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalPost = document.getElementById('btn-modal-post');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Load cached theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        iconMoon.classList.remove('hidden');
        iconSun.classList.add('hidden');
    }
    
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners setup
function setupEventListeners() {
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnExportCSV.addEventListener('click', exportFeedToCSV);
    btnThemeToggle.addEventListener('click', toggleTheme);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    
    // Search listener (with simple debounce/input response)
    searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    });

    // Filter Chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            appState.activeFilter = chip.dataset.filter;
            renderFeed();
        });
    });

    // Selection Banner Actions
    btnDeselectAll.addEventListener('click', deselectAllNotes);
    
    btnTweetSelected.addEventListener('click', () => {
        if (appState.selectedNotes.size === 0) return;
        const selectedList = Array.from(appState.selectedNotes.values());
        tweetUpdates(selectedList);
    });

    btnCopySelected.addEventListener('click', () => {
        if (appState.selectedNotes.size === 0) return;
        const selectedList = Array.from(appState.selectedNotes.values());
        copyUpdatesToClipboard(selectedList, btnCopySelected);
    });

    // Modal Event Listeners
    modalClose.addEventListener('click', closeComposerModal);
    btnModalCancel.addEventListener('click', closeComposerModal);
    tweetTextarea.addEventListener('input', updateTweetPreview);
    
    btnModalPost.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        closeComposerModal();
    });

    composerModal.addEventListener('click', (e) => {
        if (e.target === composerModal) {
            closeComposerModal();
        }
    });
}

// Fetch Release Notes from Flask API
async function fetchReleaseNotes() {
    showLoading();
    try {
        const response = await fetch('/api/release-notes');
        const result = await response.json();
        
        if (result.status === 'success') {
            // Add unique IDs to each individual update block
            appState.releaseNotes = result.data.map((entry, entryIdx) => {
                entry.updates = entry.updates.map((update, updateIdx) => {
                    return {
                        ...update,
                        id: `update_${entryIdx}_${updateIdx}`,
                        date: entry.date,
                        link: entry.link
                    };
                });
                return entry;
            });
            
            // Clear selection on refresh
            deselectAllNotes();
            
            // Render Stats & Feed
            calculateStats();
            renderFeed();
            showContent();
        } else {
            showError(result.message || 'Failed to fetch release notes feed.');
        }
    } catch (err) {
        showError('Network error. Check connection or Flask server logs.');
        console.error(err);
    }
}

// Stats Calculation
function calculateStats() {
    let daysCount = appState.releaseNotes.length;
    let featuresCount = 0;
    let issuesCount = 0;
    let announcementsCount = 0;

    appState.releaseNotes.forEach(entry => {
        entry.updates.forEach(update => {
            if (update.type === 'Feature') featuresCount++;
            else if (update.type === 'Issue') issuesCount++;
            else if (update.type === 'Announcement') announcementsCount++;
        });
    });

    statTotalDays.textContent = daysCount;
    statFeatures.textContent = featuresCount;
    statIssues.textContent = issuesCount;
    statAnnouncements.textContent = announcementsCount;
}

// Feed Rendering
function renderFeed() {
    releaseFeed.innerHTML = '';
    
    let renderedEntriesCount = 0;

    appState.releaseNotes.forEach(entry => {
        // Filter updates inside the entry
        const filteredUpdates = entry.updates.filter(update => {
            // Category Filter
            let matchesCategory = false;
            if (appState.activeFilter === 'all') {
                matchesCategory = true;
            } else if (appState.activeFilter === 'Change') {
                matchesCategory = (update.type === 'Change' || update.type === 'Breaking');
            } else {
                matchesCategory = (update.type === appState.activeFilter);
            }

            // Keyword Search Filter
            let matchesKeyword = true;
            if (appState.searchQuery) {
                const searchScope = (update.type + ' ' + stripHtml(update.description)).toLowerCase();
                matchesKeyword = searchScope.includes(appState.searchQuery);
            }

            return matchesCategory && matchesKeyword;
        });

        if (filteredUpdates.length > 0) {
            renderedEntriesCount++;
            
            // Create daily node container
            const dailyNode = document.createElement('div');
            dailyNode.className = 'daily-node';
            
            // Date Header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            
            const dateTitle = document.createElement('div');
            dateTitle.className = 'date-title';
            dateTitle.textContent = entry.date;
            
            const dateLine = document.createElement('div');
            dateLine.className = 'date-line';
            
            dateHeader.appendChild(dateTitle);
            dateHeader.appendChild(dateLine);
            dailyNode.appendChild(dateHeader);
            
            // Updates list container
            const listContainer = document.createElement('div');
            listContainer.className = 'updates-list';
            
            filteredUpdates.forEach(update => {
                const card = createUpdateCard(update);
                listContainer.appendChild(card);
            });
            
            dailyNode.appendChild(listContainer);
            releaseFeed.appendChild(dailyNode);
        }
    });

    // Check empty state
    if (renderedEntriesCount === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

// Create Card DOM Element
function createUpdateCard(update) {
    const isSelected = appState.selectedNotes.has(update.id);
    
    const card = document.createElement('div');
    card.className = `update-card ${isSelected ? 'selected' : ''}`;
    card.dataset.id = update.id;
    
    // Checkbox container
    const selectContainer = document.createElement('div');
    selectContainer.className = 'card-select-container';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'card-checkbox';
    checkbox.checked = isSelected;
    checkbox.ariaLabel = `Select update about ${update.type}`;
    checkbox.addEventListener('change', (e) => {
        toggleNoteSelection(update, e.target.checked);
    });
    
    selectContainer.appendChild(checkbox);
    card.appendChild(selectContainer);
    
    // Card Body
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    // Meta / Badge
    const cardMeta = document.createElement('div');
    cardMeta.className = 'card-meta';
    
    const badge = document.createElement('span');
    badge.className = `badge ${update.type.toLowerCase()}`;
    badge.textContent = update.type;
    
    cardMeta.appendChild(badge);
    cardBody.appendChild(cardMeta);
    
    // Description (raw html rendered safely)
    const contentHtml = document.createElement('div');
    contentHtml.className = 'card-content-html';
    contentHtml.innerHTML = update.description;
    cardBody.appendChild(contentHtml);
    
    // Actions Panel (Single Card Tweet / Copy)
    const cardActions = document.createElement('div');
    cardActions.className = 'card-actions';
    
    // Tweet Action
    const btnTweet = document.createElement('button');
    btnTweet.className = 'btn-card-action tweet';
    btnTweet.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span>Tweet</span>
    `;
    btnTweet.addEventListener('click', () => {
        tweetUpdates([update]);
    });
    
    // Copy Action
    const btnCopy = document.createElement('button');
    btnCopy.className = 'btn-card-action';
    btnCopy.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
    `;
    btnCopy.addEventListener('click', () => {
        copyUpdatesToClipboard([update], btnCopy);
    });
    
    cardActions.appendChild(btnTweet);
    cardActions.appendChild(btnCopy);
    cardBody.appendChild(cardActions);
    
    card.appendChild(cardBody);
    
    // Clicking card background triggers checkbox toggle (except clicking links/buttons)
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON' && e.target.closest('button') === null && e.target.tagName !== 'INPUT') {
            checkbox.checked = !checkbox.checked;
            toggleNoteSelection(update, checkbox.checked);
        }
    });
    
    return card;
}

// Toggle Selection State
function toggleNoteSelection(update, isChecked) {
    const card = document.querySelector(`.update-card[data-id="${update.id}"]`);
    
    if (isChecked) {
        appState.selectedNotes.set(update.id, update);
        if (card) card.classList.add('selected');
    } else {
        appState.selectedNotes.delete(update.id);
        if (card) card.classList.remove('selected');
    }
    
    updateSelectionBanner();
}

// Deselect All Notes
function deselectAllNotes() {
    appState.selectedNotes.clear();
    
    // Uncheck DOM elements
    document.querySelectorAll('.card-checkbox').forEach(chk => chk.checked = false);
    document.querySelectorAll('.update-card').forEach(card => card.classList.remove('selected'));
    
    updateSelectionBanner();
}

// Update Selection Banner View
function updateSelectionBanner() {
    const count = appState.selectedNotes.size;
    
    if (count > 0) {
        selectionBanner.classList.remove('hidden');
        // Force reflow for animation
        void selectionBanner.offsetWidth;
        selectionBanner.classList.add('active');
        selectionCount.textContent = `${count} update${count > 1 ? 's' : ''} selected`;
    } else {
        selectionBanner.classList.remove('active');
        // Wait for slide down transition before hiding completely
        setTimeout(() => {
            if (appState.selectedNotes.size === 0) {
                selectionBanner.classList.add('hidden');
            }
        }, 300);
    }
}

// Format Tweet Text & Open Intent
function tweetUpdates(updates) {
    let tweetText = "";
    
    if (updates.length === 1) {
        // Single update format
        const update = updates[0];
        const rawText = stripHtml(update.description);
        
        const prefix = `📣 BigQuery ${update.type} (${update.date}): `;
        const suffix = `\n\nRead more: ${update.link} #BigQuery #GCP`;
        
        // Calculate max text length to fit in 280 chars
        const maxDescLen = 280 - prefix.length - suffix.length - 3;
        let desc = rawText.trim().replace(/\s+/g, ' ');
        if (desc.length > maxDescLen) {
            desc = desc.substring(0, maxDescLen) + '...';
        }
        
        tweetText = prefix + desc + suffix;
    } else {
        // Bulk updates format
        const dateRange = getSelectedDateRangeString(updates);
        tweetText = `📣 BigQuery Release Updates (${dateRange}):\n\n`;
        
        updates.forEach(update => {
            const rawText = stripHtml(update.description);
            let desc = rawText.trim().replace(/\s+/g, ' ');
            if (desc.length > 50) {
                desc = desc.substring(0, 47) + '...';
            }
            tweetText += `• [${update.type}] ${desc}\n`;
        });
        
        const linkSuffix = `\nRelease Notes: https://docs.cloud.google.com/bigquery/docs/release-notes #BigQuery #GCP`;
        
        // Truncate if concatenated text exceeds limit
        const limit = 280 - linkSuffix.length;
        if (tweetText.length > limit) {
            tweetText = tweetText.substring(0, limit - 3) + '...';
        }
        
        tweetText += linkSuffix;
    }
    
    openComposerModal(tweetText);
}

// Modal Control Functions
function openComposerModal(initialText) {
    tweetTextarea.value = initialText;
    composerModal.classList.remove('hidden');
    updateTweetPreview();
}

function closeComposerModal() {
    composerModal.classList.add('hidden');
}

function updateTweetPreview() {
    const text = tweetTextarea.value;
    const charCount = text.length;
    charCounter.textContent = `${charCount} / 280`;
    
    charCounter.classList.remove('warning', 'danger');
    if (charCount > 280) {
        charCounter.classList.add('danger');
        btnModalPost.disabled = true;
        btnModalPost.style.opacity = 0.5;
        btnModalPost.style.pointerEvents = 'none';
    } else {
        btnModalPost.disabled = false;
        btnModalPost.style.opacity = 1;
        btnModalPost.style.pointerEvents = 'auto';
        if (charCount > 250) {
            charCounter.classList.add('warning');
        }
    }
    
    let formattedText = escapeHtml(text);
    formattedText = formattedText.replace(/(^|\s)(#[a-zA-Z0-9_]+)/g, '$1<span class="hashtag">$2</span>');
    formattedText = formattedText.replace(/(https?:\/\/[^\s]+)/g, '<span class="url">$1</span>');
    
    twitterPreviewText.innerHTML = formattedText;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Export parsed feed to CSV file
function exportFeedToCSV() {
    if (appState.releaseNotes.length === 0) {
        alert("No release notes available to export. Please reload data first.");
        return;
    }
    
    // CSV headers
    const headers = ["Date", "Link", "Update Type", "Description"];
    const csvRows = [headers.join(",")];
    
    appState.releaseNotes.forEach(entry => {
        entry.updates.forEach(update => {
            // Convert HTML description to clean plain text
            let descText = stripHtml(update.description).trim();
            // Collapse whitespaces
            descText = descText.replace(/\s+/g, ' ');
            
            const row = [
                entry.date,
                update.link,
                update.type,
                descText
            ];
            
            // Format each column safely for CSV: double quote wraps, escaping existing double quotes
            const formattedRow = row.map(cell => {
                const escaped = String(cell).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            
            csvRows.push(formattedRow.join(","));
        });
    });
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link element
    const downloadLink = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadLink.href = url;
    downloadLink.download = `bigquery_release_notes_${timestamp}.csv`;
    downloadLink.style.display = "none";
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Cleanup
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}

// Toggle light/dark theme color scheme
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    
    if (isLight) {
        iconMoon.classList.remove('hidden');
        iconSun.classList.add('hidden');
        localStorage.setItem('theme', 'light');
    } else {
        iconMoon.classList.add('hidden');
        iconSun.classList.remove('hidden');
        localStorage.setItem('theme', 'dark');
    }
}

// Copy Updates Text to Clipboard
async function copyUpdatesToClipboard(updates, triggerBtn) {
    let copyText = "";
    
    if (updates.length === 1) {
        const update = updates[0];
        const rawText = stripHtml(update.description).trim().replace(/\s+/g, ' ');
        copyText = `BigQuery ${update.type} (${update.date}):\n${rawText}\n\nLink: ${update.link}`;
    } else {
        const dateRange = getSelectedDateRangeString(updates);
        copyText = `BigQuery Release Notes Summary (${dateRange}):\n\n`;
        
        updates.forEach((update, idx) => {
            const rawText = stripHtml(update.description).trim().replace(/\s+/g, ' ');
            copyText += `${idx + 1}. [${update.type}] (${update.date}) - ${rawText}\n\n`;
        });
        
        copyText += "Source: https://docs.cloud.google.com/bigquery/docs/release-notes";
    }
    
    try {
        await navigator.clipboard.writeText(copyText);
        
        // Show success animation
        const originalHtml = triggerBtn.innerHTML;
        triggerBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: #10b981">Copied!</span>
        `;
        setTimeout(() => {
            triggerBtn.innerHTML = originalHtml;
        }, 1800);
    } catch (err) {
        alert("Failed to copy text. Please allow clipboard permissions.");
        console.error(err);
    }
}

// Helper: Get range string of dates from selected items
function getSelectedDateRangeString(updates) {
    const dates = updates.map(u => new Date(u.date)).sort((a,b) => a-b);
    if (dates.length === 0) return "";
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const firstDate = dates[0].toLocaleDateString('en-US', options);
    const lastDate = dates[dates.length - 1].toLocaleDateString('en-US', options);
    
    if (firstDate === lastDate) return firstDate;
    return `${firstDate} - ${lastDate}`;
}

// Helper: Strip HTML tags to get raw content
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// UI Transition Helpers
function showLoading() {
    btnRefresh.classList.add('spinning');
    loadingState.classList.remove('hidden');
    releaseFeed.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
}

function showContent() {
    btnRefresh.classList.remove('spinning');
    loadingState.classList.add('hidden');
    releaseFeed.classList.remove('hidden');
}

function showError(msg) {
    btnRefresh.classList.remove('spinning');
    loadingState.classList.add('hidden');
    releaseFeed.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    errorMessage.textContent = msg;
    errorState.classList.remove('hidden');
}
