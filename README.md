# Paperos

A modern document analysis tool powered by Mistral AI. Paperos allows you to extract, analyze, and navigate through documents with a beautiful and intuitive interface.

## Features

- 📄 Process documents from URLs (PDF, images)
- 📝 Extract and format text with markdown
- 🖼️ Preserve and display document images
- 📱 Responsive design for mobile and desktop
- 🌓 Dark/light theme support
- 🔄 Document caching and history
- ⌨️ Keyboard navigation support
- 📊 Section-based document navigation

## Prerequisites

- Node.js 16 or higher
- PostgreSQL 12 or higher
- Mistral AI API key

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/paperos.git
   cd paperos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   # Connect to PostgreSQL
   psql postgres

   # Create the database
   CREATE DATABASE paperos;

   # You can now exit psql
   \q
   ```

4. Configure environment variables:
   ```bash
   # Copy the sample environment file
   cp .env-sample .env

   # Edit the .env file with your settings:
   # - Set your Mistral API key
   # - Update database connection string if needed
   # - Adjust port if needed
   ```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. For production:
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Process Document

```http
POST /api/ocr/url
Content-Type: application/json

{
  "document_url": "https://example.com/document.pdf",
  "force_refresh": false  // Optional: force reprocessing of cached documents
}
```

### Get Recent Documents

```http
GET /api/documents/recent
```

## Database Schema

The application uses PostgreSQL with the following schema:

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port number | No | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `MISTRAL_API_KEY` | Mistral AI API key | Yes | - |

## Development

The project structure:

```
paperos/
├── db/             # Database setup and queries
├── public/         # Static files
│   ├── css/       # Stylesheets
│   ├── js/        # Client-side JavaScript
│   └── index.html # Main HTML file
├── routes/         # API routes
├── services/       # Business logic
└── index.js       # Application entry point
```

## License

MIT

## Acknowledgments

- Powered by [Mistral AI](https://mistral.ai)
- Built with Express.js and PostgreSQL
- UI components inspired by modern design practices 