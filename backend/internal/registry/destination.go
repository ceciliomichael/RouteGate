package registry

import (
	"fmt"
	"net/url"
	"strings"
)

func DestinationHost(raw string) (string, error) {
	normalized, err := NormalizeDestination(raw)
	if err != nil {
		return "", err
	}

	parsed, err := url.Parse(normalized)
	if err != nil {
		return "", err
	}

	host := normalizeDestinationHost(parsed.Hostname())
	if host == "" {
		return "", fmt.Errorf("host is required")
	}

	return host, nil
}

func IsBlockedDestinationHost(raw string, blockedHosts []string) (string, bool, error) {
	host, err := DestinationHost(raw)
	if err != nil {
		return "", false, err
	}

	for _, blockedHost := range blockedHosts {
		if host == normalizeDestinationHost(blockedHost) {
			return host, true, nil
		}
	}

	return host, false, nil
}

func normalizeDestinationHost(value string) string {
	return strings.ToLower(strings.TrimSuffix(strings.TrimSpace(value), "."))
}
