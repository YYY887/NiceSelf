package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"qianqiu-myself/server/internal/app"
)

func main() {
	loadDotEnv(".env")
	port := env("PORT", "8080")
	path := env("DATABASE_PATH", filepath.Join("data", "site.db"))
	store, err := app.OpenStore(path)
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()
	days, _ := strconv.Atoi(env("SESSION_DAYS", "30"))
	addr := env("ADDR", "127.0.0.1:"+port)
	config := app.Config{Addr: addr, DatabasePath: path, UploadDir: env("UPLOAD_DIR", filepath.Join(filepath.Dir(path), "uploads")), BackupDir: env("BACKUP_DIR", filepath.Join(filepath.Dir(path), "backups")), PublicURL: env("PUBLIC_URL", "http://127.0.0.1:5173"), GitHubClientID: os.Getenv("GITHUB_CLIENT_ID"), GitHubClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"), GitHubToken: os.Getenv("GITHUB_TOKEN"), SessionDays: days, HTTPClientTimeout: 12 * time.Second}
	api := app.NewAPI(store, config)
	handler := api.Handler()
	if staticDir := os.Getenv("STATIC_DIR"); staticDir != "" {
		handler = serveFrontend(handler, staticDir)
	}
	server := &http.Server{Addr: config.Addr, Handler: app.Recover(handler), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("API listening on %s (db: %s)", config.Addr, path)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
func env(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}
func loadDotEnv(path string) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		if _, ok := os.LookupEnv(key); !ok {
			_ = os.Setenv(key, strings.Trim(strings.TrimSpace(parts[1]), `"'`))
		}
	}
}

func serveFrontend(api http.Handler, dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			api.ServeHTTP(w, r)
			return
		}
		path := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
		if path == "." {
			path = "index.html"
		}
		if info, err := os.Stat(filepath.Join(dir, path)); err == nil && !info.IsDir() {
			files.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(dir, "index.html"))
	})
}
