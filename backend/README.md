# Wildcard Catcher Backend (Go)

Wildcard subdomain router with:

- MongoDB-backed routes
- Account-based login with session cookies
- Admin user management
- Owner-scoped route CRUD
- Reverse proxy routing for enabled wildcard records

## Run

```bash
cd backend
go run ./cmd/wildcard-catcher
```

Default port is `3067`.

## Environment

Create `backend/.env`:

```env
WILDCARD_BASE_DOMAIN=echosphere.systems
PORT=3067
MONGODB_URI=mongodb://wc_root:replace-with-a-strong-password@localhost:27019/?authSource=admin
MONGODB_DATABASE=wildcard_catcher
BOOTSTRAP_ADMIN_USERNAME=main-admin
BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-strong-password
BOOTSTRAP_ADMIN_NAME=Main Admin
SESSION_COOKIE_NAME=wc_session
SESSION_TTL_HOURS=168
SESSION_COOKIE_SECURE=false
TRUST_X_FORWARDED_HOST=true
```

Notes:

- `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` are required on first startup so the initial admin exists.
- If an admin user already exists in MongoDB, bootstrap credentials may be omitted.
- When using Docker Compose, MongoDB listens on `127.0.0.1:27019` on the host, the backend connects to `mongo:27019` inside the Docker network, and the root credentials come from `.env`.
- If you connect from the host machine, use `localhost:27019` with the same credentials.
- `SESSION_COOKIE_SECURE` should be `true` when the admin UI is served over HTTPS.
- `TRUST_X_FORWARDED_HOST` should be `true` only behind a trusted proxy or tunnel.

## Data Model

MongoDB collections:

- `users`
- `sessions`
- `routes`

`routes` are globally unique by subdomain. Admins can view all routes. Standard users can only manage routes they own.

## API

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

Admin only:

- `GET /api/users`
- `POST /api/users`

User creation generates a password server-side and returns it once in the response.

### Routes

Authenticated:

- `GET /api/routes`
- `POST /api/routes`
- `PUT /api/routes/{id}`
- `DELETE /api/routes/{id}`

## Proxy Behavior

Requests to `<subdomain>.<WILDCARD_BASE_DOMAIN>`:

- redirect to HTTPS when the incoming request is not secure
- look up an enabled route in MongoDB
- proxy traffic to the stored destination
- return `404` when no enabled subdomain exists

The proxy forwards `X-Forwarded-Host` and `X-Forwarded-Proto` to upstream apps.

## Build

```bash
cd backend
go test ./...
go build ./cmd/wildcard-catcher
```
