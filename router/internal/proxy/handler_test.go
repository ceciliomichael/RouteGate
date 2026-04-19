package proxy

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"routegate-router/internal/config"
	"routegate-router/internal/registry"
)

type fakeRouteStore struct {
	lookupRoute registry.Route
	lookupFound bool
	lookupErr   error
	routes      []registry.Route
}

func (f *fakeRouteStore) Lookup(subdomain string) (registry.Route, bool, error) {
	if f.lookupErr != nil {
		return registry.Route{}, false, f.lookupErr
	}
	return f.lookupRoute, f.lookupFound, nil
}

func (f *fakeRouteStore) List(ctx context.Context) ([]registry.Route, error) {
	if f.lookupErr != nil && len(f.routes) == 0 {
		return nil, f.lookupErr
	}
	return f.routes, nil
}

func TestServeHTTPUsesCachedRouteWhenRegistryLookupFails(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		_, _ = io.WriteString(writer, "cached route ok")
	}))
	t.Cleanup(upstream.Close)

	store := &fakeRouteStore{
		lookupErr: errors.New("registry unavailable"),
		routes: []registry.Route{{
			Subdomain:   "app",
			Destination: upstream.URL,
			Enabled:     true,
		}},
	}

	handler := NewHandler(config.Config{BaseDomain: "example.com"}, store, nil)
	if err := handler.RefreshCache(context.Background()); err != nil {
		t.Fatalf("refresh cache: %v", err)
	}

	request := httptest.NewRequest(http.MethodGet, "https://app.example.com/hello", nil)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	response := recorder.Result()
	t.Cleanup(func() { _ = response.Body.Close() })

	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}

	if response.StatusCode != http.StatusOK {
		t.Fatalf("unexpected status: %d body=%s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	if strings.TrimSpace(string(body)) != "cached route ok" {
		t.Fatalf("unexpected body: %s", strings.TrimSpace(string(body)))
	}
}
