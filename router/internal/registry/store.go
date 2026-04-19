package registry

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Route struct {
	Subdomain             string
	Destination           string
	Enabled               bool
	InsecureSkipTLSVerify bool
}

type Store struct {
	collection *mongo.Collection
}

type routeRecord struct {
	Subdomain             string `bson:"subdomain"`
	NormalizedSubdomain   string `bson:"normalizedSubdomain"`
	Destination           string `bson:"destination"`
	Enabled               bool   `bson:"enabled"`
	InsecureSkipTLSVerify bool   `bson:"insecureSkipTLSVerify"`
}

func NewStore(db *mongo.Database) *Store {
	return &Store{
		collection: db.Collection("routes"),
	}
}

func (s *Store) EnsureIndexes(ctx context.Context) error {
	_, err := s.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "normalizedSubdomain", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "ownerId", Value: 1}, {Key: "updatedAt", Value: -1}},
		},
	})
	if err != nil {
		return fmt.Errorf("create route indexes: %w", err)
	}
	return nil
}

func (s *Store) Lookup(subdomain string) (Route, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var record routeRecord
	err := s.collection.FindOne(ctx, bson.M{
		"normalizedSubdomain": normalizeSubdomain(subdomain),
		"enabled":             true,
	}).Decode(&record)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return Route{}, false, nil
		}
		return Route{}, false, fmt.Errorf("lookup route: %w", err)
	}

	if _, err := NormalizeDestination(record.Destination); err != nil {
		return Route{}, false, fmt.Errorf("invalid destination for %q: %w", record.Subdomain, err)
	}

	return Route{
		Subdomain:             record.Subdomain,
		Destination:           record.Destination,
		Enabled:               record.Enabled,
		InsecureSkipTLSVerify: record.InsecureSkipTLSVerify,
	}, true, nil
}

func (s *Store) List(ctx context.Context) ([]Route, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	cursor, err := s.collection.Find(queryCtx, bson.M{"enabled": true}, options.Find().SetSort(bson.D{
		{Key: "normalizedSubdomain", Value: 1},
	}))
	if err != nil {
		return nil, fmt.Errorf("find enabled routes: %w", err)
	}
	defer cursor.Close(queryCtx)

	routes := make([]Route, 0)
	for cursor.Next(queryCtx) {
		var record routeRecord
		if err := cursor.Decode(&record); err != nil {
			return nil, fmt.Errorf("decode route: %w", err)
		}
		if _, err := NormalizeDestination(record.Destination); err != nil {
			return nil, fmt.Errorf("invalid destination for %q: %w", record.Subdomain, err)
		}
		routes = append(routes, Route{
			Subdomain:             record.Subdomain,
			Destination:           record.Destination,
			Enabled:               record.Enabled,
			InsecureSkipTLSVerify: record.InsecureSkipTLSVerify,
		})
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate routes: %w", err)
	}

	return routes, nil
}

func NormalizeDestination(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", fmt.Errorf("destination is required")
	}

	parsedInput := trimmed
	if !strings.Contains(parsedInput, "://") {
		parsedInput = "http://" + parsedInput
	}

	parsed, err := url.Parse(parsedInput)
	if err != nil {
		return "", err
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("scheme must be http or https")
	}
	if parsed.Host == "" {
		return "", fmt.Errorf("host is required")
	}

	return parsed.String(), nil
}

func normalizeSubdomain(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
