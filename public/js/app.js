// Theme functionality
const themeToggle = document.getElementById('theme-toggle');
const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Check for saved theme preference or use the system preference
const currentTheme = localStorage.getItem('theme') || 
                    (prefersDarkScheme.matches ? 'dark' : 'light');

// Apply the current theme
if (currentTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
} else {
    document.body.removeAttribute('data-theme');
}

// Function to toggle theme
function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Toggle theme when either switch is clicked
themeToggle.addEventListener('click', toggleTheme);
mobileThemeToggle.addEventListener('click', toggleTheme);

// Mobile navigation functionality
const mobileNavToggle = document.getElementById('mobile-nav-toggle');
const mobileDrawerClose = document.getElementById('mobile-drawer-close');
const mobileDrawer = document.getElementById('mobile-drawer');

function openMobileDrawer() {
    mobileDrawer.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeMobileDrawer() {
    mobileDrawer.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

mobileNavToggle.addEventListener('click', openMobileDrawer);
mobileDrawerClose.addEventListener('click', closeMobileDrawer);

// Close drawer when clicking outside
document.addEventListener('click', (e) => {
    if (mobileDrawer.classList.contains('active') && 
        !e.target.closest('#mobile-drawer') && 
        !e.target.closest('#mobile-nav-toggle')) {
        closeMobileDrawer();
    }
});

// Document processing functionality
async function processDocument(forceRefresh = false) {
    const documentUrl = document.getElementById('document-url').value.trim();
    console.log('Processing document:', documentUrl, 'forceRefresh:', forceRefresh);
    
    if (!documentUrl) {
        showError('Please enter a document URL');
        return;
    }

    showLoading(true);
    clearResults();

    try {
        console.log('Sending request to server...');
        const response = await fetch('/api/ocr/url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                document_url: documentUrl,
                force_refresh: forceRefresh
            })
        });

        console.log('Response received:', response.status);
        const result = await response.json();
        console.log('Response data:', result);

        if (!response.ok) {
            throw new Error(result.message || 'Failed to process document');
        }

        displayResults(result);
        await loadRecentDocuments();
    } catch (error) {
        console.error('Error processing document:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Document list functionality
async function loadRecentDocuments() {
    try {
        const response = await fetch('/api/documents/recent');
        const documents = await response.json();
        
        updateDocumentList(documents, 'document-list');
        updateDocumentList(documents, 'mobile-document-list');
    } catch (error) {
        console.error('Error loading recent documents:', error);
    }
}

function updateDocumentList(documents, listId) {
    const documentList = document.getElementById(listId);
    documentList.innerHTML = '';
    
    if (documents.length === 0) {
        documentList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-light);">
                <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>No documents processed yet</p>
            </div>
        `;
        return;
    }
    
    documents.forEach(doc => {
        const docElement = document.createElement('div');
        docElement.className = 'document-item';
        docElement.innerHTML = `
            <div class="document-title">${doc.title || 'Untitled Document'}</div>
            <div class="document-meta">
                <span class="document-date">${formatDate(doc.updated_at)}</span>
                <button class="reindex-button" title="Reindex document" onclick="reindexDocument('${doc.url}')">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
        `;
        
        docElement.addEventListener('click', (e) => {
            if (e.target.closest('.reindex-button')) return;
            
            const urlInput = document.getElementById('document-url');
            urlInput.value = doc.url;
            processDocument(false);
            closeMobileDrawer();
        });
        
        documentList.appendChild(docElement);
    });
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    const resultCard = document.getElementById('result-card');
    
    loadingElement.style.display = show ? 'block' : 'none';
    if (show) {
        resultCard.style.display = 'none';
        loadingElement.scrollIntoView({ behavior: 'smooth' });
    }
}

function clearResults() {
    const resultCard = document.getElementById('result-card');
    const markdownContent = document.getElementById('markdown-content');
    resultCard.style.display = 'none';
    markdownContent.innerHTML = '';
}

function showError(message) {
    const markdownContent = document.getElementById('markdown-content');
    const resultCard = document.getElementById('result-card');
    
    let errorMessage = message;
    let helpText = 'Please check the URL and try again. Make sure the document is publicly accessible.';

    if (message.includes('Service unavailable')) {
        helpText = 'The OCR service is temporarily unavailable. Please try again in a few moments.';
    } else if (message.includes('404')) {
        helpText = 'The document could not be found. Please check if the URL is correct and the document is publicly accessible.';
    } else if (message.includes('403')) {
        helpText = 'Access to the document was denied. Please ensure the document is publicly accessible.';
    }
    
    markdownContent.innerHTML = `
        <div style="color: var(--error); padding: 1rem; border: 1px solid var(--error); border-radius: 8px; margin-bottom: 1rem;">
            <h3><i class="fa-solid fa-circle-exclamation"></i> Error</h3>
            <p>${errorMessage}</p>
        </div>
        <p>${helpText}</p>
        <div style="margin-top: 1rem; padding: 1rem; background-color: var(--primary-light); border-radius: 8px;">
            <h4>Tips for URL format:</h4>
            <ul>
                <li>For arXiv papers, you can use either:
                    <ul>
                        <li>Abstract URL: https://arxiv.org/abs/2201.04234</li>
                        <li>Direct PDF URL: https://arxiv.org/pdf/2201.04234.pdf</li>
                    </ul>
                </li>
                <li>Make sure the URL points to a PDF or image file</li>
                <li>The document should be publicly accessible without login</li>
            </ul>
        </div>
    `;
    
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });
}

// Create highlight popup
const highlightPopup = document.createElement('div');
highlightPopup.className = 'highlight-popup';
highlightPopup.innerHTML = `
    <button class="highlight-button highlight-add">
        <i class="fa-solid fa-highlighter"></i>
        Highlight
    </button>
    <button class="highlight-button highlight-remove" style="display: none">
        <i class="fa-solid fa-eraser"></i>
        Remove
    </button>
`;
document.body.appendChild(highlightPopup);

let currentHighlight = null;
let currentDocumentId = null;

function displayResults(result) {
    const markdownContent = document.getElementById('markdown-content');
    const resultCard = document.getElementById('result-card');
    
    if (result.combined_markdown) {
        // Set up marked options
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });

        // Split content into sections based on h1 or h2 headers
        const sections = splitIntoSections(result.combined_markdown);
        
        // Create section navigation
        const sectionNav = document.createElement('div');
        sectionNav.className = 'section-nav';
        
        // Create dropdown select
        const select = document.createElement('select');
        select.className = 'section-select';
        select.setAttribute('aria-label', 'Select document section');
        
        // Create dropdown icon
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-chevron-down section-nav-icon';
        
        // Create sections container
        const sectionsContainer = document.createElement('div');
        sectionsContainer.className = 'sections-container';
        
        // Add options and section content
        sections.forEach((section, index) => {
            // Create select option
            const option = document.createElement('option');
            option.value = index;
            option.textContent = section.title || `Section ${index + 1}`;
            select.appendChild(option);
            
            // Create section content
            const sectionContent = document.createElement('div');
            sectionContent.className = `section-content ${index === 0 ? 'active' : ''}`;
            sectionContent.id = `section-${index}`;
            
            // Add section header with navigation
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'section-nav-header';
            sectionHeader.innerHTML = `
                <div class="section-nav-title">
                    <h3>${section.title || `Section ${index + 1}`}</h3>
                    <span class="page-indicator">
                        <i class="fa-solid fa-book-open"></i>
                        Page ${index + 1} of ${sections.length}
                    </span>
                </div>
            `;
            
            // Parse and add content
            const contentHtml = marked.parse(section.content);
            sectionContent.innerHTML = sectionHeader.outerHTML + contentHtml;
            
            sectionsContainer.appendChild(sectionContent);
        });
        
        // Add change event listener to select
        select.addEventListener('change', (e) => {
            switchSection(parseInt(e.target.value));
        });
        
        // Add elements to the navigation
        sectionNav.appendChild(select);
        sectionNav.appendChild(icon);
        
        // Add navigation and content to the markdown container
        markdownContent.innerHTML = '';
        markdownContent.appendChild(sectionNav);
        markdownContent.appendChild(sectionsContainer);
        
        // Create sticky navigation buttons
        const stickyNav = document.createElement('div');
        stickyNav.className = 'sticky-nav-buttons';
        stickyNav.innerHTML = `
            <button class="nav-button prev-button" aria-label="Previous section" disabled>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button class="nav-button next-button" aria-label="Next section">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;
        
        // Add click handlers for navigation buttons
        const prevButton = stickyNav.querySelector('.prev-button');
        const nextButton = stickyNav.querySelector('.next-button');
        
        prevButton.addEventListener('click', () => {
            const currentIndex = parseInt(select.value);
            if (currentIndex > 0) {
                switchSection(currentIndex - 1);
            }
        });
        
        nextButton.addEventListener('click', () => {
            const currentIndex = parseInt(select.value);
            if (currentIndex < sections.length - 1) {
                switchSection(currentIndex + 1);
            }
        });
        
        // Add sticky navigation to the document
        document.body.appendChild(stickyNav);
        
        // Set up image click handlers
        setupImageHandlers(markdownContent);
        
        // Add keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
        
        // Store document ID for highlights
        currentDocumentId = result.metadata.id;
        
        // Load existing highlights
        loadHighlights(currentDocumentId);
        
        // Set up highlight handlers
        setupHighlightHandlers(markdownContent);
    } else {
        markdownContent.innerHTML = '<p>No content could be extracted from this document. Please try another URL.</p>';
    }
    
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });
}

