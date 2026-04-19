# RouteGate Router

The router is the wildcard subdomain ingress for RouteGate.

It provides:

- MongoDB-backed wildcard subdomain lookup
- reverse proxying to configured route destinations
- HTTPS redirect + HSTS on wildcard traffic
- automatic frontend fallback route for `FRONTEND_ROUTE_SUBDOMAIN`

## Run

```bash
cd router
go run ./cmd/routegate-router
```

Default listen port:

- `3068`

## Environment

Create `router/.env`:

```env
ROUTER_PORT=3068
WILDCARD_BASE_DOMAIN=echosphere.systems
MONGODB_URI=mongodb://wc_root:replace-with-a-strong-password@localhost:27019/?authSource=admin
MONGODB_DATABASE=routegate
FRONTEND_ROUTE_SUBDOMAIN=routegate
FRONTEND_ROUTE_DESTINATION=http://frontend:3000
```

Notes:

- `WILDCARD_BASE_DOMAIN` is required so subdomains can be extracted correctly.
- Router and backend should point to the same MongoDB/database so route writes are visible to routing reads.
- `FRONTEND_ROUTE_SUBDOMAIN` is always resolved directly to `FRONTEND_ROUTE_DESTINATION` by the router.

## Build and test

```bash
cd router
go test ./...
go build ./cmd/routegate-router
```
