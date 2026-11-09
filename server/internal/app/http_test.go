package app

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testAPI(t *testing.T) (*API, string) {
	t.Helper()
	root := t.TempDir()
	path := filepath.Join(root, "site.db")
	store, e := OpenStore(path)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { store.Close() })
	api := NewAPI(store, Config{PublicURL: "http://127.0.0.1:5173", DatabasePath: path, UploadDir: filepath.Join(root, "uploads"), BackupDir: filepath.Join(root, "backups")})
	w := request(t, api, "POST", "/api/auth/admin/login", map[string]string{"username": defaultAdminUsername, "password": defaultAdminPassword}, "")
	if w.Code != 200 {
		t.Fatalf("seed admin login: %d %s", w.Code, w.Body.String())
	}
	token := sessionCookie(w)
	if token == "" {
		t.Fatal("missing admin session")
	}
	return api, token
}
func request(t *testing.T, api *API, method, path string, body any, token string) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		raw, e := json.Marshal(body)
		if e != nil {
			t.Fatal(e)
		}
		reader = bytes.NewReader(raw)
	}
	r := httptest.NewRequest(method, "http://127.0.0.1:8080"+path, reader)
	if body != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		r.AddCookie(&http.Cookie{Name: "qianqiu_session", Value: token})
	}
	r.Header.Set("Origin", "http://127.0.0.1:5173")
	w := httptest.NewRecorder()
	api.Handler().ServeHTTP(w, r)
	return w
}