function switchSection(index) {
    const sections = document.querySelectorAll('.section-content');
    const select = document.querySelector('.section-select');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    
    sections.forEach(section => section.classList.remove('active'));
    sections[index].classList.add('active');
    select.value = index;
    
    // Update navigation button states
    prevButton.disabled = index === 0;
    nextButton.disabled = index === sections.length - 1;
    
    // Find the section header within the active section and scroll to it
    const activeSection = sections[index];
    const sectionHeader = activeSection.querySelector('.section-nav-header');
    
    // Calculate the header position relative to the viewport
    const headerRect = sectionHeader.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Scroll to the header with some padding
    window.scrollTo({
        top: scrollTop + headerRect.top - 100, // 100px padding from top
        behavior: 'smooth'
    });
}

function handleKeyboardNavigation(e) {
    const select = document.querySelector('.section-select');
    if (!select) return;
    
    const currentIndex = parseInt(select.value);
    const maxIndex = select.options.length - 1;
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < maxIndex) {
            switchSection(currentIndex + 1);
        }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
            switchSection(currentIndex - 1);
        }
    }
}

function splitIntoSections(markdown) {
    const lines = markdown.split('\n');
    const sections = [];
    let currentSection = { title: '', content: '' };
    let isFirstHeader = true;
    
    lines.forEach(line => {
        const headerMatch = line.match(/^(#{1,2})\s+(.+)$/);
        
        if (headerMatch && (headerMatch[1] === '#' || headerMatch[1] === '##')) {
            if (!isFirstHeader) {
                sections.push({ ...currentSection });
                currentSection = { title: '', content: '' };
            }
            currentSection.title = headerMatch[2];
            isFirstHeader = false;
        } else {
            currentSection.content += line + '\n';
        }
    });
    
    // Add the last section
    if (currentSection.content || currentSection.title) {
        sections.push(currentSection);
    }
    
    // If no sections were created, treat the entire content as one section
    if (sections.length === 0) {
        sections.push({ title: 'Document', content: markdown });
    }
    
    return sections;
}

function setupImageHandlers(container) {
    const images = container.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('click', function() {
            if (this.style.maxWidth === '100%') {
                this.style.maxWidth = '100%';
                this.style.cursor = 'zoom-in';
            } else {
                this.style.maxWidth = '100%';
                this.style.cursor = 'zoom-out';
            }
        });
        img.style.cursor = 'zoom-in';
    });
}

