/**
 * BigQuery Release Notes Reader & Tweet Composer
 * Frontend Logic (Vanilla JS)
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let allReleases = [];
    let filteredReleases = [];
    let selectedRelease = null;
    let currentFilterCategory = 'all';
    let searchQuery = '';
    
    // Default hashtags
    const defaultHashtags = ['#BigQuery', '#GCP'];

    // DOM Elements
    const elements = {
        releasesGrid: document.getElementById('releasesGrid'),
        skeletonLoader: document.getElementById('skeletonLoader'),
        emptyFeedState: document.getElementById('emptyFeedState'),
        errorFeedState: document.getElementById('errorFeedState'),
        errorText: document.getElementById('errorText'),
        
        btnRefresh: document.getElementById('btnRefresh'),
        refreshSpinner: document.getElementById('refreshSpinner'),
        btnExport: document.getElementById('btnExport'),
        themeCheckbox: document.getElementById('themeCheckbox'),
        
        searchInput: document.getElementById('searchInput'),
        btnClearSearch: document.getElementById('btnClearSearch'),
        categoriesContainer: document.getElementById('categoriesContainer'),
        
        releasesCount: document.getElementById('releasesCount'),
        lastUpdatedText: document.getElementById('lastUpdatedText'),
        
        // Sidebar (Composer)
        tweetSidebar: document.getElementById('tweetSidebar'),
        sidebarEmptyState: document.getElementById('sidebarEmptyState'),
        sidebarActiveComposer: document.getElementById('sidebarActiveComposer'),
        composerSelectedTitle: document.getElementById('composerSelectedTitle'),
        tweetTextarea: document.getElementById('tweetTextarea'),
        charCounter: document.getElementById('charCounter'),
        btnResetComposer: document.getElementById('btnResetComposer'),
        btnLaunchTweet: document.getElementById('btnLaunchTweet'),
        hashtagPills: document.querySelectorAll('.hashtag-pill'),
        
        // Drawer
        drawerOverlay: document.getElementById('drawerOverlay'),
        detailDrawer: document.getElementById('detailDrawer'),
        drawerDate: document.getElementById('drawerDate'),
        drawerTags: document.getElementById('drawerTags'),
        drawerTitle: document.getElementById('drawerTitle'),
        drawerTweetBtn: document.getElementById('drawerTweetBtn'),
        drawerSourceLink: document.getElementById('drawerSourceLink'),
        drawerBody: document.getElementById('drawerBody'),
        btnCloseDrawer: document.getElementById('btnCloseDrawer'),
        
        // Mobile layout elements
        mobileTweetBar: document.getElementById('mobileTweetBar'),
        mobileSelectedTitle: document.getElementById('mobileSelectedTitle'),
        btnMobileComposerTrigger: document.getElementById('btnMobileComposerTrigger'),
        
        // Toast container
        toastContainer: document.getElementById('toastContainer')
    };

    /* ==========================================================================
       DATA FETCHING & PARSING
       ========================================================================== */

    // Fetch releases from local Flask API
    async function fetchReleases() {
        setLoadingState(true);
        try {
            const response = await fetch('/api/releases');
            const data = await response.json();
            
            if (data.success && data.releases) {
                // Enrich data with local classifications and formatted dates
                allReleases = data.releases.map(release => {
                    // Classify dynamically based on title/content if feed has no tags
                    let categories = release.categories || [];
                    if (categories.length === 0) {
                        categories = classifyRelease(release.title, release.content);
                    }
                    
                    return {
                        ...release,
                        categories: categories,
                        formattedDate: formatDate(release.published),
                        excerpt: getCleanExcerpt(release.content)
                    };
                });
                
                showToast('Successfully fetched release notes', 'success');
                updateLastUpdated();
                applyFilters();
            } else {
                showError(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            showError('Network error. Make sure the Flask server is running.');
        } finally {
            setLoadingState(false);
        }
    }

    // Assign categories based on keywords in title/content
    function classifyRelease(title, content) {
        const text = (title + ' ' + content).toLowerCase();
        const categories = [];
        
        if (text.includes('deprecated') || text.includes('deprecation') || text.includes('no longer supported') || text.includes('discontinued') || text.includes('removes support')) {
            categories.push('deprecation');
        }
        if (text.includes('fix') || text.includes('resolved') || text.includes('bug') || text.includes('issue') || text.includes('regression')) {
            categories.push('fix');
        }
        if (text.includes('introduce') || text.includes('support for') || text.includes('new feature') || text.includes('added') || text.includes('now available') || text.includes('preview') || text.includes('ga') || text.includes('general availability')) {
            categories.push('feature');
        }
        if (text.includes('change') || text.includes('update') || text.includes('modify') || text.includes('modified') || text.includes('behavior') || text.includes('adjustment')) {
            categories.push('change');
        }
        
        if (categories.length === 0) {
            categories.push('general');
        }
        return categories;
    }

    // Format date string from feed
    function formatDate(dateStr) {
        if (!dateStr) return 'Unknown Date';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    // Extract raw text content for the cards list (removing HTML tags)
    function getCleanExcerpt(htmlStr) {
        if (!htmlStr) return '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlStr;
        
        // Remove code blocks and tables from the excerpt to keep it clean
        const codeBlocks = tempDiv.querySelectorAll('pre, table');
        codeBlocks.forEach(el => el.remove());
        
        const text = tempDiv.textContent || tempDiv.innerText || '';
        return text.trim();
    }

    /* ==========================================================================
       UI TRANSITIONS & FEED CONTROLS
       ========================================================================== */

    function setLoadingState(isLoading) {
        if (isLoading) {
            elements.refreshSpinner.classList.add('spinning');
            elements.skeletonLoader.classList.remove('hidden');
            elements.releasesGrid.classList.add('hidden');
            elements.emptyFeedState.classList.add('hidden');
            elements.errorFeedState.classList.add('hidden');
            elements.btnRefresh.disabled = true;
        } else {
            elements.refreshSpinner.classList.remove('spinning');
            elements.skeletonLoader.classList.add('hidden');
            elements.releasesGrid.classList.remove('hidden');
            elements.btnRefresh.disabled = false;
        }
    }

    function showError(msg) {
        elements.errorText.innerText = msg;
        elements.errorFeedState.classList.remove('hidden');
        elements.releasesGrid.classList.add('hidden');
        showToast(msg, 'error');
    }

    function updateLastUpdated() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        elements.lastUpdatedText.innerText = `Feed last updated: ${timeStr}`;
    }

    // Apply active filter category & search query
    function applyFilters() {
        filteredReleases = allReleases.filter(release => {
            // Category check
            const matchesCategory = currentFilterCategory === 'all' || release.categories.includes(currentFilterCategory);
            
            // Search query check
            const matchesSearch = !searchQuery || 
                release.title.toLowerCase().includes(searchQuery) ||
                release.content.toLowerCase().includes(searchQuery) ||
                release.excerpt.toLowerCase().includes(searchQuery);
                
            return matchesCategory && matchesSearch;
        });
        
        renderReleases();
    }

    // Render cards into feed
    function renderReleases() {
        elements.releasesGrid.innerHTML = '';
        
        if (filteredReleases.length === 0) {
            elements.emptyFeedState.classList.remove('hidden');
            elements.releasesCount.innerText = 'Showing 0 updates';
            return;
        }
        
        elements.emptyFeedState.classList.add('hidden');
        elements.releasesCount.innerText = `Showing ${filteredReleases.length} updates`;
        
        filteredReleases.forEach(release => {
            const isSelected = selectedRelease && selectedRelease.id === release.id;
            
            const card = document.createElement('div');
            card.className = `release-card ${isSelected ? 'selected' : ''}`;
            card.dataset.id = release.id;
            
            // Generate tags HTML
            const tagsHtml = release.categories.map(cat => 
                `<span class="tag ${cat}">${cat}</span>`
            ).join('');
            
            card.innerHTML = `
                <div class="card-select-control" title="Select to tweet">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="card-meta">
                    <span class="card-date">${release.formattedDate}</span>
                    <div class="card-tags">${tagsHtml}</div>
                </div>
                <h3 class="card-title">${release.title}</h3>
                <div class="card-body">${release.excerpt}</div>
                <div class="card-footer">
                    <button class="btn-read-more" data-action="read">
                        Read Details <i class="fa-solid fa-arrow-right"></i>
                    </button>
                    <div class="card-actions-wrapper">
                        <button class="btn-card-copy" data-action="copy" title="Copy to clipboard">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                        <button class="btn-card-tweet" data-action="tweet">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                    </div>
                </div>
            `;
            
            // Setup card listeners
            // Click on card opens drawer, click on select control toggles tweet, click on tweet button sets tweet composer
            card.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('button');
                const selectControl = e.target.closest('.card-select-control');
                
                if (selectControl) {
                    e.stopPropagation();
                    toggleSelectRelease(release);
                } else if (actionBtn && actionBtn.dataset.action === 'tweet') {
                    e.stopPropagation();
                    selectForTweeting(release);
                    // Scroll to composer on mobile
                    if (window.innerWidth <= 1024) {
                        elements.tweetSidebar.scrollIntoView({ behavior: 'smooth' });
                    }
                } else if (actionBtn && actionBtn.dataset.action === 'copy') {
                    e.stopPropagation();
                    const copyText = `BigQuery Update [${release.published}]:\n${release.title}\n\n${release.excerpt}\n\nRead more: ${release.link}`;
                    navigator.clipboard.writeText(copyText)
                        .then(() => showToast('Update copied to clipboard!', 'success'))
                        .catch(() => showToast('Failed to copy to clipboard', 'error'));
                } else {
                    // Open drawer
                    openDrawer(release);
                }
            });
            
            elements.releasesGrid.appendChild(card);
        });
    }

    /* ==========================================================================
       TWEET COMPOSER SYSTEM
       ========================================================================== */

    // Selects a release and populates the composer
    function selectForTweeting(release) {
        selectedRelease = release;
        
        // Add selected visual class to card
        document.querySelectorAll('.release-card').forEach(card => {
            if (card.dataset.id === release.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Show composer in sidebar
        elements.sidebarEmptyState.classList.add('hidden');
        elements.sidebarActiveComposer.classList.remove('hidden');
        elements.composerSelectedTitle.innerText = release.title;
        
        // Generate and set default tweet text
        generateDefaultTweetText(release);
        updateCharCount();
        
        // Manage mobile bar
        elements.mobileTweetBar.classList.remove('hidden');
        elements.mobileSelectedTitle.innerText = `Selected: ${release.title}`;
        
        showToast('Update loaded into Tweet Composer!', 'info');
    }

    // Toggle selection
    function toggleSelectRelease(release) {
        if (selectedRelease && selectedRelease.id === release.id) {
            // Unselect
            selectedRelease = null;
            document.querySelectorAll('.release-card').forEach(card => card.classList.remove('selected'));
            elements.sidebarEmptyState.classList.remove('hidden');
            elements.sidebarActiveComposer.classList.add('hidden');
            elements.mobileTweetBar.classList.add('hidden');
        } else {
            selectForTweeting(release);
        }
    }

    // Generate standard tweet content
    function generateDefaultTweetText(release) {
        // Base link (Google BQ releases or specific link if exists)
        const link = release.link || 'https://cloud.google.com/bigquery/docs/release-notes';
        
        // Construct text
        let text = `BigQuery Update:\n${release.title}\n\nRead more here: ${link}`;
        
        // Append active hashtag pills
        const activeHashtags = [];
        elements.hashtagPills.forEach(pill => {
            if (pill.classList.contains('active')) {
                activeHashtags.push(pill.dataset.tag);
            }
        });
        
        if (activeHashtags.length > 0) {
            text += `\n${activeHashtags.join(' ')}`;
        }
        
        elements.tweetTextarea.value = text;
    }

    // Update tweet characters counter (280 limit)
    function updateCharCount() {
        const text = elements.tweetTextarea.value;
        const count = text.length;
        elements.charCounter.innerText = `${count} / 280`;
        
        // Style changes depending on character count limits
        elements.charCounter.className = 'char-counter';
        if (count > 280) {
            elements.charCounter.classList.add('danger');
            elements.btnLaunchTweet.disabled = true;
        } else if (count > 250) {
            elements.charCounter.classList.add('warning');
            elements.btnLaunchTweet.disabled = false;
        } else {
            elements.btnLaunchTweet.disabled = false;
        }
    }

    // Open standard X web intent to share
    function launchTweet() {
        const text = elements.tweetTextarea.value;
        if (text.length > 280) {
            showToast('Tweet exceeds the 280 character limit!', 'error');
            return;
        }
        
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'width=550,height=420');
        showToast('X/Twitter composer launched!', 'success');
    }

    /* ==========================================================================
       SIDE DRAWER (FULL DETAILS SCREEN)
       ========================================================================== */

    function openDrawer(release) {
        elements.drawerDate.innerText = release.formattedDate;
        elements.drawerTitle.innerText = release.title;
        elements.drawerSourceLink.href = release.link || 'https://cloud.google.com/bigquery/docs/release-notes';
        elements.drawerBody.innerHTML = release.content || '<p>No details available for this release note.</p>';
        
        // Generate tags
        elements.drawerTags.innerHTML = release.categories.map(cat => 
            `<span class="tag ${cat}">${cat}</span>`
        ).join('');
        
        // Handle tweet button click inside drawer
        elements.drawerTweetBtn.onclick = () => {
            selectForTweeting(release);
            closeDrawer();
            
            // Scroll to composer on mobile
            if (window.innerWidth <= 1024) {
                elements.tweetSidebar.scrollIntoView({ behavior: 'smooth' });
            }
        };

        // Open transition
        elements.drawerOverlay.classList.add('open');
        elements.detailDrawer.classList.add('open');
        document.body.style.overflow = 'hidden'; // Stop background scrolling
    }

    function closeDrawer() {
        elements.drawerOverlay.classList.remove('open');
        elements.detailDrawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    /* ==========================================================================
       TOAST UTILITY
       ========================================================================== */

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Remove toast after 4s
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 4000);
    }

    /* ==========================================================================
       EVENT LISTENERS
       ========================================================================== */

    // Refresh Button Click
    elements.btnRefresh.addEventListener('click', fetchReleases);
    
    // Retry Buttons
    document.getElementById('btnRetry').addEventListener('click', fetchReleases);

    // Search Input Listener
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        
        if (searchQuery.length > 0) {
            elements.btnClearSearch.classList.remove('hidden');
        } else {
            elements.btnClearSearch.classList.add('hidden');
        }
        
        applyFilters();
    });

    // Clear Search Input Button
    elements.btnClearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.btnClearSearch.classList.add('hidden');
        applyFilters();
    });

    // Category Filtering
    elements.categoriesContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Switch active states
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');
        
        currentFilterCategory = pill.dataset.category;
        applyFilters();
    });

    // Sidebar Tweet Textarea change handler
    elements.tweetTextarea.addEventListener('input', updateCharCount);

    // Reset Composer Button
    elements.btnResetComposer.addEventListener('click', () => {
        if (selectedRelease) {
            generateDefaultTweetText(selectedRelease);
            updateCharCount();
            showToast('Composer content reset to default.', 'info');
        }
    });

    // Launch/Post Tweet Button
    elements.btnLaunchTweet.addEventListener('click', launchTweet);

    // Hashtag toggles in sidebar composer
    elements.hashtagPills.forEach(pill => {
        pill.addEventListener('click', () => {
            if (!selectedRelease) return;
            
            pill.classList.toggle('active');
            
            // Re-generate default tweet text which picks up current active hashtag pills
            generateDefaultTweetText(selectedRelease);
            updateCharCount();
        });
    });

    // Drawer closes
    elements.btnCloseDrawer.addEventListener('click', closeDrawer);
    elements.drawerOverlay.addEventListener('click', closeDrawer);

    // Escape key closes drawer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDrawer();
        }
    });

    // Mobile buttons
    elements.btnMobileComposerTrigger.addEventListener('click', () => {
        elements.tweetSidebar.scrollIntoView({ behavior: 'smooth' });
    });

    // Export to CSV click listener
    elements.btnExport.addEventListener('click', () => {
        if (filteredReleases.length === 0) {
            showToast('No releases available to export', 'error');
            return;
        }
        
        try {
            const headers = ['ID', 'Date', 'Category', 'Title', 'Link', 'Excerpt'];
            const csvRows = [headers.join(',')];
            
            filteredReleases.forEach(release => {
                const row = [
                    `"${release.id.replace(/"/g, '""')}"`,
                    `"${release.published.replace(/"/g, '""')}"`,
                    `"${release.categories.join('; ').replace(/"/g, '""')}"`,
                    `"${release.title.replace(/"/g, '""')}"`,
                    `"${release.link.replace(/"/g, '""')}"`,
                    `"${release.excerpt.slice(0, 250).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = "\ufeff" + csvRows.join('\n'); // UTF-8 BOM
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'bigquery_release_notes.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Exported CSV file successfully!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to export CSV', 'error');
        }
    });

    // Theme toggle functionality
    elements.themeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            showToast('Switched to Light theme', 'info');
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            showToast('Switched to Dark theme', 'info');
        }
    });

    // Load saved theme on startup
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        elements.themeCheckbox.checked = true;
        document.body.classList.add('light-theme');
    } else {
        elements.themeCheckbox.checked = false;
        document.body.classList.remove('light-theme');
    }

    /* ==========================================================================
       START APPLICATION
       ========================================================================== */
       
    // Fetch release notes on load
    fetchReleases();
});
