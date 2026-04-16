package registry

import "testing"

func TestDestinationHostExtractsHostname(t *testing.T) {
	t.Parallel()

	host, err := DestinationHost("http://192.168.1.28:3068")
	if err != nil {
		t.Fatalf("destination host: %v", err)
	}

	if host != "192.168.1.28" {
		t.Fatalf("unexpected host: %s", host)
	}
}

func TestIsBlockedDestinationHostMatchesLoopbackAndRouterNode(t *testing.T) {
	t.Parallel()

	host, blocked, err := IsBlockedDestinationHost("localhost:3068", []string{"localhost", "192.168.1.28"})
	if err != nil {
		t.Fatalf("blocked host check: %v", err)
	}
	if host != "localhost" {
		t.Fatalf("unexpected host: %s", host)
	}
	if !blocked {
		t.Fatalf("expected localhost to be blocked")
	}

	_, blocked, err = IsBlockedDestinationHost("https://192.168.1.28:3068", []string{"localhost", "192.168.1.28"})
	if err != nil {
		t.Fatalf("blocked host check: %v", err)
	}
	if !blocked {
		t.Fatalf("expected router node ip to be blocked")
	}
}
