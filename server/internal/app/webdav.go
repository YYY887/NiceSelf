package app

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

var errWebDAVMissing = errors.New("webdav object missing")

func (c WebDAVConfig) Ready() bool {
	return strings.TrimSpace(c.URL) != "" && strings.TrimSpace(c.Username) != "" && strings.TrimSpace(c.Password) != ""
}

func (c WebDAVConfig) UsesRemote() bool {
	return c.Target == "webdav" && c.Ready()
}

func (c WebDAVConfig) Label() string {
	name := strings.TrimSpace(c.StorageName)
	if name == "" {
		return "WebDAV"
	}
	return name
}

func (c WebDAVConfig) objectURL(stored string) string {
	return strings.TrimRight(strings.TrimSpace(c.URL), "/") + "/" + stored
}

func (c WebDAVConfig) publicURL(stored string) string {
	base := strings.TrimRight(strings.TrimSpace(c.PublicBase), "/")
	if base == "" {
		return "/api/uploads/" + stored
	}
	return base + "/" + stored
}

func validWebDAVEndpoint(value string) bool {
	if value == "" {
		return true
	}
	u, err := url.Parse(value)
	return err == nil && (u.Scheme == "https" || u.Scheme == "http") && u.Host != "" && u.User == nil
}

func validStorageName(value string) bool {
	n := utf8.RuneCountInString(value)
	return n <= 40
}

func (a *API) webdavClient() *http.Client {
	return &http.Client{Timeout: 45 * time.Second}
}

func (a *API) webdavDo(cfg WebDAVConfig, method, objectURL string, body io.Reader, contentType string) (*http.Response, error) {
	req, err := http.NewRequest(method, objectURL, body)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(cfg.Username, cfg.Password)
	req.Header.Set("User-Agent", "QianQiu-MySelf")
	if method == http.MethodPut && contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if method == "PROPFIND" {
		req.Header.Set("Depth", "0")
	}
	return a.webdavClient().Do(req)
}

func (a *API) webdavPut(cfg WebDAVConfig, stored, contentType string, data []byte) error {
	res, err := a.webdavDo(cfg, http.MethodPut, cfg.objectURL(stored), bytes.NewReader(data), contentType)
	if err != nil {
		return fmt.Errorf("无法连接 WebDAV：%w", err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("WebDAV 账号或密码错误")
	}
	if res.StatusCode == http.StatusNotFound || res.StatusCode == http.StatusConflict {
		if mkerr := a.webdavMkcol(cfg); mkerr == nil {
			res2, err := a.webdavDo(cfg, http.MethodPut, cfg.objectURL(stored), bytes.NewReader(data), contentType)
			if err != nil {
				return fmt.Errorf("无法连接 WebDAV：%w", err)
			}
			defer res2.Body.Close()
			if res2.StatusCode >= 200 && res2.StatusCode < 300 {
				return nil
			}
			return fmt.Errorf("WebDAV 上传失败（%d）", res2.StatusCode)
		}
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("WebDAV 上传失败（%d）", res.StatusCode)
	}
	return nil
}

func (a *API) webdavMkcol(cfg WebDAVConfig) error {
	res, err := a.webdavDo(cfg, "MKCOL", strings.TrimRight(cfg.URL, "/"), nil, "")
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusMethodNotAllowed || res.StatusCode == http.StatusConflict || (res.StatusCode >= 200 && res.StatusCode < 300) {
		return nil
	}
	return fmt.Errorf("无法创建 WebDAV 目录（%d）", res.StatusCode)
}

func (a *API) webdavDelete(cfg WebDAVConfig, stored string) error {
	res, err := a.webdavDo(cfg, http.MethodDelete, cfg.objectURL(stored), nil, "")
	if err != nil {
		return fmt.Errorf("无法连接 WebDAV：%w", err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound {
		return nil
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("WebDAV 删除失败（%d）", res.StatusCode)
	}
	return nil
}

func (a *API) webdavGet(cfg WebDAVConfig, stored string) (*http.Response, error) {
	res, err := a.webdavDo(cfg, http.MethodGet, cfg.objectURL(stored), nil, "")
	if err != nil {
		return nil, err
	}
	if res.StatusCode == http.StatusNotFound {
		res.Body.Close()
		return nil, errWebDAVMissing
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		res.Body.Close()
		return nil, fmt.Errorf("WebDAV 读取失败（%d）", res.StatusCode)
	}
	return res, nil
}

func (a *API) webdavProbe(cfg WebDAVConfig) error {
	res, err := a.webdavDo(cfg, "PROPFIND", strings.TrimRight(cfg.URL, "/"), nil, "")
	if err != nil {
		return fmt.Errorf("无法连接 WebDAV：%w", err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("WebDAV 账号或密码错误")
	}
	if res.StatusCode == http.StatusMethodNotAllowed || res.StatusCode == http.StatusNotFound {
		put := a.webdavPut(cfg, ".qianqiu-webdav-check", "text/plain", []byte("ok"))
		if put != nil {
			return put
		}
		_ = a.webdavDelete(cfg, ".qianqiu-webdav-check")
		return nil
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("WebDAV 探测失败（%d）", res.StatusCode)
	}
	return nil
}
