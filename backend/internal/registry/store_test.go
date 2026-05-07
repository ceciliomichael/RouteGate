package registry

import "testing"

func TestNormalizeDestinationRejectsBareHostPort(t *testing.T) {
	t.Parallel()

	_, err := NormalizeDestination("localhost:3068")
	if err == nil {
		t.Fatalf("expected bare host:port destination to be rejected")
	}
}

func TestNormalizeDestinationPreservesExplicitHTTPS(t *testing.T) {
	t.Parallel()

	normalized, err := NormalizeDestination("https://example.com:8443")
	if err != nil {
		t.Fatalf("normalize destination: %v", err)
	}

	if normalized != "https://example.com:8443" {
		t.Fatalf("unexpected normalized destination: %s", normalized)
	}
}

func TestStoreReservedSubdomainMatchesConfiguredValue(t *testing.T) {
	t.Parallel()

	store := &Store{reservedSubdomain: normalizeSubdomain("routegate")}

	if !store.isReservedSubdomain("routegate") {
		t.Fatalf("expected routegate to be reserved")
	}

	if store.isReservedSubdomain("docs") {
		t.Fatalf("expected docs not to be reserved")
	}
}

func TestRouteRecordToPublicWithOwnerNameUsesResolvedName(t *testing.T) {
	t.Parallel()

	record := routeRecord{
		OwnerName: "stale snapshot",
	}

	if got := record.toPublicWithOwnerName("Fresh Name").OwnerName; got != "Fresh Name" {
		t.Fatalf("expected resolved owner name to win, got %q", got)
	}

	if got := record.toPublicWithOwnerName("").OwnerName; got != "stale snapshot" {
		t.Fatalf("expected stored owner name fallback, got %q", got)
	}
}
