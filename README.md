# Mistral OCR API

A simple JavaScript API wrapper for Mistral's OCR service. This API allows you to extract text from documents and images using Mistral's powerful OCR capabilities.

## Features

- Process OCR from document URLs
- Generate and display markdown with embedded images
- Simple, focused UI for quick document processing

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd mistral_ocr
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your Mistral API key:
   ```
   MISTRAL_API_KEY=your_mistral_api_key_here
   PORT=3000
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. The API will be available at `http://localhost:3000`

## API Endpoint

### Process OCR from URL

```
POST /api/ocr/url
```

Request body:
```json
{
  "document_url": "https://example.com/document.pdf"
}
```

The API uses the following default values:
- `model`: "mistral-ocr-latest"
- `include_image_base64`: true

Optional parameters:
- `document_name`: Name of the document
- `pages`: Array of page numbers to process
- `image_limit`: Maximum number of images to extract
- `image_min_size`: Minimum size of images to extract

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:3000/api/ocr/url \
  -H "Content-Type: application/json" \
  -d '{
    "document_url": "https://example.com/document.pdf"
  }'
```

### Using JavaScript Fetch API

```javascript
fetch('http://localhost:3000/api/ocr/url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    document_url: 'https://example.com/document.pdf'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## Response Format

```json
{
  "pages": [
    {
      "page_num": 0,
      "text": "Extracted text content...",
      "markdown": "# Heading\n\nExtracted text with ![image1](image1) references",
      "images": [
        {
          "id": "image1",
          "url": "image_url",
          "image_base64": "base64_encoded_image_data",
          "width": 800,
          "height": 600
        }
      ]
    }
  ],
  "model": "mistral-ocr-latest",
  "usage_info": {
    "pages_processed": 1,
    "doc_size_bytes": 1024000
  },
  "combined_markdown": "# Heading\n\nExtracted text with ![image1](data:image/jpeg;base64,...) references"
}
```

### Markdown Support

The API includes markdown support with the following features:

1. Each page in the OCR response includes a markdown field with text and image references
2. The API processes these markdown files to replace image references with base64 data
3. A `combined_markdown` field is added to the response with all pages combined

## Web Interface

The API includes a simple web interface for testing:

1. Enter the document URL
2. Click "Process OCR"
3. View the rendered markdown content with embedded images

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- 400: Bad Request (missing required parameters)
- 422: Validation Error (invalid parameters)
- 500: Internal Server Error

## License

MIT 