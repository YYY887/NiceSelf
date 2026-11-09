package app

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

type cachedResponse struct {
	Body  json.RawMessage
	Until time.Time
}
type GitHubClient struct {
	store  *Store
	client *http.Client
	token  string
	mu     sync.Mutex
	cache  map[string]cachedResponse
}

func NewGitHubClient(store *Store, client *http.Client, token string) *GitHubClient {
	return &GitHubClient{store: store, client: client, token: token, cache: map[string]cachedResponse{}}
}
func (g *GitHubClient) apiToken() string {
	if cfg, err := g.store.GitHubAuth(); err == nil {
		if token := strings.TrimSpace(cfg.Token); token != "" {
			return token
		}
	}
	return strings.TrimSpace(g.token)
}
func (g *GitHubClient) Clear() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.cache = map[string]cachedResponse{}
}
func (g *GitHubClient) get(r *http.Request, url string, minutes int) (json.RawMessage, error) {
	g.mu.Lock()
	item, ok := g.cache[url]
	g.mu.Unlock()
	if ok && time.Now().Before(item.Until) {
		return item.Body, nil
	}
	request, e := http.NewRequestWithContext(r.Context(), "GET", url, nil)
	if e != nil {
		return nil, e
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("User-Agent", "QianQiu-MySelf")
	if token := g.apiToken(); token != "" && strings.HasPrefix(url, "https://api.github.com/") {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response, e := g.client.Do(request)
	if e != nil {
		return nil, e
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub 服务返回 %d", response.StatusCode)
	}
	var raw json.RawMessage
	if e = json.NewDecoder(response.Body).Decode(&raw); e != nil {
		return nil, e
	}
	g.mu.Lock()
	g.cache[url] = cachedResponse{Body: raw, Until: time.Now().Add(time.Duration(minutes) * time.Minute)}
	g.mu.Unlock()
	return raw, nil
}
func (g *GitHubClient) username() (string, error) {
	settings, e := g.store.Settings()
	return settings.GitHubUsername, e
}
func (a *API) githubProfile(w http.ResponseWriter, r *http.Request) {
	name, e := a.GitHub.username()
	if e != nil {
		fail(w, 500, "读取 GitHub 配置失败")
		return
	}
	body, e := a.GitHub.get(r, "https://api.github.com/users/"+url.PathEscape(name), 15)
	if e != nil {
		fail(w, 502, e.Error())
		return
	}
	writeRaw(w, body)
}
func (a *API) githubRepositories(w http.ResponseWriter, r *http.Request) {
	name, e := a.GitHub.username()
	if e != nil {
		fail(w, 500, "读取 GitHub 配置失败")
		return
	}
	body, e := a.GitHub.get(r, "https://api.github.com/users/"+url.PathEscape(name)+"/repos?sort=updated&per_page=4", 15)
	if e != nil {
		fail(w, 502, e.Error())
		return
	}
	writeRaw(w, body)
}

var githubPathPart = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,100}$`)

func (a *API) githubRepository(w http.ResponseWriter, r *http.Request) {
	owner, repo := r.URL.Query().Get("owner"), r.URL.Query().Get("repo")
	if !githubPathPart.MatchString(owner) || !githubPathPart.MatchString(repo) || owner == "." || owner == ".." || repo == "." || repo == ".." {
		fail(w, http.StatusBadRequest, "无效的 GitHub 仓库地址")
		return
	}
	body, err := a.GitHub.get(r, "https://api.github.com/repos/"+url.PathEscape(owner)+"/"+url.PathEscape(repo), 15)
	if err != nil {
		fail(w, http.StatusBadGateway, err.Error())
		return
	}
	writeRaw(w, body)
}
func (a *API) githubContributions(w http.ResponseWriter, r *http.Request) {
	name, e := a.GitHub.username()
	if e != nil {
		fail(w, 500, "读取 GitHub 配置失败")
		return
	}
	body, e := a.GitHub.get(r, "https://github-contributions-api.jogruber.de/v4/"+url.PathEscape(name)+"?y=last", 60)
	if e != nil {
		fail(w, 502, e.Error())
		return
	}
	writeRaw(w, body)
}
func writeRaw(w http.ResponseWriter, raw json.RawMessage) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write(raw)
}
