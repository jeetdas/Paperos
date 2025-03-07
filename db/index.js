const { Pool } = require('pg');

// Create a new pool using the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// Initialize the database by creating the necessary tables if they don't exist
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Creating documents table if it doesn\'t exist...'); // Debug log
    // Create the documents table to store OCR results
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        url TEXT UNIQUE NOT NULL,
        title TEXT,
        content JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating highlights table if it doesn\'t exist...'); // Debug log
    // Create the highlights table
    await client.query(`
      CREATE TABLE IF NOT EXISTS highlights (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        section_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        range_start INTEGER NOT NULL,
        range_end INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Save a document to the database
async function saveDocument(url, title, content) {
  const client = await pool.connect();
  try {
    console.log('Saving document:', { url, title }); // Debug log
    // Check if the document already exists
    const checkResult = await client.query(
      'SELECT id FROM documents WHERE url = $1',
      [url]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Updating existing document...'); // Debug log
      // Update existing document
      const result = await client.query(
        `UPDATE documents 
         SET content = $1, 
             title = $2, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE url = $3 
         RETURNING id, created_at, updated_at`,
        [content, title, url]
      );
      console.log('Document updated successfully'); // Debug log
      return {
        id: result.rows[0].id,
        url,
        title,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        isNew: false
      };
    } else {
      console.log('Inserting new document...'); // Debug log
      // Insert new document
      const result = await client.query(
        `INSERT INTO documents (url, title, content) 
         VALUES ($1, $2, $3) 
         RETURNING id, created_at, updated_at`,
        [url, title, content]
      );
      console.log('Document inserted successfully'); // Debug log
      return {
        id: result.rows[0].id,
        url,
        title,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        isNew: true
      };
    }
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get a document by URL
async function getDocumentByUrl(url) {
  const client = await pool.connect();
  try {
    console.log('Fetching document by URL:', url); // Debug log
    const result = await client.query(
      'SELECT * FROM documents WHERE url = $1',
      [url]
    );
    console.log('Document fetch result:', result.rows[0] ? 'Found' : 'Not found'); // Debug log
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get recent documents
async function getRecentDocuments(limit = 10) {
  const client = await pool.connect();
  try {
    console.log('Fetching recent documents, limit:', limit); // Debug log
    const result = await client.query(
      `SELECT id, url, title, created_at, updated_at 
       FROM documents 
       ORDER BY updated_at DESC 
       LIMIT $1`,
      [limit]
    );
    console.log('Found recent documents:', result.rows.length); // Debug log
    return result.rows;
  } catch (error) {
    console.error('Error getting recent documents:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Save a highlight
async function saveHighlight(documentId, sectionIndex, text, rangeStart, rangeEnd) {
  const client = await pool.connect();
  try {
    console.log('Saving highlight:', {
      documentId,
      sectionIndex,
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      rangeStart,
      rangeEnd
    });

    // Verify document exists
    const docCheck = await client.query(
      'SELECT id FROM documents WHERE id = $1',
      [documentId]
    );

    if (docCheck.rows.length === 0) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    const result = await client.query(
      `INSERT INTO highlights 
       (document_id, section_index, text, range_start, range_end)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [documentId, sectionIndex, text, rangeStart, rangeEnd]
    );

    console.log('Highlight saved successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error saving highlight:', {
      error: error.message,
      documentId,
      sectionIndex
    });
    throw error;
  } finally {
    client.release();
  }
}

// Get highlights for a document
async function getHighlights(documentId) {
  const client = await pool.connect();
  try {
    console.log('Fetching highlights for document:', documentId);

    // Verify document exists
    const docCheck = await client.query(
      'SELECT id FROM documents WHERE id = $1',
      [documentId]
    );

    if (docCheck.rows.length === 0) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    const result = await client.query(
      `SELECT * FROM highlights 
       WHERE document_id = $1 
       ORDER BY section_index, range_start`,
      [documentId]
    );

    console.log(`Found ${result.rows.length} highlights for document ${documentId}`);
    return result.rows;
  } catch (error) {
    console.error('Error getting highlights:', {
      error: error.message,
      documentId
    });
    throw error;
  } finally {
    client.release();
  }
}

// Delete a highlight
async function deleteHighlight(highlightId) {
  const client = await pool.connect();
  try {
    console.log('Deleting highlight:', highlightId);

    const result = await client.query(
      `DELETE FROM highlights 
       WHERE id = $1 
       RETURNING id, document_id`,
      [highlightId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Highlight with ID ${highlightId} not found`);
    }

    console.log('Highlight deleted successfully:', highlightId);
    return true;
  } catch (error) {
    console.error('Error deleting highlight:', {
      error: error.message,
      highlightId
    });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
  saveDocument,
  getDocumentByUrl,
  getRecentDocuments,
  saveHighlight,
  getHighlights,
  deleteHighlight
}; 