async function reindexDocument(url) {
    try {
        const urlInput = document.getElementById('document-url');
        urlInput.value = url;
        await processDocument(true);
        await loadRecentDocuments();
    } catch (error) {
        console.error('Error reindexing document:', error);
    }
}

function setupHighlightHandlers(container) {
    // Handle text selection
    container.addEventListener('mouseup', handleTextSelection);
    container.addEventListener('touchend', handleTextSelection);
    
    // Handle clicks on highlighted text
    container.addEventListener('click', handleHighlightClick);
    container.addEventListener('touchend', handleHighlightClick);
    
    // Hide popup when clicking/touching outside
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    
    // Set up highlight buttons
    const addButton = highlightPopup.querySelector('.highlight-add');
    const removeButton = highlightPopup.querySelector('.highlight-remove');
    
    addButton.addEventListener('click', createHighlight);
    removeButton.addEventListener('click', removeHighlight);
    
    // Prevent text selection when tapping buttons on mobile
    addButton.addEventListener('touchstart', (e) => e.preventDefault());
    removeButton.addEventListener('touchstart', (e) => e.preventDefault());
}

function handleOutsideClick(e) {
    if (!highlightPopup.contains(e.target) && !e.target.closest('.highlighted-text')) {
        hideHighlightPopup();
    }
}