func TestPublishedContentAndAdminDraft(t *testing.T) {
	api, token := testAPI(t)
	w := request(t, api, "GET", "/api/content", nil, "")
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var public struct {
		Articles []Article `json:"articles"`
	}
	if e := json.Unmarshal(w.Body.Bytes(), &public); e != nil {
		t.Fatal(e)
	}
	if len(public.Articles) != 2 {
		t.Fatalf("want 2 seed articles, got %d", len(public.Articles))
	}
	article := Article{Slug: "draft-example", Title: "草稿", Markdown: "## Hello", Category: "notes", Status: "draft"}
	w = request(t, api, "PUT", "/api/admin/articles", article, "")
	if w.Code != 401 {
		t.Fatalf("anonymous save: %d", w.Code)
	}
	w = request(t, api, "PUT", "/api/admin/articles", article, token)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = request(t, api, "GET", "/api/content", nil, "")
	_ = json.Unmarshal(w.Body.Bytes(), &public)
	if len(public.Articles) != 2 {
		t.Fatalf("draft leaked into public feed: %d", len(public.Articles))
	}
	w = request(t, api, "GET", "/api/admin/content", nil, token)
	var admin struct {
		Articles []Article `json:"articles"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &admin)
	if len(admin.Articles) != 3 {
		t.Fatalf("draft missing from admin: %d", len(admin.Articles))
	}
}

func TestCommentRequiresSessionAndSameOrigin(t *testing.T) {
	api, token := testAPI(t)
	body := map[string]string{"articleSlug": "why-a-personal-site", "body": "写得很好"}
	w := request(t, api, "POST", "/api/comments", body, "")
	if w.Code != 401 {
		t.Fatalf("anonymous comment: %d", w.Code)
	}
	w = request(t, api, "POST", "/api/comments", body, token)
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = request(t, api, "GET", "/api/comments?article=why-a-personal-site", nil, "")
	var comments []Comment
	_ = json.Unmarshal(w.Body.Bytes(), &comments)
	if len(comments) != 1 || comments[0].Body != "写得很好" {
		t.Fatal(w.Body.String())
	}
	r := httptest.NewRequest("POST", "http://127.0.0.1:8080/api/comments", strings.NewReader(`{"articleSlug":"why-a-personal-site","body":"spam"}`))
	r.Header.Set("Origin", "https://evil.example")
	r.AddCookie(&http.Cookie{Name: "qianqiu_session", Value: token})
	w = httptest.NewRecorder()
	api.Handler().ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatalf("cross origin request: %d", w.Code)
	}
	r = httptest.NewRequest("POST", "http://127.0.0.1:8080/api/comments", strings.NewReader(`{"articleSlug":"why-a-personal-site","body":"local port"}`))
	r.Header.Set("Origin", "http://localhost:5175")
	r.AddCookie(&http.Cookie{Name: "qianqiu_session", Value: token})
	w = httptest.NewRecorder()
	api.Handler().ServeHTTP(w, r)
	if w.Code != 201 {
		t.Fatalf("loopback origin on another port: %d %s", w.Code, w.Body.String())
	}
}

func TestMarkdownImportParsesFrontMatter(t *testing.T) {
	article := parseMarkdownImport("---\ntitle: 新文章\nslug: new-post\ncategory: notes\ntags: [go, react]\n---\n# 新文章\n\n第一段。", "example.md")
	if article.Title != "新文章" || article.Slug != "new-post" || article.Status != "draft" || len(article.Tags) != 2 || !strings.Contains(article.Markdown, "第一段") {
		t.Fatalf("parsed incorrectly: %#v", article)
	}
}

func sessionCookie(w *httptest.ResponseRecorder) string {
	for _, cookie := range w.Result().Cookies() {
		if cookie.Name == "qianqiu_session" {
			return cookie.Value
		}
	}
	return ""
}

func TestAdminPasswordLoginAndUpdate(t *testing.T) {
	api, _ := testAPI(t)
	w := request(t, api, "POST", "/api/auth/admin/login", map[string]string{"username": "admin", "password": "wrong-pass"}, "")
	if w.Code != 401 {
		t.Fatalf("wrong password: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "GET", "/api/admin/content", nil, "")
	if w.Code != 401 {
		t.Fatalf("anonymous admin: %d", w.Code)
	}
	w = request(t, api, "POST", "/api/auth/admin/login", map[string]string{"username": "admin", "password": defaultAdminPassword}, "")
	if w.Code != 200 {
		t.Fatalf("default login: %d %s", w.Code, w.Body.String())
	}
	token := sessionCookie(w)
	if token == "" {
		t.Fatal("missing session cookie")
	}
	w = request(t, api, "GET", "/api/admin/content", nil, token)
	if w.Code != 200 {
		t.Fatalf("password session: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "PUT", "/api/admin/account", map[string]string{"username": "owner", "currentPassword": "wrong", "newPassword": "newpass12"}, token)
	if w.Code != 401 {
		t.Fatalf("wrong current password: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "PUT", "/api/admin/account", map[string]string{"username": "owner", "currentPassword": defaultAdminPassword, "newPassword": "newpass12"}, token)
	if w.Code != 200 {
		t.Fatalf("update account: %d %s", w.Code, w.Body.String())
	}
	refreshed := sessionCookie(w)
	if refreshed == "" {
		t.Fatal("password change should issue a new session")
	}
	if w := request(t, api, "GET", "/api/admin/content", nil, token); w.Code != 401 {
		t.Fatalf("old session after password change: %d", w.Code)
	}
	if w := request(t, api, "POST", "/api/auth/admin/login", map[string]string{"username": "admin", "password": defaultAdminPassword}, ""); w.Code != 401 {
		t.Fatalf("old credentials still work: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "POST", "/api/auth/admin/login", map[string]string{"username": "owner", "password": "newpass12"}, "")
	if w.Code != 200 {
		t.Fatalf("new credentials: %d %s", w.Code, w.Body.String())
	}
	githubUser, err := api.Store.UpsertUser(User{GitHubID: 887, Login: "yyy887", Name: "Owner", Role: "admin"})
	if err != nil {
		t.Fatal(err)
	}
	githubToken := "github-admin-session"
	if err := api.Store.CreateSession(tokenHash(githubToken), githubUser.ID, time.Now().Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if w := request(t, api, "GET", "/api/admin/content", nil, githubToken); w.Code != 403 {
		t.Fatalf("github user must not use admin API: %d %s", w.Code, w.Body.String())
	}
	if w := request(t, api, "PUT", "/api/admin/account", map[string]string{"username": "hacked", "currentPassword": "newpass12"}, githubToken); w.Code != 403 {
		t.Fatalf("github user must not change password account: %d %s", w.Code, w.Body.String())
	}
}

func TestUploadAndBackupRequireAdmin(t *testing.T) {
	api, token := testAPI(t)
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "cover.png")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write([]byte("\x89PNG\r\n\x1a\nsmall-image"))
	_ = writer.Close()
	makeUpload := func(session string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("POST", "http://127.0.0.1:8080/api/admin/uploads", bytes.NewReader(body.Bytes()))
		r.Header.Set("Content-Type", writer.FormDataContentType())
		r.Header.Set("Origin", "http://127.0.0.1:5173")
		if session != "" {
			r.AddCookie(&http.Cookie{Name: "qianqiu_session", Value: session})
		}
		w := httptest.NewRecorder()
		api.Handler().ServeHTTP(w, r)
		return w
	}
	if w := makeUpload(""); w.Code != 401 {
		t.Fatalf("anonymous upload: %d", w.Code)
	}
	w := makeUpload(token)
	if w.Code != 201 {
		t.Fatalf("upload: %d %s", w.Code, w.Body.String())
	}
	var asset Upload
	if err := json.Unmarshal(w.Body.Bytes(), &asset); err != nil {
		t.Fatal(err)
	}
	if asset.URL == "" || asset.Name != "cover.png" || asset.StoredName == "" || asset.Storage != "local" {
		t.Fatalf("local upload fields: %+v", asset)
	}
	w = makeUpload(token)
	var existing Upload
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &existing) != nil || !existing.Duplicate || existing.ID != asset.ID {
		t.Fatalf("duplicate upload should reuse the existing asset: %d %s", w.Code, w.Body.String())
	}
	items, err := api.Store.Uploads()
	if err != nil || len(items) != 1 {
		t.Fatalf("duplicate created another library entry: %v, %d", err, len(items))
	}
	w = request(t, api, "GET", asset.URL, nil, "")
	if w.Code != 200 || !bytes.HasPrefix(w.Body.Bytes(), []byte("\x89PNG")) {
		t.Fatalf("public asset: %d", w.Code)
	}

	if w := request(t, api, "POST", "/api/admin/backups", nil, ""); w.Code != 401 {
		t.Fatalf("anonymous backup: %d", w.Code)
	}
	w = request(t, api, "POST", "/api/admin/backups", nil, token)
	if w.Code != 201 {
		t.Fatalf("create backup: %d %s", w.Code, w.Body.String())
	}
	var backup Backup
	if err := json.Unmarshal(w.Body.Bytes(), &backup); err != nil {
		t.Fatal(err)
	}
	w = request(t, api, "GET", "/api/admin/backups/"+backup.Name, nil, token)
	if w.Code != 200 || !bytes.HasPrefix(w.Body.Bytes(), []byte("SQLite format 3")) {
		t.Fatalf("download backup: %d", w.Code)
	}
	if w := request(t, api, "GET", "/api/admin/backups/"+backup.Name, nil, ""); w.Code != 401 {
		t.Fatalf("anonymous download: %d", w.Code)
	}
}

func TestUploadUsesDetectedFormatWhenExtensionDiffers(t *testing.T) {
	api, token := testAPI(t)
	upload := func(name string, data []byte) (int, Upload) {
		t.Helper()
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		part, err := writer.CreateFormFile("file", name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = part.Write(data)
		_ = writer.Close()
		r := httptest.NewRequest("POST", "http://127.0.0.1:8080/api/admin/uploads", &body)
		r.Header.Set("Content-Type", writer.FormDataContentType())
		r.Header.Set("Origin", "http://127.0.0.1:5173")
		r.AddCookie(&http.Cookie{Name: "qianqiu_session", Value: token})
		w := httptest.NewRecorder()
		api.Handler().ServeHTTP(w, r)
		var asset Upload
		if err := json.Unmarshal(w.Body.Bytes(), &asset); err != nil {
			t.Fatal(err, w.Body.String())
		}
		return w.Code, asset
	}

	png := []byte("\x89PNG\r\n\x1a\nimage-data")
	status, image := upload("renamed.jpg", png)
	if status != 201 || image.MIME != "image/png" || !strings.HasSuffix(image.URL, ".jpg") {
		t.Fatalf("renamed PNG should keep original suffix: %d %#v", status, image)
	}
	w := request(t, api, "GET", image.URL, nil, "")
	if w.Code != 200 || w.Header().Get("Content-Type") != "image/png" || !bytes.Equal(w.Body.Bytes(), png) {
		t.Fatalf("renamed image response: %d %s", w.Code, w.Header().Get("Content-Type"))
	}
	status, duplicate := upload("correct.png", png)
	if status != 200 || !duplicate.Duplicate || duplicate.ID != image.ID {
		t.Fatalf("same image under another extension should be reused: %d %#v", status, duplicate)
	}

	status, unknown := upload("strange.jpg", []byte{0, 1, 2, 3, 4})
	if status != 201 || unknown.MIME != "application/octet-stream" || !strings.HasSuffix(unknown.URL, ".jpg") {
		t.Fatalf("unknown content should keep original suffix as an attachment: %d %#v", status, unknown)
	}
	w = request(t, api, "GET", unknown.URL, nil, "")
	if w.Code != 200 || w.Header().Get("Content-Type") != "application/octet-stream" || !strings.Contains(w.Header().Get("Content-Disposition"), "strange.jpg") {
		t.Fatalf("unknown content must not be served as an image: %d %#v", w.Code, w.Header())
	}

	html := []byte("<!doctype html><html><body>hi</body></html>")
	status, page := upload("index.html", html)
	if status != 201 || page.Name != "index.html" || page.MIME != "text/html" || !strings.HasSuffix(page.URL, ".html") {
		t.Fatalf("HTML should keep .html: %d %#v", status, page)
	}
	w = request(t, api, "GET", page.URL, nil, "")
	if w.Code != 200 || w.Header().Get("Content-Type") != "text/html" || !strings.Contains(w.Header().Get("Content-Disposition"), "index.html") {
		t.Fatalf("HTML must download as an attachment: %d %#v", w.Code, w.Header())
	}

	status, svg := upload("vector.png", []byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>`))
	if status != 201 || svg.MIME != "image/svg+xml" || !strings.HasSuffix(svg.URL, ".png") {
		t.Fatalf("SVG should keep original suffix: %d %#v", status, svg)
	}
	w = request(t, api, "GET", svg.URL, nil, "")
	if w.Code != 200 || w.Header().Get("Content-Type") != "image/svg+xml" || !strings.Contains(w.Header().Get("Content-Security-Policy"), "sandbox") {
		t.Fatalf("SVG must be displayed without script access: %d %#v", w.Code, w.Header())
	}
}

