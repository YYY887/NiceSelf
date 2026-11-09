package app

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type Store struct{ db *sql.DB }

func OpenStore(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	for _, statement := range []string{
		`PRAGMA foreign_keys = ON`,
		`PRAGMA journal_mode = WAL`,
		`CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', markdown TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft', date TEXT NOT NULL DEFAULT '', reading_minutes INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '')`,
		`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', markdown TEXT NOT NULL DEFAULT '', cover_url TEXT NOT NULL DEFAULT '', site_url TEXT NOT NULL DEFAULT '', repo_url TEXT NOT NULL DEFAULT '', technologies_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft', sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, github_id INTEGER NOT NULL UNIQUE, login TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'reader')`,
		`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS uploads (id INTEGER PRIMARY KEY, name TEXT NOT NULL, stored_name TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS admin_accounts (id INTEGER PRIMARY KEY CHECK (id = 1), username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
		`CREATE INDEX IF NOT EXISTS comments_article_idx ON comments(article_id, status, created_at)`,
	} {
		if _, err := db.Exec(statement); err != nil {
			db.Close()
			return nil, err
		}
	}
	// Existing local databases predate the project gallery field.
	var galleryColumn int
	if err := db.QueryRow(`SELECT count(*) FROM pragma_table_info('projects') WHERE name='screenshots_json'`).Scan(&galleryColumn); err != nil {
		db.Close()
		return nil, err
	}
	if galleryColumn == 0 {
		if _, err := db.Exec(`ALTER TABLE projects ADD COLUMN screenshots_json TEXT NOT NULL DEFAULT '[]'`); err != nil {
			db.Close()
			return nil, err
		}
	}
	var logoColumn int
	if err := db.QueryRow(`SELECT count(*) FROM pragma_table_info('projects') WHERE name='logo_url'`).Scan(&logoColumn); err != nil {
		db.Close()
		return nil, err
	}
	if logoColumn == 0 {
		if _, err := db.Exec(`ALTER TABLE projects ADD COLUMN logo_url TEXT NOT NULL DEFAULT ''`); err != nil {
			db.Close()
			return nil, err
		}
	}
	for _, column := range []struct{ name, definition string }{
		{"site_label", "TEXT NOT NULL DEFAULT ''"},
		{"repo_label", "TEXT NOT NULL DEFAULT ''"},
		{"links_json", "TEXT NOT NULL DEFAULT '[]'"},
		{"videos_json", "TEXT NOT NULL DEFAULT '[]'"},
	} {
		var exists int
		if err := db.QueryRow(`SELECT count(*) FROM pragma_table_info('projects') WHERE name=?`, column.name).Scan(&exists); err != nil {
			db.Close()
			return nil, err
		}
		if exists == 0 {
			if _, err := db.Exec(`ALTER TABLE projects ADD COLUMN ` + column.name + ` ` + column.definition); err != nil {
				db.Close()
				return nil, err
			}
		}
	}
	var articleOrderColumn int
	if err := db.QueryRow(`SELECT count(*) FROM pragma_table_info('articles') WHERE name='sort_order'`).Scan(&articleOrderColumn); err != nil {
		db.Close()
		return nil, err
	}
	if articleOrderColumn == 0 {
		if _, err := db.Exec(`ALTER TABLE articles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`); err != nil {
			db.Close()
			return nil, err
		}
	}
	for _, column := range []struct{ name, definition string }{
		{"content_hash", "TEXT NOT NULL DEFAULT ''"},
		{"url", "TEXT NOT NULL DEFAULT ''"},
		{"storage", "TEXT NOT NULL DEFAULT 'local'"},
		{"storage_name", "TEXT NOT NULL DEFAULT ''"},
	} {
		var exists int
		if err := db.QueryRow(`SELECT count(*) FROM pragma_table_info('uploads') WHERE name=?`, column.name).Scan(&exists); err != nil {
			db.Close()
			return nil, err
		}
		if exists == 0 {
			if _, err := db.Exec(`ALTER TABLE uploads ADD COLUMN ` + column.name + ` ` + column.definition); err != nil {
				db.Close()
				return nil, err
			}
		}
	}
	s := &Store{db: db}
	if err := s.seed(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func now() string  { return time.Now().UTC().Format(time.RFC3339) }
func date() string { return time.Now().Format("2006-01-02") }
func stringsJSON(items []string) string {
	if items == nil {
		items = []string{}
	}
	b, _ := json.Marshal(items)
	return string(b)
}
func readStrings(raw string) []string {
	var items []string
	_ = json.Unmarshal([]byte(raw), &items)
	if items == nil {
		return []string{}
	}
	return items
}

func (s *Store) Articles(includeDrafts bool) ([]Article, error) {
	query := `SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles`
	if !includeDrafts {
		query += ` WHERE status='published'`
	}
	query += ` ORDER BY sort_order, date DESC, id DESC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Article{}
	for rows.Next() {
		var a Article
		var tags string
		if err := rows.Scan(&a.ID, &a.Slug, &a.Title, &a.Summary, &a.Markdown, &a.Category, &tags, &a.Status, &a.Date, &a.ReadingMinutes, &a.SortOrder, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		a.Tags = readStrings(tags)
		items = append(items, a)
	}
	return items, rows.Err()
}

func (s *Store) ArticleBySlug(slug string) (Article, error) {
	var a Article
	var tags string
	err := s.db.QueryRow(`SELECT id,slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at FROM articles WHERE slug=? AND status='published'`, slug).Scan(&a.ID, &a.Slug, &a.Title, &a.Summary, &a.Markdown, &a.Category, &tags, &a.Status, &a.Date, &a.ReadingMinutes, &a.SortOrder, &a.CreatedAt, &a.UpdatedAt)
	a.Tags = readStrings(tags)
	return a, err
}

func (s *Store) SaveArticle(a Article) (Article, error) {
	if a.Title == "" || a.Slug == "" {
		return a, errors.New("标题和 slug 不能为空")
	}
	if a.Status != "published" {
		a.Status = "draft"
	}
	if a.Date == "" {
		a.Date = date()
	}
	if a.ReadingMinutes < 1 {
		a.ReadingMinutes = max(1, len([]rune(a.Markdown))/500)
	}
	a.UpdatedAt = now()
	if a.ID == 0 {
		a.CreatedAt = a.UpdatedAt
		result, err := s.db.Exec(`INSERT INTO articles(slug,title,summary,markdown,category,tags_json,status,date,reading_minutes,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, a.Slug, a.Title, a.Summary, a.Markdown, a.Category, stringsJSON(a.Tags), a.Status, a.Date, a.ReadingMinutes, a.SortOrder, a.CreatedAt, a.UpdatedAt)
		if err != nil {
			return a, err
		}
		a.ID, _ = result.LastInsertId()
	} else {
		result, err := s.db.Exec(`UPDATE articles SET slug=?,title=?,summary=?,markdown=?,category=?,tags_json=?,status=?,date=?,reading_minutes=?,sort_order=?,updated_at=? WHERE id=?`, a.Slug, a.Title, a.Summary, a.Markdown, a.Category, stringsJSON(a.Tags), a.Status, a.Date, a.ReadingMinutes, a.SortOrder, a.UpdatedAt, a.ID)
		if err != nil {
			return a, err
		}
		n, _ := result.RowsAffected()
		if n == 0 {
			return a, sql.ErrNoRows
		}
	}
	return a, nil
}

func (s *Store) Categories() ([]Category, error) {
	rows, err := s.db.Query(`SELECT id,slug,name,description FROM categories ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.Description); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}
func (s *Store) SaveCategory(c Category) (Category, error) {
	if c.Slug == "" || c.Name == "" {
		return c, errors.New("名称和 slug 不能为空")
	}
	if c.ID == 0 {
		r, e := s.db.Exec(`INSERT INTO categories(slug,name,description) VALUES(?,?,?)`, c.Slug, c.Name, c.Description)
		if e != nil {
			return c, e
		}
		c.ID, _ = r.LastInsertId()
	} else {
		r, e := s.db.Exec(`UPDATE categories SET slug=?,name=?,description=? WHERE id=?`, c.Slug, c.Name, c.Description, c.ID)
		if e != nil {
			return c, e
		}
		n, _ := r.RowsAffected()
		if n == 0 {
			return c, sql.ErrNoRows
		}
	}
	return c, nil
}
func (s *Store) Tags() ([]Tag, error) {
	rows, e := s.db.Query(`SELECT id,slug,name FROM tags ORDER BY id`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	items := []Tag{}
	for rows.Next() {
		var t Tag
		if e := rows.Scan(&t.ID, &t.Slug, &t.Name); e != nil {
			return nil, e
		}
		items = append(items, t)
	}
	return items, rows.Err()
}
func (s *Store) SaveTag(t Tag) (Tag, error) {
	if t.Slug == "" || t.Name == "" {
		return t, errors.New("名称和 slug 不能为空")
	}
	if t.ID == 0 {
		r, e := s.db.Exec(`INSERT INTO tags(slug,name) VALUES(?,?)`, t.Slug, t.Name)
		if e != nil {
			return t, e
		}
		t.ID, _ = r.LastInsertId()
	} else {
		r, e := s.db.Exec(`UPDATE tags SET slug=?,name=? WHERE id=?`, t.Slug, t.Name, t.ID)
		if e != nil {
			return t, e
		}
		n, _ := r.RowsAffected()
		if n == 0 {
			return t, sql.ErrNoRows
		}
	}
	return t, nil
}

func (s *Store) Projects(includeDrafts bool) ([]Project, error) {
	q := `SELECT id,slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at FROM projects`
	if !includeDrafts {
		q += ` WHERE status='published'`
	}
	q += ` ORDER BY sort_order,id`
	rows, e := s.db.Query(q)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	items := []Project{}
	for rows.Next() {
		var p Project
		var tech, screenshots, links string
		if e := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Summary, &p.Markdown, &p.CoverURL, &p.LogoURL, &p.SiteURL, &p.SiteLabel, &p.RepoURL, &p.RepoLabel, &links, &tech, &screenshots, &p.Status, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt); e != nil {
			return nil, e
		}
		_ = json.Unmarshal([]byte(links), &p.Links)
		if p.Links == nil {
			p.Links = []ProjectLink{}
		}
		p.Technologies = readStrings(tech)
		p.Screenshots = readStrings(screenshots)
		if len(p.Screenshots) == 0 && p.CoverURL != "" {
			p.Screenshots = []string{p.CoverURL}
		}
		items = append(items, p)
	}
	return items, rows.Err()
}
func (s *Store) SaveProject(p Project) (Project, error) {
	if p.Slug == "" || p.Title == "" {
		return p, errors.New("标题和 slug 不能为空")
	}
	if p.Status != "published" {
		p.Status = "draft"
	}
	if p.Screenshots == nil {
		p.Screenshots = []string{}
	}
	if p.Links == nil {
		p.Links = []ProjectLink{}
	}
	linksJSON, _ := json.Marshal(p.Links)
	p.UpdatedAt = now()
	if p.ID == 0 {
		p.CreatedAt = p.UpdatedAt
		r, e := s.db.Exec(`INSERT INTO projects(slug,title,summary,markdown,cover_url,logo_url,site_url,site_label,repo_url,repo_label,links_json,technologies_json,screenshots_json,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, p.Slug, p.Title, p.Summary, p.Markdown, p.CoverURL, p.LogoURL, p.SiteURL, p.SiteLabel, p.RepoURL, p.RepoLabel, string(linksJSON), stringsJSON(p.Technologies), stringsJSON(p.Screenshots), p.Status, p.SortOrder, p.CreatedAt, p.UpdatedAt)
		if e != nil {
			return p, e
		}
		p.ID, _ = r.LastInsertId()
	} else {
		r, e := s.db.Exec(`UPDATE projects SET slug=?,title=?,summary=?,markdown=?,cover_url=?,logo_url=?,site_url=?,site_label=?,repo_url=?,repo_label=?,links_json=?,technologies_json=?,screenshots_json=?,status=?,sort_order=?,updated_at=? WHERE id=?`, p.Slug, p.Title, p.Summary, p.Markdown, p.CoverURL, p.LogoURL, p.SiteURL, p.SiteLabel, p.RepoURL, p.RepoLabel, string(linksJSON), stringsJSON(p.Technologies), stringsJSON(p.Screenshots), p.Status, p.SortOrder, p.UpdatedAt, p.ID)
		if e != nil {
			return p, e
		}
		n, _ := r.RowsAffected()
		if n == 0 {
			return p, sql.ErrNoRows
		}
	}
	return p, nil
}

func (s *Store) Settings() (Settings, error) {
	cfg := Settings{}
	rows, e := s.db.Query(`SELECT key,value FROM settings`)
	if e != nil {
		return cfg, e
	}
	defer rows.Close()
	for rows.Next() {
		var k, v string
		if e := rows.Scan(&k, &v); e != nil {
			return cfg, e
		}
		switch k {
		case "site_name":
			cfg.SiteName = v
		case "site_description":
			cfg.SiteDescription = v
		case "about_intro":
			cfg.AboutIntro = v
		case "github_username":
			cfg.GitHubUsername = v
		}
	}
	return cfg, rows.Err()
}
func (s *Store) SaveSettings(cfg Settings) error {
	values := map[string]string{"site_name": cfg.SiteName, "site_description": cfg.SiteDescription, "about_intro": cfg.AboutIntro, "github_username": cfg.GitHubUsername}
	tx, e := s.db.Begin()
	if e != nil {
		return e
	}
	defer tx.Rollback()
	for k, v := range values {
		if _, e = tx.Exec(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, k, v); e != nil {
			return e
		}
	}
	return tx.Commit()
}

func (s *Store) settingValue(key string) (string, error) {
	var value string
	err := s.db.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return value, err
}

func (s *Store) setSetting(key, value string) error {
	_, err := s.db.Exec(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, key, value)
	return err
}

func (s *Store) GitHubAuth() (GitHubAuth, error) {
	var cfg GitHubAuth
	var err error
	if cfg.ClientID, err = s.settingValue("github_client_id"); err != nil {
		return cfg, err
	}
	if cfg.ClientSecret, err = s.settingValue("github_client_secret"); err != nil {
		return cfg, err
	}
	cfg.Token, err = s.settingValue("github_token")
	return cfg, err
}

func (s *Store) SaveGitHubAuth(clientID, clientSecret, token string, updateSecret, updateToken bool) error {
	if err := s.setSetting("github_client_id", strings.TrimSpace(clientID)); err != nil {
		return err
	}
	if updateSecret {
		if err := s.setSetting("github_client_secret", strings.TrimSpace(clientSecret)); err != nil {
			return err
		}
	}
	if updateToken {
		if err := s.setSetting("github_token", strings.TrimSpace(token)); err != nil {
			return err
		}
	}
	return nil
}

type WebDAVConfig struct {
	URL         string
	Username    string
	Password    string
	PublicBase  string
	StorageName string
	Target      string
}

func (s *Store) WebDAVConfig() (WebDAVConfig, error) {
	var cfg WebDAVConfig
	var err error
	if cfg.URL, err = s.settingValue("webdav_url"); err != nil {
		return cfg, err
	}
	if cfg.Username, err = s.settingValue("webdav_username"); err != nil {
		return cfg, err
	}
	if cfg.Password, err = s.settingValue("webdav_password"); err != nil {
		return cfg, err
	}
	if cfg.PublicBase, err = s.settingValue("webdav_public_base"); err != nil {
		return cfg, err
	}
	if cfg.StorageName, err = s.settingValue("webdav_storage_name"); err != nil {
		return cfg, err
	}
	if cfg.Target, err = s.settingValue("upload_target"); err != nil {
		return cfg, err
	}
	if cfg.Target == "" {
		cfg.Target = "local"
	}
	if cfg.StorageName == "" {
		cfg.StorageName = "WebDAV"
	}
	return cfg, nil
}

func (s *Store) SaveWebDAVConfig(cfg WebDAVConfig, updatePassword bool) error {
	values := map[string]string{
		"webdav_url":          strings.TrimSpace(cfg.URL),
		"webdav_username":     strings.TrimSpace(cfg.Username),
		"webdav_public_base":  strings.TrimSpace(strings.TrimRight(cfg.PublicBase, "/")),
		"webdav_storage_name": strings.TrimSpace(cfg.StorageName),
		"upload_target":       strings.TrimSpace(cfg.Target),
	}
	if updatePassword {
		values["webdav_password"] = cfg.Password
	}
	for key, value := range values {
		if err := s.setSetting(key, value); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) Delete(kind string, id int64) error {
	tables := map[string]string{"articles": "articles", "categories": "categories", "tags": "tags", "projects": "projects", "comments": "comments"}
	table, ok := tables[kind]
	if !ok {
		return errors.New("未知资源")
	}
	r, e := s.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE id=?`, table), id)
	if e != nil {
		return e
	}
	n, _ := r.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) UpsertUser(u User) (User, error) {
	_, e := s.db.Exec(`INSERT INTO users(github_id,login,name,avatar_url,role) VALUES(?,?,?,?,?) ON CONFLICT(github_id) DO UPDATE SET login=excluded.login,name=excluded.name,avatar_url=excluded.avatar_url,role=excluded.role`, u.GitHubID, u.Login, u.Name, u.AvatarURL, u.Role)
	if e != nil {
		return u, e
	}
	e = s.db.QueryRow(`SELECT id FROM users WHERE github_id=?`, u.GitHubID).Scan(&u.ID)
	return u, e
}
func (s *Store) CreateSession(hash string, userID int64, expires time.Time) error {
	_, e := s.db.Exec(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)`, hash, userID, expires.UTC().Format(time.RFC3339))
	return e
}
func (s *Store) SessionUser(hash string) (User, error) {
	var u User
	err := s.db.QueryRow(`SELECT u.id,u.github_id,u.login,u.name,u.avatar_url,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`, hash, now()).Scan(&u.ID, &u.GitHubID, &u.Login, &u.Name, &u.AvatarURL, &u.Role)
	return u, err
}
func (s *Store) DeleteSession(hash string) {
	_, _ = s.db.Exec(`DELETE FROM sessions WHERE token_hash=?`, hash)
}
func (s *Store) DeleteSessionsForUser(userID int64) {
	_, _ = s.db.Exec(`DELETE FROM sessions WHERE user_id=?`, userID)
}

func (s *Store) Comments(slug string, includeHidden bool) ([]Comment, error) {
	q := `SELECT c.id,c.article_id,a.slug,u.id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id WHERE a.slug=?`
	if !includeHidden {
		q += ` AND c.status='published' AND a.status='published'`
	}
	q += ` ORDER BY c.created_at DESC,c.id DESC`
	rows, e := s.db.Query(q, slug)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	items := []Comment{}
	for rows.Next() {
		var c Comment
		if e := rows.Scan(&c.ID, &c.ArticleID, &c.ArticleSlug, &c.User.ID, &c.User.GitHubID, &c.User.Login, &c.User.Name, &c.User.AvatarURL, &c.User.Role, &c.Body, &c.Status, &c.CreatedAt); e != nil {
			return nil, e
		}
		items = append(items, c)
	}
	return items, rows.Err()
}
func (s *Store) AllComments() ([]Comment, error) {
	rows, e := s.db.Query(`SELECT c.id,c.article_id,a.slug,u.id,u.github_id,u.login,u.name,u.avatar_url,u.role,c.body,c.status,c.created_at FROM comments c JOIN articles a ON a.id=c.article_id JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC,c.id DESC`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	items := []Comment{}
	for rows.Next() {
		var c Comment
		if e := rows.Scan(&c.ID, &c.ArticleID, &c.ArticleSlug, &c.User.ID, &c.User.GitHubID, &c.User.Login, &c.User.Name, &c.User.AvatarURL, &c.User.Role, &c.Body, &c.Status, &c.CreatedAt); e != nil {
			return nil, e
		}
		items = append(items, c)
	}
	return items, rows.Err()
}
func (s *Store) AddComment(slug string, userID int64, body string) (Comment, error) {
	a, e := s.ArticleBySlug(slug)
	if e != nil {
		return Comment{}, e
	}
	r, e := s.db.Exec(`INSERT INTO comments(article_id,user_id,body,status,created_at) VALUES(?,?,?,'published',?)`, a.ID, userID, body, now())
	if e != nil {
		return Comment{}, e
	}
	id, _ := r.LastInsertId()
	return Comment{ID: id, ArticleID: a.ID, ArticleSlug: slug, Body: body, Status: "published", CreatedAt: now()}, nil
}
func (s *Store) SetCommentStatus(id int64, status string) error {
	if status != "published" && status != "hidden" {
		return errors.New("无效状态")
	}
	r, e := s.db.Exec(`UPDATE comments SET status=? WHERE id=?`, status, id)
	if e != nil {
		return e
	}
	n, _ := r.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) seed() error {
	var count int
	if e := s.db.QueryRow(`SELECT count(*) FROM settings`).Scan(&count); e != nil {
		return e
	}
	if count == 0 {
		if e := s.SaveSettings(Settings{SiteName: "QianQiu-MySelf", SiteDescription: "写下思考，留下作品。让那些值得记住的瞬间，在这里慢慢生长。", AboutIntro: "你好，这里是 QianQiu-MySelf。我用这个空间记录思考、分享实践，也保存一路走来的变化。", GitHubUsername: "yyy887"}); e != nil {
			return e
		}
	}
	if e := s.db.QueryRow(`SELECT count(*) FROM categories`).Scan(&count); e != nil {
		return e
	}
	if count == 0 {
		for _, c := range []Category{{Slug: "essays", Name: "随笔", Description: "记录日常里值得停下来想一想的瞬间。"}, {Slug: "notes", Name: "笔记", Description: "把新的发现整理成清晰、可回看的文字。"}, {Slug: "practice", Name: "实践", Description: "分享从一个想法到一次尝试的过程。"}} {
			if _, e := s.SaveCategory(c); e != nil {
				return e
			}
		}
	}
	if e := s.db.QueryRow(`SELECT count(*) FROM articles`).Scan(&count); e != nil {
		return e
	}
	if count == 0 {
		for _, a := range initialArticles() {
			if _, e := s.SaveArticle(a); e != nil {
				return e
			}
		}
	}
	if e := s.db.QueryRow(`SELECT count(*) FROM projects`).Scan(&count); e != nil {
		return e
	}
	if count == 0 {
		_, e := s.SaveProject(Project{Slug: "qianqiu-myself", Title: "QianQiu-MySelf", Summary: "一个用来写文章、整理项目和记录日常探索的个人空间。", Markdown: "从首屏的点阵涟漪，到文章阅读页的侧边目录，都围绕轻松阅读来设计。\n\n博客支持章节目录、代码高亮和分类浏览，让文字和实践放在同一个地方。", CoverURL: "/projects/qianqiu-myself/home.png", SiteURL: "/", Technologies: []string{"React", "TypeScript", "Tailwind CSS", "shadcn/ui"}, Status: "published"})
		if e != nil {
			return e
		}
	}
	return s.ensureAdminAccount()
}

func cleanSlug(s string) string { return strings.Trim(strings.ToLower(s), " -_") }