function handleTextSelection(e) {
    // Don't show popup if the event is from a highlight button
    if (e.target.closest('.highlight-button')) {
        return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText) {
        return;
    }
    
    // Don't show popup if selection is within a highlight
    if (e.target.closest('.highlighted-text')) {
        return;
    }
    
    // For touch events, wait a bit to ensure the selection is complete
    if (e.type === 'touchend') {
        setTimeout(() => {
            const updatedSelection = window.getSelection();
            const updatedText = updatedSelection.toString().trim();
            
            if (updatedText) {
                const range = updatedSelection.getRangeAt(0);
                showHighlightPopup(range.getBoundingClientRect(), false);
                currentHighlight = {
                    range,
                    text: updatedText,
                    sectionIndex: getCurrentSectionIndex()
                };
            }
        }, 100);
    } else {
        const range = selection.getRangeAt(0);
        showHighlightPopup(range.getBoundingClientRect(), false);
        currentHighlight = {
            range,
            text: selectedText,
            sectionIndex: getCurrentSectionIndex()
        };
    }
    
    // Prevent default behavior on touch devices
    if (e.type === 'touchend') {
        e.preventDefault();
    }
}

function handleHighlightClick(e) {
    const highlightEl = e.target.closest('.highlighted-text');
    if (!highlightEl) return;
    
    const rect = highlightEl.getBoundingClientRect();
    showHighlightPopup(rect, true);
    currentHighlight = {
        element: highlightEl,
        id: highlightEl.dataset.highlightId
    };
}

function showHighlightPopup(rect, isExisting) {
    highlightPopup.classList.add('active');
    highlightPopup.querySelector('.highlight-add').style.display = isExisting ? 'none' : 'flex';
    highlightPopup.querySelector('.highlight-remove').style.display = isExisting ? 'flex' : 'none';
}

function hideHighlightPopup() {
    highlightPopup.classList.remove('active');
    currentHighlight = null;
}

