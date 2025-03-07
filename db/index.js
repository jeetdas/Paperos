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
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error; // Propagate the error
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

module.exports = {
  pool,
  initializeDatabase,
  saveDocument,
  getDocumentByUrl,
  getRecentDocuments
}; 