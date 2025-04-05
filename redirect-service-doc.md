## Redirect Mapping System – Technical Documentation

**Overview**
  - This system maps incoming traffic source parameters (`keyword`, `src`, `creative`) to a single internal identifier (`our_param`). 
  - It ensures consistent mapping for repeat requests and provides functionality to re-map an existing combination using a secure refresh mechanism.

### 1. Architecture and Design Choices

  - **Framework**: Node.js with Express for handling HTTP requests
  - **Storage**: SQLite with WAL mode enabled for concurrency
  - **Structure**:
    - `GET /`: Accepts incoming traffic with query string params `keyword`, `src`, `creative`
      - If the combination exists, the same `our_param` is returned
      - If it's new, a fresh `our_param` is generated and stored
      - The user is redirected to the configured `AFFILIATE_URL` with only `our_param`
    - `GET /retrieve_original`: Retrieves the original mapping from `our_param`
      - If `our_param` is not provided, the most recent mapping is returned (with a warning)
    - `POST /refresh`: Accepts same query string params and forces a new `our_param` (protected)

  - **Modular Design**:
    - `router.js`: Handles all routes
    - `mappingService.js`: Encapsulates DB logic
    - `paramUtils.js`: Handles internal parameter generation


### 2. Data Structures and Storage Mechanism

  **Database**: SQLite (using `better-sqlite3`)
    - Fast, persistent, and easy to manage for 1M requests/day scale
  **Table: mappings**
  ```sql
  CREATE TABLE mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    src TEXT NOT NULL,
    creative TEXT NOT NULL,
    our_param TEXT NOT NULL UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    previous_param TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
  - Indexes are automatically optimized with the primary key and `our_param`
  - Unique constraints on `our_param`
  - Versioning supports tracking refreshes
  - `previous_param` enables back-tracing


### 3. Ensuring Consistency and Reversibility of Mappings

  - **Consistency**: Same input always returns same `our_param` unless explicitly refreshed
  - **Reversibility**: `GET /retrieve_original?our_param=...` returns original `keyword`, `src`, and `creative`
  - **Stable Mapping**: Deterministic hash generation ensures identical input yields the same output (unless explicitly refreshed)
  - **Recording**: Refreshes are versioned, so older values are not overwritten


### 4. Refresh Mechanism

  - `POST /refresh` with query string params `keyword`, `src`, and `creative`
  - Requires API key for authorization
  - Current mapping (if exists) is fetched
  - Creates a new `our_param` using a salt in the hash
  - Increments version number allowing for tracking lineage and enables mapping reversibility over time
  - Stores link to previous `our_param`
  - Returns `new_param`, `version`, and `previous_param`


### 5. Security Considerations

  - **No leakage of source parameters**: Only `our_param` is visible externally
  - **Use of SHA-256 hash + base62 encoding**
  - **API Authentication**:
      - /refresh is protected with an API key passed via headers
      - Server checks for `x-api-key` against a secret in the .env file (e.g., API_KEY=supersecretkey)
      - Unauthorized requests are rejected with 403 Forbidden
  - HTTPS is not enforced in the POC, but would be added in production via reverse proxy (e.g., NGINX or cloud provider).


### 6. Performance Optimizations

  - **SQLite WAL mode**: Supports concurrent reads and writes
  - **Indexed lookups**: Fast reverse lookup on `our_param`
  - **Base62 hash**: Compact yet unique value for redirect usage
  - **Modular code**: Easily swappable storage layer for scaling (PostgreSQL, Redis, etc.)


### 7. POC Language & Stack Implementation
  - **Node.js** (ES Modules)
  - **Express** for HTTP routing
  - **SQLite (better-sqlite3)** for lightweight persistent storage
  - .env config for affiliate URL and API key

### 8. POC Features Implemented

  - **Accept Traffic Source Requests**
    - **Route**: GET / ?keyword=shoes&src=google&creative=1234
      - Maps the incoming traffic source parameters
      - Generates a stable `our_param`
      - Stores the mapping in the database

  - **Redirect with `our_param`**
    - `https://example.com?our_param=abc123xyz`
    - Only `our_param` is included in the redirect URL
    - After mapping, user is redirected to the configured `AFFILIATE_URL`

  - **Provide an API for Retrieving Original Values**
    - **Route**: `GET /retrieve_original?our_param=abc123xyz`
    - **Response**: 
      ```json
      {
        "keyword": "shoes",
        "src": "google",
        "creative": "1234"
      }
      ```
    - **Fallback**: If our_param is omitted:
      - `GET /retrieve_original`
      - Returns the most recently created mapping:
      - ```json
        {
          "warning": "No our_param provided. Returning most recent mapping.",
          "keyword": "shoes",
          "src": "google",
          "creative": "1234"
        }
        ```
  - **Refresh `our_param` with Auth**
    - **Route**: `POST /refresh?keyword=shoes&src=google&creative=1234`
                  `Header: x-api-key: supersecretkey`
    - **Response**: 
      ```json
      {
        "new_param": "new123xyz",
        "version": 2,
        "previous_param": "abc123xyz"
      }
      ```
      - Creates a new `our_param` for the same combination
      - Increments the version number
      - Keeps a link to the previous mapping


### 9. Further Improvements for Production

  - **Security Hardening**
    - **Enforce HTTPS** via reverse proxy (e.g. NGINX, Cloudflare, AWS ELB)
    - **Rate limiting** on public endpoints to prevent abuse
    - **Audit logging** of all refresh actions and failed access attempts
    - **API key rotation** and encryption at rest for stored keys
    - **OAuth2/JWT** based authentication
      - Use JWT tokens for user-specific access control
      - Integrate OAuth2 (e.g. Auth0, Firebase, or internal provider) to secure admin APIs
      - Provides more granular and revocable access than static API keys
  - **Testing & QA**
    - **Automated testing** using `jest` + `supertest`
    - **CI pipelines** (`GitHub Actions`, `GitLab CI`) to:
      - Run tests
      - Lint code
      - Auto-deploy to staging
  - **Dockerization**
    - Containerize the app with `Docker` for easy deployment
      - Optionally use `docker-compose` to manage SQLite + service
      - Allow seamless dev/test/prod environment configuration
  - **More Scalable Storage**
    - Swap SQLite for a scalable DB like:
      - **PostgreSQ**L (with versioned schema)
      - **Redis** (for ultra-fast, low-latency mapping)
    - Add indexing on `src`, `keyword`, and `creative` for analytics
  - **Observability**
    - Integrate metrics/logging (e.g. via `Prometheus` or `Datadog`)
    - Track:
      - Top sources
      - Mapping frequency
      - Refresh frequency
      - Errors/timeouts
  - **Improved Versioning**
    - Expose refresh history via an optional `/history API`


### 10. Additional Features to Consider

  - **TTL / Expiry for mappings** : 	Auto-expire mappings after N days if unused
  - **Multi-region deployments**  : 	Run globally for latency reduction
  - **Dynamic affiliate URLs**    : 	Allow campaign-specific redirect domains
  - **Analytics dashboard**       : 	Show traffic breakdown by `src`, `creative`, etc.
  - **Bulk import/export**        : 	Upload traffic combos + get batch `our_param` values
  - **Admin UI**                  : 	Lightweight dashboard for reverse lookups + refreshes

### 11. HTTP Request Testing File

  To simplify testing, the requests.http file can be used with REST Client (VS Code)

