package proxy

import (
	"sync"

	"routegate-router/internal/registry"
)

type routeCache struct {
	mu     sync.RWMutex
	routes map[string]registry.Route
}

func newRouteCache() *routeCache {
	return &routeCache{
		routes: make(map[string]registry.Route),
	}
}

func (c *routeCache) replace(routes []registry.Route) {
	c.mu.Lock()
	defer c.mu.Unlock()

	next := make(map[string]registry.Route, len(routes))
	for _, route := range routes {
		normalizedSubdomain := normalizeHost(route.Subdomain)
		if normalizedSubdomain == "" {
			continue
		}
		next[normalizedSubdomain] = route
	}

	c.routes = next
}

func (c *routeCache) lookup(subdomain string) (registry.Route, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	route, found := c.routes[normalizeHost(subdomain)]
	return route, found
}
