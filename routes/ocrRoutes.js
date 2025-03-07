const express = require('express');
const { processOcrUrl } = require('../services/ocrService');
const db = require('../db');

const router = express.Router();

/**
 * @route POST /api/ocr/url
 * @desc Process OCR from a document URL
 */
router.post('/ocr/url', async (req, res) => {
  try {
    console.log('Received OCR request:', req.body); // Debug log
    const { document_url, force_refresh } = req.body;

    if (!document_url) {
      console.log('Missing document URL'); // Debug log
      return res.status(400).json({ 
        error: 'Document URL is required',
        message: 'Please provide a valid document URL to process'
      });
    }

    // Set default values
    const model = 'mistral-ocr-latest';
    const include_image_base64 = true;

    console.log('Processing with params:', { // Debug log
      model,
      document_url,
      force_refresh
    });

    const result = await processOcrUrl({
      model,
      document_url,
      document_name: null,
      pages: null,
      include_image_base64,
      image_limit: null,
      image_min_size: null
    }, force_refresh === true);

    console.log('OCR processing completed'); // Debug log
    res.json(result);
  } catch (error) {
    console.error('OCR URL Error:', error); // Enhanced error logging
    console.error('Error details:', { // Debug log
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message,
      message: 'An error occurred while processing the document. Please try again with a different URL.'
    });
  }
});

/**
 * @route POST /api/highlights
 * @desc Create a new highlight
 */
router.post('/highlights', async (req, res) => {
    try {
        const { documentId, sectionIndex, text, rangeStart, rangeEnd } = req.body;
        
        if (!documentId || sectionIndex === undefined || !text || rangeStart === undefined || rangeEnd === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const highlight = await db.saveHighlight(documentId, sectionIndex, text, rangeStart, rangeEnd);
        res.json(highlight);
    } catch (error) {
        console.error('Error creating highlight:', error);
        res.status(500).json({ error: 'Failed to create highlight' });
    }
});

/**
 * @route GET /api/highlights/:documentId
 * @desc Get all highlights for a document
 */
router.get('/highlights/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const highlights = await db.getHighlights(documentId);
        res.json(highlights);
    } catch (error) {
        console.error('Error fetching highlights:', error);
        res.status(500).json({ error: 'Failed to fetch highlights' });
    }
});

/**
 * @route DELETE /api/highlights/:highlightId
 * @desc Delete a highlight
 */
router.delete('/highlights/:highlightId', async (req, res) => {
    try {
        const { highlightId } = req.params;
        await db.deleteHighlight(highlightId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting highlight:', error);
        res.status(500).json({ error: 'Failed to delete highlight' });
    }
});

module.exports = router; 