async function createHighlight() {
    if (!currentHighlight || !currentDocumentId) {
        console.error('Missing required data:', { currentHighlight, currentDocumentId });
        return;
    }
    
    const { range, text, sectionIndex } = currentHighlight;
    
    // Get the container node (section content)
    const section = document.querySelector(`#section-${sectionIndex}`);
    if (!section) {
        console.error('Section not found:', sectionIndex);
        return;
    }
    
    // Calculate absolute position within the section
    const textNodes = getAllTextNodes(section);
    let rangeStart = 0;
    let foundStart = false;
    
    for (const node of textNodes) {
        if (node === range.startContainer) {
            rangeStart += range.startOffset;
            foundStart = true;
            break;
        }
        rangeStart += node.textContent.length;
    }
    
    if (!foundStart) {
        console.error('Could not find range start position');
        return;
    }
    
    const rangeEnd = rangeStart + text.length;
    
    console.log('Creating highlight:', {
        documentId: currentDocumentId,
        sectionIndex,
        text,
        rangeStart,
        rangeEnd
    });
    
    try {
        const response = await fetch('/api/highlights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentId: currentDocumentId,
                sectionIndex,
                text,
                rangeStart,
                rangeEnd
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save highlight');
        }
        
        const highlight = await response.json();
        console.log('Highlight saved successfully:', highlight);
        
        // Create highlight element
        const span = document.createElement('span');
        span.className = 'highlighted-text';
        span.dataset.highlightId = highlight.id;
        span.textContent = text;
        
        range.deleteContents();
        range.insertNode(span);
        
        hideHighlightPopup();
    } catch (error) {
        console.error('Error creating highlight:', error);
    }
}

async function removeHighlight() {
    if (!currentHighlight) return;
    
    try {
        await fetch(`/api/highlights/${currentHighlight.id}`, {
            method: 'DELETE'
        });
        
        // Remove highlight element
        const text = currentHighlight.element.textContent;
        const textNode = document.createTextNode(text);
        currentHighlight.element.parentNode.replaceChild(textNode, currentHighlight.element);
        
        hideHighlightPopup();
    } catch (error) {
        console.error('Error removing highlight:', error);
    }
}

async function loadHighlights(documentId) {
    if (!documentId) {
        console.error('Document ID is required to load highlights');
        return;
    }

    try {
        console.log('Loading highlights for document:', documentId);
        const response = await fetch(`/api/highlights/${documentId}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load highlights');
        }
        
        const highlights = await response.json();
        console.log('Loaded highlights:', highlights);
        
        highlights.forEach(highlight => {
            const section = document.querySelector(`#section-${highlight.section_index}`);
            if (!section) {
                console.error('Section not found:', highlight.section_index);
                return;
            }
            
            // Find the text node containing the highlight
            const textNodes = getAllTextNodes(section);
            let currentPos = 0;
            let targetNode = null;
            let offset = 0;
            
            for (const node of textNodes) {
                const nodeLength = node.textContent.length;
                if (currentPos + nodeLength > highlight.range_start) {
                    targetNode = node;
                    offset = highlight.range_start - currentPos;
                    break;
                }
                currentPos += nodeLength;
            }
            
            if (targetNode) {
                try {
                    const range = document.createRange();
                    range.setStart(targetNode, offset);
                    range.setEnd(targetNode, offset + highlight.text.length);
                    
                    const span = document.createElement('span');
                    span.className = 'highlighted-text';
                    span.dataset.highlightId = highlight.id;
                    range.surroundContents(span);
                    
                    console.log('Highlight applied:', highlight.id);
                } catch (error) {
                    console.error('Error applying highlight:', {
                        highlightId: highlight.id,
                        error: error.message,
                        nodeText: targetNode.textContent,
                        offset,
                        length: highlight.text.length
                    });
                }
            } else {
                console.error('Target node not found for highlight:', highlight);
            }
        });
    } catch (error) {
        console.error('Error loading highlights:', error);
    }
}

function getAllTextNodes(element) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip text nodes in script and style elements
                if (node.parentNode.nodeName === 'SCRIPT' || 
                    node.parentNode.nodeName === 'STYLE') {
                    return NodeFilter.FILTER_REJECT;
                }
                // Skip empty text nodes
                if (node.textContent.trim() === '') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
        nodes.push(node);
    }
    return nodes;
}

function getCurrentSectionIndex() {
    const activeSection = document.querySelector('.section-content.active');
    return activeSection ? parseInt(activeSection.id.replace('section-', '')) : 0;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadRecentDocuments();
    
    const form = document.getElementById('url-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processDocument(false);
    });
}); 