const axios = require('axios');
const db = require('../db');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_OCR_ENDPOINT = 'https://api.mistral.ai/v1/ocr';

/**
 * Process OCR from a document URL
 * @param {Object} params - OCR parameters
 * @param {boolean} forceRefresh - Whether to force a refresh from the API even if cached
 * @returns {Promise<Object>} - OCR results with metadata
 */
async function processOcrUrl({
  model,
  document_url,
  document_name,
  pages,
  include_image_base64,
  image_limit,
  image_min_size
}, forceRefresh = false) {
  try {
    // Format arXiv URLs correctly
    const formattedUrl = formatDocumentUrl(document_url);
    console.log('Formatted URL:', formattedUrl); // Debug log

    console.log('Starting OCR processing for URL:', formattedUrl);
    console.log('Force refresh:', forceRefresh);

    // Check if we have this document in the database and it's not a forced refresh
    if (!forceRefresh) {
      console.log('Checking database for existing document...');
      const existingDoc = await db.getDocumentByUrl(formattedUrl);
      if (existingDoc) {
        console.log('Found existing document in database');
        return {
          ...existingDoc.content,
          metadata: {
            id: existingDoc.id,
            url: existingDoc.url,
            title: existingDoc.title,
            created_at: existingDoc.created_at,
            updated_at: existingDoc.updated_at,
            fromCache: true
          }
        };
      }
      console.log('No existing document found in database');
    }

    // If not in database or forced refresh, call the API
    const payload = {
      model,
      document: {
        type: 'document_url',
        document_url: formattedUrl,
        document_name: document_name || undefined
      }
    };

    // Add optional parameters if provided
    if (pages) payload.pages = pages;
    if (include_image_base64 !== undefined) payload.include_image_base64 = include_image_base64;
    if (image_limit !== undefined) payload.image_limit = image_limit;
    if (image_min_size !== undefined) payload.image_min_size = image_min_size;

    console.log('Calling Mistral API with payload:', {
      ...payload,
      document: {
        ...payload.document,
        document_url: formattedUrl
      }
    });

    const response = await axios.post(MISTRAL_OCR_ENDPOINT, payload, {
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Received response from Mistral API');

    // Process the response to include markdown with embedded images
    const processedResponse = processMarkdownWithImages(response.data);
    
    // Extract a title from the first page if available
    let title = document_name || '';
    if (processedResponse.pages && processedResponse.pages.length > 0) {
      const firstPage = processedResponse.pages[0];
      if (firstPage.markdown) {
        // Try to extract a title from the first heading or first line
        const headingMatch = firstPage.markdown.match(/^#\s+(.+)$/m);
        if (headingMatch) {
          title = headingMatch[1].trim();
        } else {
          // Use the first line as title if no heading
          const firstLine = firstPage.markdown.split('\n')[0];
          if (firstLine) {
            title = firstLine.trim().substring(0, 100); // Limit title length
          }
        }
      }
    }
    
    console.log('Saving document to database...');
    // Save to database with the formatted URL
    const savedDoc = await db.saveDocument(formattedUrl, title, processedResponse);
    console.log('Document saved successfully');
    
    // Add metadata to the response
    return {
      ...processedResponse,
      metadata: {
        id: savedDoc.id,
        url: savedDoc.url,
        title: savedDoc.title,
        created_at: savedDoc.created_at,
        updated_at: savedDoc.updated_at,
        fromCache: false
      }
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw error;
  }
}

/**
 * Format document URL to ensure it's in the correct format
 * @param {string} url - The input URL
 * @returns {string} - The formatted URL
 */
function formatDocumentUrl(url) {
  // Handle arXiv URLs
  if (url.includes('arxiv.org')) {
    // Extract the arXiv ID
    const match = url.match(/arxiv\.org(?:\/abs|\/pdf)?\/(\d+\.\d+)/);
    if (match) {
      return `https://arxiv.org/pdf/${match[1]}.pdf`;
    }
  }
  return url;
}

/**
 * Process the OCR response to include markdown with embedded images
 * @param {Object} ocrResponse - The OCR response
 * @returns {Object} - The processed response with markdown
 */
function processMarkdownWithImages(ocrResponse) {
  // Create a copy of the response to avoid modifying the original
  const processedResponse = JSON.parse(JSON.stringify(ocrResponse));
  
  // Add combined markdown to the response
  processedResponse.combined_markdown = getCombinedMarkdown(ocrResponse);
  
  return processedResponse;
}

/**
 * Replace image references in markdown with base64 data
 * @param {string} markdownStr - The markdown string
 * @param {Object} imagesDict - Dictionary of image IDs to base64 strings
 * @returns {string} - The processed markdown
 */
function replaceImagesInMarkdown(markdownStr, imagesDict) {
  let result = markdownStr;
  for (const [imgName, base64Str] of Object.entries(imagesDict)) {
    result = result.replace(
      new RegExp(`!\\[${imgName}\\]\\(${imgName}\\)`, 'g'),
      `![${imgName}](${base64Str})`
    );
  }
  return result;
}

/**
 * Get combined markdown from all pages
 * @param {Object} ocrResponse - The OCR response
 * @returns {string} - The combined markdown
 */
function getCombinedMarkdown(ocrResponse) {
  const markdowns = [];
  
  if (ocrResponse.pages) {
    for (const page of ocrResponse.pages) {
      if (page.markdown) {
        const imageData = {};
        
        // Create image data dictionary
        if (page.images) {
          for (const img of page.images) {
            if (img.id && img.image_base64) {
              imageData[img.id] = img.image_base64;
            }
          }
        }
        
        // Replace image references with base64 data
        markdowns.push(replaceImagesInMarkdown(page.markdown, imageData));
      }
    }
  }
  
  return markdowns.join('\n\n');
}

module.exports = {
  processOcrUrl,
  getCombinedMarkdown,
  replaceImagesInMarkdown
}; 