func TestLinkPreviewParsesOpenGraphAndRejectsBadURLs(t *testing.T) {
	api, _ := testAPI(t)
	if w := request(t, api, "GET", "/api/link-preview?url=https://", nil, ""); w.Code != 400 {
		t.Fatalf("incomplete url: %d", w.Code)
	}
	if w := request(t, api, "GET", "/api/link-preview?url=http://127.0.0.1/", nil, ""); w.Code != 400 {
		t.Fatalf("localhost url: %d", w.Code)
	}
	base, _ := url.Parse("https://example.com/page")
	got := parseLinkPreview(`<html><head><title>Ignored</title><meta property="og:title" content="示例标题"><meta property="og:description" content="一段简介"><meta property="og:site_name" content="示例站"><link rel="icon" href="/icon.png"></head></html>`, base, LinkPreview{URL: base.String(), Title: "example.com", Icon: "https://example.com/favicon.ico"})
	if got.Title != "示例标题" || got.Description != "一段简介" || got.Icon != "https://example.com/icon.png" || got.SiteName != "示例站" {
		t.Fatalf("open graph parse: %#v", got)
	}
}

func TestWebDAVConfigAndUpload(t *testing.T) {
	api, token := testAPI(t)
	if w := request(t, api, "GET", "/api/admin/webdav", nil, ""); w.Code != 401 {
		t.Fatalf("anonymous webdav config: %d", w.Code)
	}
	var puts []string
	dav := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || user != "davuser" || pass != "davpass" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		switch r.Method {
		case "PROPFIND":
			w.WriteHeader(http.StatusMultiStatus)
		case http.MethodPut:
			puts = append(puts, r.URL.Path)
			w.WriteHeader(http.StatusCreated)
		case http.MethodDelete:
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer dav.Close()
	w := request(t, api, "PUT", "/api/admin/webdav", map[string]any{
		"url": dav.URL + "/files", "username": "davuser", "password": "davpass",
		"publicBase": "https://cdn.example.com/qianqiu", "storageName": "示例盘", "target": "webdav",
	}, token)
	if w.Code != 200 {
		t.Fatalf("save webdav: %d %s", w.Code, w.Body.String())
	}
	if strings.Contains(w.Body.String(), "davpass") {
		t.Fatal("password must not be returned")
	}
	w = request(t, api, "POST", "/api/admin/webdav/test", nil, token)
	if w.Code != 200 {
		t.Fatalf("test webdav: %d %s", w.Code, w.Body.String())
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "cover.png")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write([]byte("\x89PNG\r\n\x1a\nwebdav-image"))
	_ = writer.Close()
	r := httptest.NewRequest("POST", "http://127.0.0.1:8080/api/admin/uploads", bytes.NewReader(body.Bytes()))
	r.Header.Set("Content-Type", writer.FormDataContentType())
	r.Header.Set("Origin", "http://127.0.0.1:5173")
	r.AddCookie(&http.Cookie{Name: "qianqiu_session", Value: token})
	uploaded := httptest.NewRecorder()
	api.Handler().ServeHTTP(uploaded, r)
	if uploaded.Code != 201 {
		t.Fatalf("webdav upload: %d %s", uploaded.Code, uploaded.Body.String())
	}
	var asset Upload
	if err := json.Unmarshal(uploaded.Body.Bytes(), &asset); err != nil {
		t.Fatal(err)
	}
	if asset.Name != "cover.png" || asset.StoredName == "" || asset.StoredName == asset.Name {
		t.Fatalf("local name and stored name should be separate: %+v", asset)
	}
	if asset.Storage != "webdav" || asset.StorageName != "示例盘" {
		t.Fatalf("storage: %+v", asset)
	}
	if !strings.HasPrefix(asset.URL, "https://cdn.example.com/qianqiu/") {
		t.Fatalf("public link: %s", asset.URL)
	}
	if len(puts) != 1 || !strings.HasSuffix(puts[0], "/"+asset.StoredName) {
		t.Fatalf("webdav put paths: %v want %s", puts, asset.StoredName)
	}
	w = request(t, api, "GET", "/api/uploads/"+asset.StoredName, nil, "")
	if w.Code != http.StatusFound || w.Header().Get("Location") != asset.URL {
		t.Fatalf("proxy should redirect to public link: %d %s", w.Code, w.Header().Get("Location"))
	}
}

func TestGitHubAuthCanBeConfiguredInAdmin(t *testing.T) {
	api, token := testAPI(t)
	if w := request(t, api, "GET", "/api/admin/github", nil, ""); w.Code != 401 {
		t.Fatalf("anonymous github config: %d", w.Code)
	}
	w := request(t, api, "GET", "/api/auth/me", nil, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"oauthEnabled":false`) {
		t.Fatalf("oauth should start disabled: %d %s", w.Code, w.Body.String())
	}
	if w := request(t, api, "GET", "/api/auth/github/start", nil, ""); w.Code != 503 {
		t.Fatalf("unconfigured oauth start: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "PUT", "/api/admin/github", map[string]string{"clientId": "short"}, token)
	if w.Code != 400 {
		t.Fatalf("short client id: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "PUT", "/api/admin/github", map[string]string{"clientId": "Ov23liExample1", "clientSecret": "github-secret-value"}, token)
	if w.Code != 200 {
		t.Fatalf("save github auth: %d %s", w.Code, w.Body.String())
	}
	var saved struct {
		ClientID    string `json:"clientId"`
		HasSecret   bool   `json:"hasSecret"`
		Configured  bool   `json:"configured"`
		CallbackURL string `json:"callbackUrl"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &saved); err != nil {
		t.Fatal(err)
	}
	if saved.ClientID != "Ov23liExample1" || !saved.HasSecret || !saved.Configured {
		t.Fatalf("saved view: %+v", saved)
	}
	if saved.CallbackURL != "http://127.0.0.1:5173/api/auth/github/callback" {
		t.Fatalf("callback: %s", saved.CallbackURL)
	}
	if strings.Contains(w.Body.String(), "github-secret-value") {
		t.Fatal("secret must not be returned")
	}
	w = request(t, api, "GET", "/api/auth/me", nil, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"oauthEnabled":true`) {
		t.Fatalf("oauth should be enabled: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "PUT", "/api/admin/github", map[string]string{"clientId": "Ov23liExample2"}, token)
	if w.Code != 200 {
		t.Fatalf("keep secret: %d %s", w.Code, w.Body.String())
	}
	stored, err := api.Store.GitHubAuth()
	if err != nil {
		t.Fatal(err)
	}
	if stored.ClientID != "Ov23liExample2" || stored.ClientSecret != "github-secret-value" {
		t.Fatalf("empty secret should keep previous: %+v", stored)
	}
	w = request(t, api, "GET", "/api/auth/github/start?returnTo=/blog/hello", nil, "")
	if w.Code != http.StatusFound || !strings.Contains(w.Header().Get("Location"), "client_id=Ov23liExample2") {
		t.Fatalf("oauth start: %d %s", w.Code, w.Header().Get("Location"))
	}
	w = request(t, api, "PUT", "/api/admin/github", map[string]any{"clientId": "", "clearSecret": true}, token)
	if w.Code != 200 {
		t.Fatalf("clear github auth: %d %s", w.Code, w.Body.String())
	}
	w = request(t, api, "GET", "/api/auth/me", nil, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"oauthEnabled":false`) {
		t.Fatalf("oauth should be disabled again: %d %s", w.Code, w.Body.String())
	}
}

func TestRepositoryPreviewRejectsInvalidPath(t *testing.T) {
	api, _ := testAPI(t)
	for _, path := range []string{
		"/api/github/repository?owner=..&repo=sample",
		"/api/github/repository?owner=valid&repo=bad%2Fname",
		"/api/github/repository?owner=&repo=sample",
	} {
		w := request(t, api, "GET", path, nil, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("%s: expected 400, got %d", path, w.Code)
		}
	}
}
