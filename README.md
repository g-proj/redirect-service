# Redirect Mapping Service

### For verbose documentation please see the file redirect-service-doc.md

A lightweight service that maps incoming traffic source parameters to a stable internal token (`our_param`), supports remapping, and redirects users without exposing source details.

## Features

- Accepts `keyword`, `src`, `creative` as input
- Generates or retrieves a stable `our_param`
- Redirects to a clean affiliate URL with only `our_param`
- Supports reverse lookup to recover original values
- Refresh functionality (with API key auth) to remap the same combo

## Getting Started

### 1. Clone and install
```bash
  git clone https://github.com/YOUR_USERNAME/redirect-service.git
  cd redirect-service
  npm install
```

### 2. Create .env
```ini
  PORT=3000
  AFFILIATE_URL=https://example.com
  API_KEY=supersecretkey
```

### 3. Start the server
```bash
  node src/server.js
```


## API Endpoints

### `GET /`
  Redirects to the affiliate URL with a stable `our_param`.

  ```http
  GET /?keyword=shoes&src=google&creative=1234
  → 302 Redirect to https://example.com?our_param=abc123xyz
  ```

  ### `GET /retrieve_original`
  Fetch the original traffic source parameters.

  - With `our_param`:
  ```http
  GET /retrieve_original?our_param=abc123xyz
  → { "keyword": "shoes", "src": "google", "creative": "1234" }
  ```

  - Without `our_param`:
  ```http
  GET /retrieve_original
  → {
      "warning": "No our_param provided. Returning most recent mapping.",
      "keyword": "...",
      "src": "...",
      "creative": "..."
    }
  ```

  ### `POST /refresh` _(requires API key)_
  ```http
  POST /refresh?keyword=shoes&src=google&creative=1234
  x-api-key: supersecretkey

  → { "new_param": "xyz456", "version": 2, "previous_param": "abc123" }
  ```


## Testing the API

  To simplify testing, the requests.http file can be used with REST Client (VS Code)
    
## Notes
  This is a proof-of-concept. For production, consider:
    HTTPS enforcement
    OAuth2 or JWT-based auth
    Audit logs and request tracking
    CI/CD and automated testing


**GitHub Repository:** [Redirect Service](https://github.com/g-proj/redirect-service.git)
