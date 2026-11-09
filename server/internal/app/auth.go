package app

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func safeReturnTo(value string) string {
	if value == "" || !strings.HasPrefix(value, "/") || strings.HasPrefix(value, "//") || strings.ContainsAny(value, "\r\n\\") {
		return "/"
	}
	return value
}
func (a *API) oauthStart(w http.ResponseWriter, r *http.Request) {
	clientID, clientSecret := a.resolvedOAuth()
	if clientID == "" || clientSecret == "" || a.Config.PublicURL == "" {
		fail(w, 503, "尚未配置 GitHub OAuth")
		return
	}
	state, e := randomToken()
	if e != nil {
		fail(w, 500, "无法开始登录")
		return
	}
	secure := strings.HasPrefix(a.Config.PublicURL, "https://")
	http.SetCookie(w, &http.Cookie{Name: "qianqiu_oauth_state", Value: state, Path: "/api/auth/github/callback", MaxAge: 600, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: "qianqiu_oauth_return", Value: url.QueryEscape(safeReturnTo(r.URL.Query().Get("returnTo"))), Path: "/api/auth/github/callback", MaxAge: 600, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
	q := url.Values{"client_id": {clientID}, "redirect_uri": {a.callbackURL()}, "state": {state}}
	http.Redirect(w, r, "https://github.com/login/oauth/authorize?"+q.Encode(), http.StatusFound)
}
func (a *API) oauthCallback(w http.ResponseWriter, r *http.Request) {
	cookie, e := r.Cookie("qianqiu_oauth_state")
	if e != nil || cookie.Value == "" || cookie.Value != r.URL.Query().Get("state") {
		fail(w, 400, "GitHub 登录状态无效，请重新登录")
		return
	}
	secure := strings.HasPrefix(a.Config.PublicURL, "https://")
	http.SetCookie(w, &http.Cookie{Name: "qianqiu_oauth_state", Path: "/api/auth/github/callback", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
	returnTo := "/"
	if c, e := r.Cookie("qianqiu_oauth_return"); e == nil {
		if value, e := url.QueryUnescape(c.Value); e == nil {
			returnTo = safeReturnTo(value)
		}
	}
	http.SetCookie(w, &http.Cookie{Name: "qianqiu_oauth_return", Path: "/api/auth/github/callback", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
	if r.URL.Query().Get("error") != "" {
		http.Redirect(w, r, returnTo+fragmentSeparator(returnTo)+"login=cancelled", http.StatusFound)
		return
	}
	code := r.URL.Query().Get("code")
	if code == "" {
		fail(w, 400, "GitHub 未返回授权码")
		return
	}
	clientID, clientSecret := a.resolvedOAuth()
	if clientID == "" || clientSecret == "" {
		fail(w, 503, "尚未配置 GitHub OAuth")
		return
	}
	payload := url.Values{"client_id": {clientID}, "client_secret": {clientSecret}, "code": {code}, "redirect_uri": {a.callbackURL()}}
	request, e := http.NewRequestWithContext(r.Context(), "POST", "https://github.com/login/oauth/access_token", strings.NewReader(payload.Encode()))
	if e != nil {
		fail(w, 500, "无法创建认证请求")
		return
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, e := a.Client.Do(request)
	if e != nil {
		fail(w, 502, "GitHub 登录暂时不可用")
		return
	}
	defer response.Body.Close()
	var tokenData struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if response.StatusCode != 200 || json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&tokenData) != nil || tokenData.AccessToken == "" {
		fail(w, 502, "GitHub 授权失败")
		return
	}
	userRequest, e := http.NewRequestWithContext(r.Context(), "GET", "https://api.github.com/user", nil)
	if e != nil {
		fail(w, 500, "无法创建用户请求")
		return
	}
	userRequest.Header.Set("Accept", "application/vnd.github+json")
	userRequest.Header.Set("Authorization", "Bearer "+tokenData.AccessToken)
	userRequest.Header.Set("User-Agent", "QianQiu-MySelf")
	userResponse, e := a.Client.Do(userRequest)
	if e != nil {
		fail(w, 502, "读取 GitHub 用户失败")
		return
	}
	defer userResponse.Body.Close()
	var profile struct {
		ID        int64  `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
	}
	if userResponse.StatusCode != 200 || json.NewDecoder(io.LimitReader(userResponse.Body, 1<<20)).Decode(&profile) != nil || profile.ID == 0 {
		fail(w, 502, "GitHub 用户资料无效")
		return
	}
	u, e := a.Store.UpsertUser(User{GitHubID: profile.ID, Login: profile.Login, Name: profile.Name, AvatarURL: profile.AvatarURL, Role: "reader"})
	if e != nil {
		fail(w, 500, "无法保存用户")
		return
	}
	if e := a.createSessionCookie(w, u.ID); e != nil {
		fail(w, 500, "无法创建会话")
		return
	}
	http.Redirect(w, r, returnTo, http.StatusFound)
}
func fragmentSeparator(path string) string {
	if strings.Contains(path, "?") {
		return "&"
	}
	return "?"
}
