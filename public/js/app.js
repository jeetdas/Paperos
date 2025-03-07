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
        
        // Set up image click handlers
        setupImageHandlers(markdownContent);
        
        // Add keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
    } else {
        markdownContent.innerHTML = '<p>No content could be extracted from this document. Please try another URL.</p>';
    }
    
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });
}

function switchSection(index) {
    const sections = document.querySelectorAll('.section-content');
    const select = document.querySelector('.section-select');
    
    sections.forEach(section => section.classList.remove('active'));
    sections[index].classList.add('active');
    select.value = index;
    
    // Smooth scroll to the top of the new section
    sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadRecentDocuments();
    
    const form = document.getElementById('url-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processDocument(false);
    });

    // Copy text button
    document.getElementById('copy-button').addEventListener('click', function() {
        const markdownContent = document.getElementById('markdown-content');
        const textToCopy = markdownContent.innerText;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            
            setTimeout(() => {
                this.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });

    // Download button
    document.getElementById('download-button').addEventListener('click', function() {
        const markdownContent = document.getElementById('markdown-content').innerText;
        const blob = new Blob([markdownContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = 'document_analysis.txt';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    });

    // New search button
    document.getElementById('new-search-button').addEventListener('click', function() {
        document.getElementById('url-form').reset();
        document.getElementById('result-card').style.display = 'none';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
            document.getElementById('document-url').focus();
        }, 500);
    });
}); 