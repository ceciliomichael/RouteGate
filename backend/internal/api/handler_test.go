package api

import (
	"testing"

	"routegate/internal/config"
	"routegate/internal/identity"
)

func TestIsReservedRouteSubdomain(t *testing.T) {
	t.Parallel()

	handler := &Handler{
		cfg: config.Config{FrontendRouteSubdomain: "routegate"},
	}

	if !handler.isReservedRouteSubdomain("routegate") {
		t.Fatalf("expected routegate to be reserved")
	}
	if handler.isReservedRouteSubdomain("docs") {
		t.Fatalf("expected docs not to be reserved")
	}
}

func TestValidateDestinationForUserBlocksRestrictedHostsForNonAdmin(t *testing.T) {
	t.Parallel()

	handler := &Handler{
		cfg: config.Config{
			RestrictedDestinationHosts: []string{"localhost", "127.0.0.1", "::1", "192.168.1.28"},
		},
	}

	err := handler.validateDestinationForUser(identity.User{Role: identity.RoleUser}, "http://localhost:3068")
	if err == nil {
		t.Fatalf("expected localhost destination to be blocked for non-admin users")
	}

	err = handler.validateDestinationForUser(identity.User{Role: identity.RoleUser}, "http://192.168.1.28:3068")
	if err == nil {
		t.Fatalf("expected router host destination to be blocked for non-admin users")
	}
}

func TestValidateDestinationForUserAllowsAdminAndExternalHosts(t *testing.T) {
	t.Parallel()

	handler := &Handler{
		cfg: config.Config{
			RestrictedDestinationHosts: []string{"localhost", "127.0.0.1", "::1", "192.168.1.28"},
		},
	}

	if err := handler.validateDestinationForUser(identity.User{Role: identity.RoleAdmin}, "http://localhost:3068"); err != nil {
		t.Fatalf("expected admin to be allowed to use localhost destination: %v", err)
	}

	if err := handler.validateDestinationForUser(identity.User{Role: identity.RoleUser}, "http://192.168.1.29:3068"); err != nil {
		t.Fatalf("expected external destination to be allowed: %v", err)
	}
}
