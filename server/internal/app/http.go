package app

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type API struct {
	Store    *Store
	Config   Config
	GitHub   *GitHubClient
	Client   *http.Client
	uploadMu sync.Mutex
}

func NewAPI(store *Store, config Config) *API {
	if config.SessionDays <= 0 {
		config.SessionDays = 30
	}
	if config.HTTPClientTimeout <= 0 {
		config.HTTPClientTimeout = 12 * time.Second
	}
	client := &http.Client{Timeout: config.HTTPClientTimeout}
	return &API{Store: store, Config: config, Client: client, GitHub: NewGitHubClient(store, client, config.GitHubToken)}
}

func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusOK, map[string]any{"ok": true}) })
	mux.HandleFunc("GET /api/content", a.content)
	mux.HandleFunc("GET /api/articles/{slug}", a.article)
	mux.HandleFunc("GET /api/uploads/{name}", a.serveUpload)
	mux.HandleFunc("GET /api/github/profile", a.githubProfile)
	mux.HandleFunc("GET /api/github/repositories", a.githubRepositories)
	mux.HandleFunc("GET /api/github/repository", a.githubRepository)
	mux.HandleFunc("GET /api/github/contributions", a.githubContributions)
	mux.HandleFunc("GET /api/link-preview", a.linkPreview)
	mux.HandleFunc("GET /api/comments", a.comments)
	mux.HandleFunc("POST /api/comments", a.requireUser(a.addComment))
	mux.HandleFunc("GET /api/auth/me", a.me)
	mux.HandleFunc("POST /api/auth/admin/login", a.adminLogin)
	mux.HandleFunc("GET /api/auth/github/start", a.oauthStart)
	mux.HandleFunc("GET /api/auth/github/callback", a.oauthCallback)
	mux.HandleFunc("POST /api/auth/logout", a.requireUser(a.logout))
	mux.HandleFunc("GET /api/admin/content", a.requireAdmin(a.adminContent))
	mux.HandleFunc("POST /api/admin/articles/import", a.requireAdmin(a.importArticle))
	mux.HandleFunc("PUT /api/admin/articles/order", a.requireAdmin(func(w http.ResponseWriter, r *http.Request, u User) { a.reorder(w, r, "articles") }))
	mux.HandleFunc("PUT /api/admin/projects/order", a.requireAdmin(func(w http.ResponseWriter, r *http.Request, u User) { a.reorder(w, r, "projects") }))
	mux.HandleFunc("GET /api/admin/uploads", a.requireAdmin(a.listUploads))
	mux.HandleFunc("POST /api/admin/uploads", a.requireAdmin(a.uploadFile))
	mux.HandleFunc("DELETE /api/admin/uploads/{id}", a.requireAdmin(a.deleteUpload))
	mux.HandleFunc("GET /api/admin/backups", a.requireAdmin(a.listBackups))
	mux.HandleFunc("POST /api/admin/backups", a.requireAdmin(a.createBackup))
	mux.HandleFunc("GET /api/admin/backups/{name}", a.requireAdmin(a.downloadBackup))
	for _, resource := range []string{"articles", "projects", "categories", "tags"} {
		res := resource
		mux.HandleFunc("PUT /api/admin/"+res, a.requireAdmin(func(w http.ResponseWriter, r *http.Request, u User) { a.saveResource(w, r, res) }))
		mux.HandleFunc("DELETE /api/admin/"+res+"/{id}", a.requireAdmin(func(w http.ResponseWriter, r *http.Request, u User) { a.deleteResource(w, r, res) }))
	}
	mux.HandleFunc("PUT /api/admin/account", a.requireAdmin(a.updateAdminAccount))
	mux.HandleFunc("GET /api/admin/github", a.requireAdmin(a.githubAuthView))
	mux.HandleFunc("PUT /api/admin/github", a.requireAdmin(a.saveGitHubAuth))
	mux.HandleFunc("GET /api/admin/webdav", a.requireAdmin(a.webdavView))
	mux.HandleFunc("PUT /api/admin/webdav", a.requireAdmin(a.saveWebDAV))
	mux.HandleFunc("POST /api/admin/webdav/test", a.requireAdmin(a.testWebDAV))
	mux.HandleFunc("PUT /api/admin/settings", a.requireAdmin(func(w http.ResponseWriter, r *http.Request, u User) { a.saveResource(w, r, "settings") }))
	mux.HandleFunc("GET /api/admin/comments", a.requireAdmin(a.adminComments))
	mux.HandleFunc("PUT /api/admin/comments/{id}", a.requireAdmin(a.moderateComment))
	mux.HandleFunc("DELETE /api/admin/comments/{id}", a.requireAdmin(func(w http.ResponseWriter, r *http.Request, u User) { a.deleteResource(w, r, "comments") }))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.Method != "GET" && r.Method != "HEAD" && r.Method != "OPTIONS" && !sameOrigin(r, a.Config.PublicURL) {
			http.Error(w, "invalid origin", http.StatusForbidden)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func sameOrigin(r *http.Request, configured string) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, e := url.Parse(origin)
	if e != nil {
		return false
	}
	if configured != "" {
		expected, e := url.Parse(configured)
		if e == nil && u.Scheme == expected.Scheme && u.Host == expected.Host {
			return true
		}
		if e == nil && isLoopbackHost(u.Hostname()) && isLoopbackHost(expected.Hostname()) {
			return true
		}
	}
	return u.Host == r.Host && (u.Scheme == "http" || u.Scheme == "https")
}
func isLoopbackHost(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func fail(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
func decode(r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 2<<20)
	reader := json.NewDecoder(r.Body)
	reader.DisallowUnknownFields()
	if e := reader.Decode(dst); e != nil {
		return e
	}
	var rest any
	if e := reader.Decode(&rest); e != io.EOF {
		return errors.New("无效 JSON 内容")
	}
	return nil
}
func responseError(w http.ResponseWriter, e error) {
	if errors.Is(e, io.EOF) {
		fail(w, 400, "请求内容为空")
		return
	}
	if strings.Contains(e.Error(), "UNIQUE constraint failed") {
		fail(w, 409, "slug 已存在")
		return
	}
	if errors.Is(e, io.ErrUnexpectedEOF) {
		fail(w, 400, "请求内容不完整")
		return
	}
	fail(w, 400, e.Error())
}
func validSlug(s string) bool {
	if len(s) < 2 || len(s) > 100 {
		return false
	}
	for _, c := range s {
		if !(c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-') {
			return false
		}
	}
	return true
}
func validURL(s string) bool {
	if s == "" || strings.HasPrefix(s, "/") && !strings.HasPrefix(s, "//") {
		return true
	}
	u, e := url.Parse(s)
	return e == nil && u.Scheme == "https" && u.Host != ""
}
func normalizeProjectURL(value string) string {
	s := strings.TrimSpace(value)
	if s == "" || strings.HasPrefix(s, "/") || strings.Contains(s, "://") {
		return s
	}
	host := strings.SplitN(s, "/", 2)[0]
	if strings.Contains(host, ".") && !strings.ContainsAny(s, " \t\r\n") {
		return "https://" + s
	}
	return s
}
func (a *API) content(w http.ResponseWriter, r *http.Request) {
	articles, e := a.Store.Articles(false)
	if e != nil {
		fail(w, 500, "读取文章失败")
		return
	}
	categories, e := a.Store.Categories()
	if e != nil {
		fail(w, 500, "读取分类失败")
		return
	}
	tags, e := a.Store.Tags()
	if e != nil {
		fail(w, 500, "读取标签失败")
		return
	}
	projects, e := a.Store.Projects(false)
	if e != nil {
		fail(w, 500, "读取项目失败")
		return
	}
	settings, e := a.Store.Settings()
	if e != nil {
		fail(w, 500, "读取设置失败")
		return
	}
	writeJSON(w, 200, map[string]any{"articles": articles, "categories": categories, "tags": tags, "projects": projects, "settings": settings})
}
func (a *API) article(w http.ResponseWriter, r *http.Request) {
	item, e := a.Store.ArticleBySlug(r.PathValue("slug"))
	if e != nil {
		fail(w, 404, "文章不存在")
		return
	}
	writeJSON(w, 200, item)
}
func (a *API) adminContent(w http.ResponseWriter, r *http.Request, u User) {
	articles, e := a.Store.Articles(true)
	if e != nil {
		fail(w, 500, "读取文章失败")
		return
	}
	categories, _ := a.Store.Categories()
	tags, _ := a.Store.Tags()
	projects, _ := a.Store.Projects(true)
	settings, _ := a.Store.Settings()
	writeJSON(w, 200, map[string]any{"articles": articles, "categories": categories, "tags": tags, "projects": projects, "settings": settings})
}
func (a *API) reorder(w http.ResponseWriter, r *http.Request, resource string) {
	var body struct {
		IDs []int64 `json:"ids"`
	}
	if err := decode(r, &body); err != nil {
		responseError(w, err)
		return
	}
	if err := a.Store.Reorder(resource, body.IDs); err != nil {
		responseError(w, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
func (a *API) saveResource(w http.ResponseWriter, r *http.Request, res string) {
	switch res {
	case "articles":
		var v Article
		if e := decode(r, &v); e != nil {
			responseError(w, e)
			return
		}
		v.Slug = cleanSlug(v.Slug)
		if !validSlug(v.Slug) || len(v.Title) > 200 || len(v.Markdown) > 1_000_000 {
			fail(w, 400, "文章字段无效")
			return
		}
		saved, e := a.Store.SaveArticle(v)
		if e != nil {
			responseError(w, e)
			return
		}
		writeJSON(w, 200, saved)
	case "projects":
		var v Project
		if e := decode(r, &v); e != nil {
			responseError(w, e)
			return
		}
		v.Slug = cleanSlug(v.Slug)
		v.SiteURL = normalizeProjectURL(v.SiteURL)
		v.RepoURL = normalizeProjectURL(v.RepoURL)
		for i := range v.Links {
			v.Links[i].Label = strings.TrimSpace(v.Links[i].Label)
			v.Links[i].URL = normalizeProjectURL(v.Links[i].URL)
			if v.Links[i].Label == "" || v.Links[i].URL == "" || !validURL(v.Links[i].URL) {
				fail(w, 400, "项目附加链接无效")
				return
			}
		}
		if len(v.Screenshots) > 30 {
			fail(w, 400, "项目截图过多")
			return
		}
		for _, url := range v.Screenshots {
			if !validURL(url) {
				fail(w, 400, "项目截图地址无效")
				return
			}
		}
		if len(v.Videos) > 20 {
			fail(w, 400, "项目视频过多")
			return
		}
		for _, url := range v.Videos {
			if !validURL(url) {
				fail(w, 400, "项目视频地址无效")
				return
			}
		}
		if !validSlug(v.Slug) || len(v.Title) > 200 || !validURL(v.CoverURL) || !validURL(v.LogoURL) || !validURL(v.SiteURL) || !validURL(v.RepoURL) {
			fail(w, 400, "项目字段无效")
			return
		}
		saved, e := a.Store.SaveProject(v)
		if e != nil {
			responseError(w, e)
			return
		}
		writeJSON(w, 200, saved)
	case "categories":
		var v Category
		if e := decode(r, &v); e != nil {
			responseError(w, e)
			return
		}
		v.Slug = cleanSlug(v.Slug)
		if !validSlug(v.Slug) {
			fail(w, 400, "分类 slug 无效")
			return
		}
		saved, e := a.Store.SaveCategory(v)
		if e != nil {
			responseError(w, e)
			return
		}
		writeJSON(w, 200, saved)
	case "tags":
		var v Tag
		if e := decode(r, &v); e != nil {
			responseError(w, e)
			return
		}
		v.Slug = cleanSlug(v.Slug)
		if !validSlug(v.Slug) {
			fail(w, 400, "标签 slug 无效")
			return
		}
		saved, e := a.Store.SaveTag(v)
		if e != nil {
			responseError(w, e)
			return
		}
		writeJSON(w, 200, saved)
	case "settings":
		var v Settings
		if e := decode(r, &v); e != nil {
			responseError(w, e)
			return
		}
		if len(v.SiteName) > 100 || len(v.AboutIntro) > 1000 || !validGitHubLogin(v.GitHubUsername) {
			fail(w, 400, "站点配置无效")
			return
		}
		if e := a.Store.SaveSettings(v); e != nil {
			fail(w, 500, "保存设置失败")
			return
		}
		a.GitHub.Clear()
		writeJSON(w, 200, v)
	}
}
func (a *API) deleteResource(w http.ResponseWriter, r *http.Request, res string) {
	id, e := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if e != nil || id < 1 {
		fail(w, 400, "无效 ID")
		return
	}
	if e := a.Store.Delete(res, id); e != nil {
		if errors.Is(e, sql.ErrNoRows) {
			fail(w, 404, "记录不存在")
		} else {
			fail(w, 400, "删除失败")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, e := rand.Read(b); e != nil {
		return "", e
	}
	return hex.EncodeToString(b), nil
}
func tokenHash(token string) string {
	digest := sha256.Sum256([]byte(token))
	return hex.EncodeToString(digest[:])
}
func (a *API) currentUser(r *http.Request) (User, error) {
	cookie, e := r.Cookie("qianqiu_session")
	if e != nil {
		return User{}, e
	}
	return a.Store.SessionUser(tokenHash(cookie.Value))
}

type userHandler func(http.ResponseWriter, *http.Request, User)

func (a *API) requireUser(fn userHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, e := a.currentUser(r)
		if e != nil {
			fail(w, 401, "请先使用 GitHub 登录")
			return
		}
		fn(w, r, u)
	}
}
func (a *API) requireAdmin(fn userHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, err := a.currentUser(r)
		if err != nil {
			fail(w, 401, "请先登录管理员账号")
			return
		}
		if u.Role != "admin" || u.GitHubID != passwordAdminGitHubID {
			fail(w, 403, "仅管理员可以操作")
			return
		}
		fn(w, r, u)
	}
}
func (a *API) me(w http.ResponseWriter, r *http.Request) {
	clientID, clientSecret := a.resolvedOAuth()
	oauthEnabled := clientID != "" && clientSecret != ""
	u, e := a.currentUser(r)
	if e != nil {
		writeJSON(w, 200, map[string]any{"user": nil, "oauthEnabled": oauthEnabled})
		return
	}
	writeJSON(w, 200, map[string]any{"user": u, "oauthEnabled": oauthEnabled})
}

func (a *API) resolvedOAuth() (clientID, clientSecret string) {
	stored, _ := a.Store.GitHubAuth()
	clientID = strings.TrimSpace(stored.ClientID)
	clientSecret = strings.TrimSpace(stored.ClientSecret)
	if clientID == "" {
		clientID = strings.TrimSpace(a.Config.GitHubClientID)
	}
	if clientSecret == "" {
		clientSecret = strings.TrimSpace(a.Config.GitHubClientSecret)
	}
	return clientID, clientSecret
}

func (a *API) callbackURL() string {
	return strings.TrimRight(a.Config.PublicURL, "/") + "/api/auth/github/callback"
}

func (a *API) githubAuthView(w http.ResponseWriter, r *http.Request, u User) {
	stored, err := a.Store.GitHubAuth()
	if err != nil {
		fail(w, http.StatusInternalServerError, "读取 GitHub 配置失败")
		return
	}
	clientID, clientSecret := a.resolvedOAuth()
	view := GitHubAuthView{
		ClientID:    strings.TrimSpace(stored.ClientID),
		HasSecret:   strings.TrimSpace(stored.ClientSecret) != "" || strings.TrimSpace(a.Config.GitHubClientSecret) != "",
		HasToken:    a.GitHub.apiToken() != "",
		Configured:  clientID != "" && clientSecret != "",
		CallbackURL: a.callbackURL(),
	}
	if view.ClientID == "" {
		view.ClientID = strings.TrimSpace(a.Config.GitHubClientID)
	}
	writeJSON(w, http.StatusOK, view)
}

func (a *API) saveGitHubAuth(w http.ResponseWriter, r *http.Request, u User) {
	var body struct {
		ClientID     string `json:"clientId"`
		ClientSecret string `json:"clientSecret"`
		GitHubToken  string `json:"githubToken"`
		ClearSecret  bool   `json:"clearSecret"`
		ClearToken   bool   `json:"clearToken"`
	}
	if err := decode(r, &body); err != nil {
		responseError(w, err)
		return
	}
	clientID := strings.TrimSpace(body.ClientID)
	if clientID != "" && !validOAuthClientID(clientID) {
		fail(w, http.StatusBadRequest, "Client ID 无效")
		return
	}
	if len(body.ClientSecret) > 256 || len(body.GitHubToken) > 256 {
		fail(w, http.StatusBadRequest, "密钥过长")
		return
	}
	updateSecret := body.ClearSecret || strings.TrimSpace(body.ClientSecret) != ""
	updateToken := body.ClearToken || strings.TrimSpace(body.GitHubToken) != ""
	secret := body.ClientSecret
	token := body.GitHubToken
	if body.ClearSecret {
		secret = ""
	}
	if body.ClearToken {
		token = ""
	}
	if err := a.Store.SaveGitHubAuth(clientID, secret, token, updateSecret, updateToken); err != nil {
		fail(w, http.StatusInternalServerError, "保存 GitHub 配置失败")
		return
	}
	a.GitHub.Clear()
	a.githubAuthView(w, r, u)
}

func (a *API) webdavView(w http.ResponseWriter, r *http.Request, u User) {
	cfg, err := a.Store.WebDAVConfig()
	if err != nil {
		fail(w, http.StatusInternalServerError, "读取 WebDAV 配置失败")
		return
	}
	writeJSON(w, http.StatusOK, webdavViewFrom(cfg))
}

func webdavViewFrom(cfg WebDAVConfig) WebDAVView {
	target := cfg.Target
	if target != "webdav" {
		target = "local"
	}
	return WebDAVView{
		Enabled:     cfg.Ready(),
		URL:         cfg.URL,
		Username:    cfg.Username,
		HasPassword: cfg.Password != "",
		PublicBase:  cfg.PublicBase,
		StorageName: cfg.Label(),
		Target:      target,
	}
}

func (a *API) saveWebDAV(w http.ResponseWriter, r *http.Request, u User) {
	var body struct {
		URL           string `json:"url"`
		Username      string `json:"username"`
		Password      string `json:"password"`
		PublicBase    string `json:"publicBase"`
		StorageName   string `json:"storageName"`
		Target        string `json:"target"`
		ClearPassword bool   `json:"clearPassword"`
	}
	if err := decode(r, &body); err != nil {
		responseError(w, err)
		return
	}
	urlValue := strings.TrimSpace(body.URL)
	publicBase := strings.TrimSpace(body.PublicBase)
	username := strings.TrimSpace(body.Username)
	storageName := strings.TrimSpace(body.StorageName)
	target := strings.TrimSpace(body.Target)
	if target == "" {
		target = "local"
	}
	if target != "local" && target != "webdav" {
		fail(w, http.StatusBadRequest, "存储位置无效")
		return
	}
	if !validWebDAVEndpoint(urlValue) || !validWebDAVEndpoint(publicBase) {
		fail(w, http.StatusBadRequest, "WebDAV 地址需为 http(s) URL")
		return
	}
	if len(username) > 128 || len(body.Password) > 256 || !validStorageName(storageName) {
		fail(w, http.StatusBadRequest, "WebDAV 配置无效")
		return
	}
	existing, err := a.Store.WebDAVConfig()
	if err != nil {
		fail(w, http.StatusInternalServerError, "读取 WebDAV 配置失败")
		return
	}
	updatePassword := body.ClearPassword || strings.TrimSpace(body.Password) != ""
	password := strings.TrimSpace(body.Password)
	if body.ClearPassword {
		password = ""
	}
	next := WebDAVConfig{URL: urlValue, Username: username, Password: password, PublicBase: publicBase, StorageName: storageName, Target: target}
	if !updatePassword {
		next.Password = existing.Password
	}
	if next.Target == "webdav" && !next.Ready() {
		fail(w, http.StatusBadRequest, "启用 WebDAV 上传前请填完整地址、用户名和密码")
		return
	}
	if err := a.Store.SaveWebDAVConfig(next, updatePassword); err != nil {
		fail(w, http.StatusInternalServerError, "保存 WebDAV 配置失败")
		return
	}
	saved, err := a.Store.WebDAVConfig()
	if err != nil {
		fail(w, http.StatusInternalServerError, "读取 WebDAV 配置失败")
		return
	}
	writeJSON(w, http.StatusOK, webdavViewFrom(saved))
}

func (a *API) testWebDAV(w http.ResponseWriter, r *http.Request, u User) {
	cfg, err := a.Store.WebDAVConfig()
	if err != nil {
		fail(w, http.StatusInternalServerError, "读取 WebDAV 配置失败")
		return
	}
	if !cfg.Ready() {
		fail(w, http.StatusBadRequest, "请先保存完整的 WebDAV 配置")
		return
	}
	if err := a.webdavProbe(cfg); err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "message": "WebDAV 连接正常"})
}

func validOAuthClientID(value string) bool {
	if len(value) < 8 || len(value) > 128 {
		return false
	}
	for _, c := range value {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '.' || c == '_' || c == '-') {
			return false
		}
	}
	return true
}
func (a *API) logout(w http.ResponseWriter, r *http.Request, u User) {
	if c, err := r.Cookie("qianqiu_session"); err == nil {
		a.Store.DeleteSession(tokenHash(c.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: "qianqiu_session", Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: r.TLS != nil, SameSite: http.SameSiteLaxMode})
	writeJSON(w, 200, map[string]bool{"ok": true})
}
func (a *API) comments(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("article")
	if slug == "" {
		fail(w, 400, "缺少文章 slug")
		return
	}
	items, e := a.Store.Comments(slug, false)
	if e != nil {
		fail(w, 500, "读取评论失败")
		return
	}
	writeJSON(w, 200, items)
}
func (a *API) addComment(w http.ResponseWriter, r *http.Request, u User) {
	var body struct {
		ArticleSlug string `json:"articleSlug"`
		Body        string `json:"body"`
	}
	if e := decode(r, &body); e != nil {
		responseError(w, e)
		return
	}
	body.Body = strings.TrimSpace(body.Body)
	if len([]rune(body.Body)) < 2 || len([]rune(body.Body)) > 2000 {
		fail(w, 400, "评论需为 2–2000 字")
		return
	}
	item, e := a.Store.AddComment(body.ArticleSlug, u.ID, body.Body)
	if e != nil {
		fail(w, 404, "文章不存在")
		return
	}
	item.User = u
	writeJSON(w, 201, item)
}
func (a *API) adminComments(w http.ResponseWriter, r *http.Request, u User) {
	items, e := a.Store.AllComments()
	if e != nil {
		fail(w, 500, "读取评论失败")
		return
	}
	writeJSON(w, 200, items)
}
func (a *API) moderateComment(w http.ResponseWriter, r *http.Request, u User) {
	id, e := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if e != nil {
		fail(w, 400, "无效 ID")
		return
	}
	var v struct {
		Status string `json:"status"`
	}
	if e := decode(r, &v); e != nil {
		responseError(w, e)
		return
	}
	if e := a.Store.SetCommentStatus(id, v.Status); e != nil {
		responseError(w, e)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (a *API) importArticle(w http.ResponseWriter, r *http.Request, u User) {
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)
	if e := r.ParseMultipartForm(2 << 20); e != nil {
		fail(w, 400, "文件过大或上传格式无效")
		return
	}
	file, header, e := r.FormFile("file")
	if e != nil {
		fail(w, 400, "请选择 Markdown 文件")
		return
	}
	defer file.Close()
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".md") {
		fail(w, 400, "仅支持 .md 文件")
		return
	}
	raw, e := io.ReadAll(io.LimitReader(file, 1_000_001))
	if e != nil || len(raw) > 1_000_000 {
		fail(w, 400, "Markdown 文件超过 1MB")
		return
	}
	item := parseMarkdownImport(string(raw), header.Filename)
	if !validSlug(item.Slug) {
		item.Slug = "post-" + strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	saved, e := a.Store.SaveArticle(item)
	if e != nil {
		responseError(w, e)
		return
	}
	writeJSON(w, 201, saved)
}

func parseMarkdownImport(raw, filename string) Article {
	a := Article{Status: "draft", Date: date(), Markdown: strings.TrimSpace(raw)}
	a.Slug = slugify(strings.TrimSuffix(filename, ".md"))
	lines := strings.Split(strings.ReplaceAll(raw, "\r\n", "\n"), "\n")
	if len(lines) > 2 && strings.TrimSpace(lines[0]) == "---" {
		end := -1
		for i := 1; i < len(lines); i++ {
			if strings.TrimSpace(lines[i]) == "---" {
				end = i
				break
			}
			parts := strings.SplitN(lines[i], ":", 2)
			if len(parts) != 2 {
				continue
			}
			k, v := strings.TrimSpace(parts[0]), strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			switch k {
			case "title":
				a.Title = v
			case "slug":
				a.Slug = cleanSlug(v)
			case "description", "summary":
				a.Summary = v
			case "category":
				a.Category = v
			case "tags":
				a.Tags = strings.FieldsFunc(strings.Trim(v, "[]"), func(r rune) bool { return r == ',' })
				for j := range a.Tags {
					a.Tags[j] = strings.Trim(strings.TrimSpace(a.Tags[j]), `"'`)
				}
			}
		}
		if end > 0 {
			lines = lines[end+1:]
			a.Markdown = strings.TrimSpace(strings.Join(lines, "\n"))
		}
	}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if a.Title == "" && strings.HasPrefix(line, "# ") {
			a.Title = strings.TrimSpace(strings.TrimPrefix(line, "# "))
		}
		if a.Summary == "" && line != "" && !strings.HasPrefix(line, "#") && !strings.HasPrefix(line, "```") {
			a.Summary = line
		}
	}
	if a.Title == "" {
		a.Title = strings.TrimSuffix(filename, ".md")
	}
	if len([]rune(a.Summary)) > 160 {
		a.Summary = string([]rune(a.Summary)[:160])
	}
	return a
}
func slugify(value string) string {
	var b strings.Builder
	previousDash := false
	for _, c := range strings.ToLower(value) {
		if c >= 'a' && c <= 'z' || c >= '0' && c <= '9' {
			b.WriteRune(c)
			previousDash = false
		} else if !previousDash {
			b.WriteByte('-')
			previousDash = true
		}
	}
	return cleanSlug(b.String())
}
func validGitHubLogin(v string) bool {
	if len(v) < 1 || len(v) > 39 {
		return false
	}
	for _, c := range v {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-') {
			return false
		}
	}
	return true
}

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if x := recover(); x != nil {
				log.Printf("panic: %v", x)
				fail(w, 500, "服务器内部错误")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
