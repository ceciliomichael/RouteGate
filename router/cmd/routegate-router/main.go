package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"routegate-router/internal/config"
	"routegate-router/internal/envfile"
	"routegate-router/internal/proxy"
	"routegate-router/internal/registry"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const routeCacheRefreshInterval = 30 * time.Second

func main() {
	loadEnv()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatalf("connect mongodb: %v", err)
	}
	defer func() {
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		_ = client.Disconnect(shutdownCtx)
	}()

	db := client.Database(cfg.MongoDatabase)
	routeStore := registry.NewStore(db)

	if err := routeStore.EnsureIndexes(ctx); err != nil {
		log.Fatalf("ensure route indexes: %v", err)
	}

	proxyHandler := proxy.NewHandler(cfg, routeStore, log.Default())
	if err := proxyHandler.RefreshCache(ctx); err != nil {
		log.Printf("initial route cache warm failed: %v", err)
	}
	proxyHandler.StartCacheRefresher(context.Background(), routeCacheRefreshInterval)

	httpServer := &http.Server{
		Addr:              cfg.ListenAddress(),
		Handler:           proxyHandler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	log.Printf("routegate router listening on %s", cfg.ListenAddress())
	log.Printf("base domain: %s", cfg.BaseDomain)
	log.Printf("mongodb: %s", sanitizeMongoURI(cfg.MongoURI, cfg.MongoDatabase))

	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server stopped: %v", err)
	}
}

func loadEnv() {
	cwd, err := os.Getwd()
	if err != nil {
		return
	}

	candidates := []string{
		filepath.Join(cwd, ".env"),
		filepath.Join(cwd, "..", ".env"),
	}

	_ = envfile.Load(candidates...)
}

func sanitizeMongoURI(rawURI string, database string) string {
	parsed, err := url.Parse(rawURI)
	if err != nil || parsed.Host == "" {
		return database
	}

	return parsed.Host + "/" + database
}
