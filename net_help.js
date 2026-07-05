// ==================== LitRef - Net Help ====================
(function() {
    // ---------- DATA STORE ----------
    let DATA = {
        works: [],
        authors: [],
        concepts: [],
        history: []
    };

    // ---------- LOAD DATA FROM JSON FILE ----------
    async function loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error('data.json not found. Place it in the same folder as net-help.html');
            }
            const json = await response.json();
            
            // Load arrays from JSON
            DATA.works = Array.isArray(json.works) ? json.works : [];
            DATA.authors = Array.isArray(json.authors) ? json.authors : [];
            DATA.concepts = Array.isArray(json.concepts) ? json.concepts : [];
            DATA.history = Array.isArray(json.history) ? json.history : [];
            
            console.log('Data loaded successfully:', {
                works: DATA.works.length,
                authors: DATA.authors.length,
                concepts: DATA.concepts.length,
                history: DATA.history.length
            });
            
            return true;
        } catch (error) {
            console.error('Failed to load data:', error.message);
            document.getElementById('home-content').innerHTML = `
                <div class="card" style="text-align:center; padding:40px;">
                    <h2>⚠️ Data Not Found</h2>
                    <p>Place <strong>data.json</strong> in the same folder as net-help.html</p>
                    <p style="color:#ff8800; margin-top:10px;">Current path: ./data.json</p>
                </div>
            `;
            return false;
        }
    }

    // ---------- UTILITY FUNCTIONS ----------
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function renderMarkdown(text) {
        if (!text) return '';
        return text.split('\n').map(line => {
            if (line.startsWith('# ')) {
                return `<h4>${applyInline(line.substring(2))}</h4>`;
            }
            return `<p>${applyInline(line)}</p>`;
        }).join('');
    }

    function applyInline(text) {
        let t = escapeHtml(text);
        t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');
        t = t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        return t;
    }

    function renderReferences(refs) {
        if (!refs) return '';
        return refs.split('\n').filter(r => r.trim()).map(link => {
            const url = link.trim();
            if (url.match(/^https?:\/\//)) {
                return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
            }
            return escapeHtml(url);
        }).join('<br>');
    }

    function getAuthor(id) {
        return DATA.authors.find(a => a.id === id) || null;
    }

    function getEvents(ids) {
        if (!ids || !Array.isArray(ids)) return [];
        return DATA.history.filter(e => ids.includes(e.id));
    }

    // ---------- ACCORDION COMPONENT ----------
    function createAccordion(container, groups, renderItem) {
        container.innerHTML = '';
        for (let [groupName, items] of Object.entries(groups)) {
            if (!items.length) continue;
            
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.innerHTML = `<span class="arrow">▶</span> ${escapeHtml(groupName)} (${items.length})`;
            
            const body = document.createElement('div');
            body.className = 'accordion-body';
            
            items.forEach(item => {
                const el = renderItem(item);
                body.appendChild(el);
            });
            
            header.addEventListener('click', function() {
                const isOpen = header.classList.contains('open');
                // Close all in this container
                container.querySelectorAll('.accordion-header').forEach(h => {
                    h.classList.remove('open');
                    if (h.nextElementSibling) {
                        h.nextElementSibling.classList.remove('open');
                    }
                });
                // Open clicked one if it was closed
                if (!isOpen) {
                    header.classList.add('open');
                    body.classList.add('open');
                }
            });
            
            container.appendChild(header);
            container.appendChild(body);
        }
    }

    // ---------- VIEW SWITCHING ----------
    let currentView = 'home';

    function showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        // Show target view
        const view = document.getElementById('view-' + viewName);
        if (view) {
            view.classList.add('active');
        }
        currentView = viewName;
        
        // Update nav button states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewName) {
                btn.classList.add('active');
            }
        });
    }

    // ---------- RENDER HOME (50-year spans accordion) ----------
    function renderHome(filter = '') {
        let filtered = DATA.works;
        
        if (filter) {
            const q = filter.toLowerCase();
            filtered = DATA.works.filter(w => {
                const author = getAuthor(w.authorId);
                const authorName = author ? author.name : '';
                return (
                    (w.title && w.title.toLowerCase().includes(q)) ||
                    (w.shortDescription && w.shortDescription.toLowerCase().includes(q)) ||
                    (w.year && w.year.toString().includes(q)) ||
                    (w.country && w.country.toLowerCase().includes(q)) ||
                    authorName.toLowerCase().includes(q)
                );
            });
        }
        
        // Group by 50-year spans
        const groups = {};
        filtered.forEach(w => {
            const year = w.year || 0;
            const spanStart = Math.floor(year / 50) * 50;
            const label = spanStart + '-' + (spanStart + 49);
            if (!groups[label]) groups[label] = [];
            groups[label].push(w);
        });
        
        // Sort groups descending
        const sortedGroups = {};
        Object.keys(groups)
            .sort((a, b) => parseInt(b) - parseInt(a))
            .forEach(k => { sortedGroups[k] = groups[k]; });
        
        const container = document.getElementById('home-content');
        createAccordion(container, sortedGroups, function(work) {
            const div = document.createElement('div');
            div.className = 'card';
            const author = getAuthor(work.authorId);
            
            div.innerHTML = `
                <h3><a href="#" class="work-link" data-id="${escapeHtml(work.id)}">${escapeHtml(work.title)}</a></h3>
                <div class="meta">
                    ${work.year || '?'} – ${escapeHtml(work.country || '')}
                    ${author ? ' | <a href="#" class="author-link" data-id="' + escapeHtml(author.id) + '">' + escapeHtml(author.name) + '</a>' : ''}
                </div>
                <p>${work.shortDescription ? escapeHtml(work.shortDescription) : ''}</p>
            `;
            
            // Add click handlers
            div.querySelector('.work-link').addEventListener('click', function(e) {
                e.preventDefault();
                showWorkDetail(this.dataset.id);
            });
            
            const authorLink = div.querySelector('.author-link');
            if (authorLink) {
                authorLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    showAuthorDetail(this.dataset.id);
                });
            }
            
            return div;
        });
    }

    // ---------- RENDER WORKS (flat list) ----------
    function renderWorks(filter = '') {
        let filtered = DATA.works;
        
        if (filter) {
            const q = filter.toLowerCase();
            filtered = DATA.works.filter(w => {
                const author = getAuthor(w.authorId);
                const authorName = author ? author.name : '';
                return (
                    (w.title && w.title.toLowerCase().includes(q)) ||
                    authorName.toLowerCase().includes(q) ||
                    (w.year && w.year.toString().includes(q))
                );
            });
        }
        
        const container = document.getElementById('works-content');
        container.innerHTML = filtered.map(w => {
            const author = getAuthor(w.authorId);
            return `
                <div class="card">
                    <h3><a href="#" class="work-link" data-id="${escapeHtml(w.id)}">${escapeHtml(w.title)}</a></h3>
                    <div class="meta">
                        ${w.year || '?'} – ${escapeHtml(w.country || '')}
                        ${author ? ' | <a href="#" class="author-link" data-id="' + escapeHtml(author.id) + '">' + escapeHtml(author.name) + '</a>' : ''}
                    </div>
                    <p>${w.shortDescription ? escapeHtml(w.shortDescription) : ''}</p>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        container.querySelectorAll('.work-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showWorkDetail(this.dataset.id);
            });
        });
        container.querySelectorAll('.author-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showAuthorDetail(this.dataset.id);
            });
        });
    }

    // ---------- WORK DETAIL ----------
    function showWorkDetail(id) {
        const work = DATA.works.find(w => w.id === id);
        if (!work) return;
        
        const author = getAuthor(work.authorId);
        const linkedEvents = getEvents(work.eventIds);
        
        const container = document.getElementById('work-detail-content');
        container.innerHTML = `
            <div class="card">
                <h2>${escapeHtml(work.title)}</h2>
                <div class="meta">${work.year || '?'} – ${escapeHtml(work.country || '')}</div>
                ${author ? '<p><strong>Author:</strong> <a href="#" id="detail-author-link" data-id="' + escapeHtml(author.id) + '">' + escapeHtml(author.name) + '</a></p>' : ''}
                ${work.coverImage ? '<img src="' + work.coverImage + '" alt="Cover"><div class="credit">' + escapeHtml(work.coverCredit || '') + '</div>' : ''}
                ${work.shortDescription ? '<p><em>' + escapeHtml(work.shortDescription) + '</em></p>' : ''}
                <h4>Analysis</h4>
                <div>${renderMarkdown(work.analysis || '')}</div>
                ${work.completeText ? '<p><strong>Full text:</strong> <a href="' + work.completeText + '" target="_blank">' + work.completeText + '</a></p>' : ''}
                ${work.references ? '<h4>References</h4><div>' + renderReferences(work.references) + '</div>' : ''}
                ${linkedEvents.length ? '<h4>Historical Events</h4><ul>' + linkedEvents.map(e => '<li><a href="#" class="event-link" data-id="' + escapeHtml(e.id) + '">' + escapeHtml(e.name) + ' (' + e.year + ')</a></li>').join('') + '</ul>' : ''}
            </div>
        `;
        
        // Add click handlers
        const authorLink = document.getElementById('detail-author-link');
        if (authorLink) {
            authorLink.addEventListener('click', function(e) {
                e.preventDefault();
                showAuthorDetail(this.dataset.id);
            });
        }
        container.querySelectorAll('.event-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showEventDetail(this.dataset.id);
            });
        });
        
        showView('work');
    }

    // ---------- AUTHORS ----------
    function renderAuthors(filter = '') {
        let filtered = DATA.authors;
        
        if (filter) {
            const q = filter.toLowerCase();
            filtered = DATA.authors.filter(a => 
                a.name.toLowerCase().includes(q) ||
                (a.nationality && a.nationality.toLowerCase().includes(q))
            );
        }
        
        // Group by nationality
        const groups = {};
        filtered.forEach(a => {
            const nat = a.nationality || 'Unknown';
            if (!groups[nat]) groups[nat] = [];
            groups[nat].push(a);
        });
        
        // Sort each group by birth year
        Object.keys(groups).forEach(nat => {
            groups[nat].sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
        });
        
        // Sort group keys alphabetically
        const sortedGroups = {};
        Object.keys(groups).sort().forEach(nat => {
            sortedGroups[nat] = groups[nat];
        });
        
        const container = document.getElementById('authors-content');
        createAccordion(container, sortedGroups, function(author) {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h3><a href="#" class="author-link" data-id="${escapeHtml(author.id)}">${escapeHtml(author.name)}</a></h3>
                <div class="meta">${author.birthYear || '?'} – ${escapeHtml(author.nationality || '')}</div>
            `;
            div.querySelector('.author-link').addEventListener('click', function(e) {
                e.preventDefault();
                showAuthorDetail(this.dataset.id);
            });
            return div;
        });
    }

    function showAuthorDetail(id) {
        const author = DATA.authors.find(a => a.id === id);
        if (!author) return;
        
        const authorWorks = DATA.works.filter(w => author.workIds && author.workIds.includes(w.id));
        const linkedEvents = getEvents(author.eventIds);
        
        const container = document.getElementById('author-detail-content');
        container.innerHTML = `
            <div class="card">
                <h2>${escapeHtml(author.name)}</h2>
                ${author.picture ? '<img src="' + author.picture + '" alt="Picture"><div class="credit">' + escapeHtml(author.picCredit || '') + '</div>' : ''}
                <div class="meta">${author.birthYear || '?'} – ${escapeHtml(author.nationality || '')}</div>
                <div>${renderMarkdown(author.bio || '')}</div>
                ${authorWorks.length ? '<h4>Works</h4><ul>' + authorWorks.map(w => '<li><a href="#" class="work-link" data-id="' + escapeHtml(w.id) + '">' + escapeHtml(w.title) + '</a></li>').join('') + '</ul>' : ''}
                ${linkedEvents.length ? '<h4>Historical Events</h4><ul>' + linkedEvents.map(e => '<li><a href="#" class="event-link" data-id="' + escapeHtml(e.id) + '">' + escapeHtml(e.name) + ' (' + e.year + ')</a></li>').join('') + '</ul>' : ''}
            </div>
        `;
        
        container.querySelectorAll('.work-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showWorkDetail(this.dataset.id);
            });
        });
        container.querySelectorAll('.event-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showEventDetail(this.dataset.id);
            });
        });
        
        showView('author-detail');
    }

    // ---------- CONCEPTS ----------
    function renderConcepts(filter = '') {
        let filtered = DATA.concepts;
        
        if (filter) {
            const q = filter.toLowerCase();
            filtered = DATA.concepts.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.description && c.description.toLowerCase().includes(q))
            );
        }
        
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        const container = document.getElementById('concepts-content');
        container.innerHTML = filtered.map(c => `
            <div class="card">
                <h3><a href="#" class="concept-link" data-id="${escapeHtml(c.id)}">${escapeHtml(c.name)}</a></h3>
            </div>
        `).join('');
        
        container.querySelectorAll('.concept-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showConceptDetail(this.dataset.id);
            });
        });
    }

    function showConceptDetail(id) {
        const concept = DATA.concepts.find(c => c.id === id);
        if (!concept) return;
        
        const linkedAuthors = DATA.authors.filter(a => concept.authorIds && concept.authorIds.includes(a.id));
        const linkedWorks = DATA.works.filter(w => concept.workIds && concept.workIds.includes(w.id));
        const linkedEvents = getEvents(concept.eventIds);
        
        const container = document.getElementById('concept-detail-content');
        container.innerHTML = `
            <div class="card">
                <h2>${escapeHtml(concept.name)}</h2>
                <div>${renderMarkdown(concept.description || '')}</div>
                ${linkedAuthors.length ? '<h4>Authors</h4><ul>' + linkedAuthors.map(a => '<li><a href="#" class="author-link" data-id="' + escapeHtml(a.id) + '">' + escapeHtml(a.name) + '</a></li>').join('') + '</ul>' : ''}
                ${linkedWorks.length ? '<h4>Works</h4><ul>' + linkedWorks.map(w => '<li><a href="#" class="work-link" data-id="' + escapeHtml(w.id) + '">' + escapeHtml(w.title) + '</a></li>').join('') + '</ul>' : ''}
                ${linkedEvents.length ? '<h4>Historical Events</h4><ul>' + linkedEvents.map(e => '<li><a href="#" class="event-link" data-id="' + escapeHtml(e.id) + '">' + escapeHtml(e.name) + ' (' + e.year + ')</a></li>').join('') + '</ul>' : ''}
            </div>
        `;
        
        container.querySelectorAll('.author-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showAuthorDetail(this.dataset.id);
            });
        });
        container.querySelectorAll('.work-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showWorkDetail(this.dataset.id);
            });
        });
        container.querySelectorAll('.event-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showEventDetail(this.dataset.id);
            });
        });
        
        showView('concept-detail');
    }

    // ---------- HISTORY ----------
    function renderHistory(filter = '') {
        let filtered = DATA.history;
        
        if (filter) {
            const q = filter.toLowerCase();
            filtered = DATA.history.filter(e =>
                e.name.toLowerCase().includes(q) ||
                (e.region && e.region.toLowerCase().includes(q)) ||
                (e.year && e.year.toString().includes(q))
            );
        }
        
        const regionOrder = ['Global', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Middle East'];
        const groups = {};
        
        filtered.forEach(e => {
            const region = e.region || 'Other';
            if (!groups[region]) groups[region] = {};
            const spanStart = Math.floor((e.year || 0) / 50) * 50;
            const label = spanStart + '-' + (spanStart + 49);
            if (!groups[region][label]) groups[region][label] = [];
            groups[region][label].push(e);
        });
        
        const container = document.getElementById('history-content');
        container.innerHTML = '';
        
        function buildRegionBlock(region) {
            const rHeader = document.createElement('div');
            rHeader.className = 'accordion-header';
            rHeader.innerHTML = '<span class="arrow">▶</span> ' + escapeHtml(region);
            const rBody = document.createElement('div');
            rBody.className = 'accordion-body';
            
            const spans = groups[region];
            Object.keys(spans)
                .sort((a, b) => parseInt(b) - parseInt(a))
                .forEach(spanLabel => {
                    const events = spans[spanLabel];
                    const sHeader = document.createElement('div');
                    sHeader.className = 'accordion-header';
                    sHeader.innerHTML = '<span class="arrow">▶</span> ' + spanLabel + ' (' + events.length + ')';
                    const sBody = document.createElement('div');
                    sBody.className = 'accordion-body';
                    
                    events.forEach(ev => {
                        const div = document.createElement('div');
                        div.className = 'card';
                        div.innerHTML = '<h3><a href="#" class="event-link" data-id="' + escapeHtml(ev.id) + '">' + escapeHtml(ev.name) + '</a> (' + ev.year + ')</h3>';
                        div.querySelector('.event-link').addEventListener('click', function(e) {
                            e.preventDefault();
                            showEventDetail(this.dataset.id);
                        });
                        sBody.appendChild(div);
                    });
                    
                    sHeader.addEventListener('click', function() {
                        sHeader.classList.toggle('open');
                        sBody.classList.toggle('open');
                    });
                    
                    rBody.appendChild(sHeader);
                    rBody.appendChild(sBody);
                });
            
            rHeader.addEventListener('click', function() {
                rHeader.classList.toggle('open');
                rBody.classList.toggle('open');
            });
            
            container.appendChild(rHeader);
            container.appendChild(rBody);
        }
        
        // Build regions in order
        regionOrder.forEach(region => {
            if (groups[region]) buildRegionBlock(region);
        });
        // Build any remaining regions
        Object.keys(groups).forEach(region => {
            if (!regionOrder.includes(region)) buildRegionBlock(region);
        });
    }

    function showEventDetail(id) {
        const event = DATA.history.find(e => e.id === id);
        if (!event) return;
        
        const linkedAuthors = DATA.authors.filter(a => event.authorIds && event.authorIds.includes(a.id));
        const linkedWorks = DATA.works.filter(w => event.workIds && event.workIds.includes(w.id));
        const linkedConcepts = DATA.concepts.filter(c => event.conceptIds && event.conceptIds.includes(c.id));
        
        const container = document.getElementById('history-detail-content');
        container.innerHTML = `
            <div class="card">
                <h2>${escapeHtml(event.name)}</h2>
                <div class="meta">${event.year} – ${escapeHtml(event.region || '')}</div>
                <div>${renderMarkdown(event.description || '')}</div>
                ${linkedAuthors.length ? '<h4>Authors</h4><ul>' + linkedAuthors.map(a => '<li><a href="#" class="author-link" data-id="' + escapeHtml(a.id) + '">' + escapeHtml(a.name) + '</a></li>').join('') + '</ul>' : ''}
                ${linkedWorks.length ? '<h4>Works</h4><ul>' + linkedWorks.map(w => '<li><a href="#" class="work-link" data-id="' + escapeHtml(w.id) + '">' + escapeHtml(w.title) + '</a></li>').join('') + '</ul>' : ''}
                ${linkedConcepts.length ? '<h4>Concepts</h4><ul>' + linkedConcepts.map(c => '<li><a href="#" class="concept-link" data-id="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + '</a></li>').join('') + '</ul>' : ''}
            </div>
        `;
        
        container.querySelectorAll('.author-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showAuthorDetail(this.dataset.id);
            });
        });
        container.querySelectorAll('.work-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showWorkDetail(this.dataset.id);
            });
        });
        container.querySelectorAll('.concept-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showConceptDetail(this.dataset.id);
            });
        });
        
        showView('history-detail');
    }

    // ---------- INITIALIZATION ----------
    window.addEventListener('DOMContentLoaded', async function() {
        // Load data first
        const success = await loadData();
        if (!success) return;
        
        // Side panel navigation buttons
        document.querySelectorAll('.nav-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const viewName = this.dataset.view;
                
                // Switch view
                switch(viewName) {
                    case 'home':
                        showView('home');
                        renderHome();
                        break;
                    case 'works':
                        showView('works');
                        renderWorks();
                        break;
                    case 'authors':
                        showView('authors');
                        renderAuthors();
                        break;
                    case 'concepts':
                        showView('concepts');
                        renderConcepts();
                        break;
                    case 'history':
                        showView('history');
                        renderHistory();
                        break;
                }
            });
        });
        
        // Search handlers
        document.getElementById('home-search').addEventListener('input', function() {
            renderHome(this.value);
        });
        document.getElementById('works-search').addEventListener('input', function() {
            renderWorks(this.value);
        });
        document.getElementById('authors-search').addEventListener('input', function() {
            renderAuthors(this.value);
        });
        document.getElementById('concepts-search').addEventListener('input', function() {
            renderConcepts(this.value);
        });
        document.getElementById('history-search').addEventListener('input', function() {
            renderHistory(this.value);
        });
        
        // Title click goes home
        document.getElementById('app-title').addEventListener('click', function() {
            showView('home');
            renderHome();
        });
        
        // Initial render
        renderHome();
    });
})();