package app

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

var (
	errInvalidAdminUsername = errors.New("用户名需为 2–32 位字母、数字、下划线或短横线")
	errInvalidAdminPassword = errors.New("密码需为 8–72 位")
	errNoAdminAccount       = errors.New("管理员账号不存在")
)

const (
	passwordAdminGitHubID  = -1
	defaultAdminUsername   = "admin"
	defaultAdminPassword   = "qianqiu123"
	minAdminPasswordLength = 8
	maxAdminPasswordLength = 72
)

func (s *Store) ensureAdminAccount() error {
	var count int
	if err := s.db.QueryRow(`SELECT count(*) FROM admin_accounts`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		username := strings.TrimSpace(os.Getenv("ADMIN_USERNAME"))
		if username == "" {
			username = defaultAdminUsername
		}
		if !validAdminUsername(username) {
			return errInvalidAdminUsername
		}
		password := os.Getenv("ADMIN_PASSWORD")
		if password == "" {
			password = defaultAdminPassword
		}
		if err := validateAdminPassword(password); err != nil {
			return err
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		stamp := now()
		if _, err = s.db.Exec(`INSERT INTO admin_accounts(id, username, password_hash, created_at, updated_at) VALUES(1, ?, ?, ?, ?)`, username, string(hash), stamp, stamp); err != nil {
			return err
		}
		if _, err = s.db.Exec(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE github_id=?)`, passwordAdminGitHubID); err != nil {
			return err
		}
	}
	_, err := s.db.Exec(`UPDATE users SET role='reader' WHERE github_id != ?`, passwordAdminGitHubID)
	return err
}

func (s *Store) adminCredentials() (username, passwordHash string, err error) {
	err = s.db.QueryRow(`SELECT username, password_hash FROM admin_accounts WHERE id=1`).Scan(&username, &passwordHash)
	return username, passwordHash, err
}

func (s *Store) setAdminCredentials(username, passwordHash string) error {
	result, err := s.db.Exec(`UPDATE admin_accounts SET username=?, password_hash=?, updated_at=? WHERE id=1`, username, passwordHash, now())
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errNoAdminAccount
	}
	return nil
}

func (a *API) adminLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decode(r, &body); err != nil {
		responseError(w, err)
		return
	}
	username := strings.TrimSpace(body.Username)
	storedUser, hash, err := a.Store.adminCredentials()
	if err != nil || username == "" || body.Password == "" || !strings.EqualFold(storedUser, username) || bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)) != nil {
		fail(w, http.StatusUnauthorized, "账号或密码错误")
		return
	}
	u, err := a.Store.UpsertUser(User{GitHubID: passwordAdminGitHubID, Login: storedUser, Name: storedUser, Role: "admin"})
	if err != nil {
		fail(w, http.StatusInternalServerError, "无法保存管理员会话")
		return
	}
	if err := a.createSessionCookie(w, u.ID); err != nil {
		fail(w, http.StatusInternalServerError, "无法创建会话")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": u})
}

func (a *API) updateAdminAccount(w http.ResponseWriter, r *http.Request, u User) {
	if u.GitHubID != passwordAdminGitHubID {
		fail(w, http.StatusForbidden, "请使用管理员账号密码登录后再修改")
		return
	}
	var body struct {
		Username        string `json:"username"`
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := decode(r, &body); err != nil {
		responseError(w, err)
		return
	}
	storedUser, hash, err := a.Store.adminCredentials()
	if err != nil {
		fail(w, http.StatusInternalServerError, "读取管理员账号失败")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.CurrentPassword)) != nil {
		fail(w, http.StatusUnauthorized, "当前密码不正确")
		return
	}
	nextUser := strings.TrimSpace(body.Username)
	if nextUser == "" {
		nextUser = storedUser
	}
	if !validAdminUsername(nextUser) {
		fail(w, http.StatusBadRequest, "用户名需为 2–32 位字母、数字、下划线或短横线")
		return
	}
	nextHash := hash
	if body.NewPassword != "" {
		if err := validateAdminPassword(body.NewPassword); err != nil {
			fail(w, http.StatusBadRequest, err.Error())
			return
		}
		generated, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			fail(w, http.StatusInternalServerError, "无法保存新密码")
			return
		}
		nextHash = string(generated)
	}
	if err := a.Store.setAdminCredentials(nextUser, nextHash); err != nil {
		responseError(w, err)
		return
	}
	u.Login = nextUser
	u.Name = nextUser
	if saved, err := a.Store.UpsertUser(u); err == nil {
		u = saved
	}
	if body.NewPassword != "" {
		a.Store.DeleteSessionsForUser(u.ID)
		if err := a.createSessionCookie(w, u.ID); err != nil {
			fail(w, http.StatusInternalServerError, "无法刷新会话")
			return
		}
	}
	writeJSON(w, http.StatusOK, u)
}

func (a *API) createSessionCookie(w http.ResponseWriter, userID int64) error {
	secret, err := randomToken()
	if err != nil {
		return err
	}
	expires := time.Now().Add(time.Duration(a.Config.SessionDays) * 24 * time.Hour)
	if err := a.Store.CreateSession(tokenHash(secret), userID, expires); err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{Name: "qianqiu_session", Value: secret, Path: "/", Expires: expires, HttpOnly: true, Secure: strings.HasPrefix(a.Config.PublicURL, "https://"), SameSite: http.SameSiteLaxMode})
	return nil
}

func validAdminUsername(value string) bool {
	if len(value) < 2 || len(value) > 32 {
		return false
	}
	for _, c := range value {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '_' || c == '-') {
			return false
		}
	}
	return true
}

func validateAdminPassword(password string) error {
	n := utf8.RuneCountInString(password)
	if n < minAdminPasswordLength || len(password) > maxAdminPasswordLength {
		return errInvalidAdminPassword
	}
	return nil
}
