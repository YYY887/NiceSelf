package app

import (
	"context"
	"errors"
	"html"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

type LinkPreview struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Image       string `json:"image"`
	SiteName    string `json:"siteName"`
}

type cachedPreview struct {
	Value LinkPreview
	Until time.Time
}

var (
	previewMu    sync.Mutex
	previewCache = map[string]cachedPreview{}
	previewClient = &http.Client{
		Timeout: 8 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 4 {
				return errPreviewBlocked
			}
			if blockedHost(req.URL.Hostname()) {
				return errPreviewBlocked
			}
			return nil
		},
		Transport: &http.Transport{
			Proxy: nil,
			DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
				host, port, err := net.SplitHostPort(address)
				if err != nil {
					return nil, err
				}
				ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
				if err != nil {
					return nil, err
				}
				var picked net.IP
				for _, item := range ips {
					if blockedIP(item.IP) {
						continue
					}
					picked = item.IP
					break
				}
				if picked == nil {
					return nil, errPreviewBlocked
				}
				return (&net.Dialer{Timeout: 5 * time.Second}).DialContext(ctx, network, net.JoinHostPort(picked.String(), port))
			},
		},
	}
	errPreviewBlocked = errors.New("blocked preview host")

	reMeta     = regexp.MustCompile(`(?is)<meta\s+[^>]+>`)
	reAttr     = regexp.MustCompile(`(?is)([a-z0-9:_-]+)\s*=\s*["']([^"']*)["']`)
	reTitle    = regexp.MustCompile(`(?is)<title[^>]*>([^<]{1,300})</title>`)
	reLink     = regexp.MustCompile(`(?is)<link\s+[^>]+>`)
	reIconRel  = regexp.MustCompile(`(?i)icon|apple-touch-icon|shortcut icon`)
)

func (a *API) linkPreview(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("url"))
	target, err := url.Parse(raw)
	if err != nil || (target.Scheme != "http" && target.Scheme != "https") || target.Hostname() == "" || !strings.Contains(target.Hostname(), ".") {
		fail(w, 400, "无效链接")
		return
	}
	if blockedHost(target.Hostname()) {
		fail(w, 400, "不支持的链接")
		return
	}
	key := target.String()
	previewMu.Lock()
	if item, ok := previewCache[key]; ok && time.Now().Before(item.Until) {
		previewMu.Unlock()
		writeJSON(w, 200, item.Value)
		return
	}
	previewMu.Unlock()

	preview := fetchLinkPreview(r.Context(), target)
	previewMu.Lock()
	previewCache[key] = cachedPreview{Value: preview, Until: time.Now().Add(30 * time.Minute)}
	previewMu.Unlock()
	writeJSON(w, 200, preview)
}

func fetchLinkPreview(ctx context.Context, target *url.URL) LinkPreview {
	fallback := LinkPreview{
		URL:      target.String(),
		Title:    displayHost(target),
		SiteName: target.Hostname(),
		Icon:     faviconURL(target),
	}
	req, err := http.NewRequestWithContext(ctx, "GET", target.String(), nil)
	if err != nil {
		return fallback
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; QianQiuPreview/1.0)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")
	res, err := previewClient.Do(req)
	if err != nil || res.Body == nil {
		return fallback
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		return fallback
	}
	ctype := strings.ToLower(res.Header.Get("Content-Type"))
	if ctype != "" && !strings.Contains(ctype, "html") && !strings.Contains(ctype, "xml") {
		return fallback
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, 256<<10))
	if err != nil || !utf8.Valid(body) && len(body) == 0 {
		return fallback
	}
	final := target
	if res.Request != nil && res.Request.URL != nil {
		final = res.Request.URL
	}
	return parseLinkPreview(string(body), final, fallback)
}

func parseLinkPreview(raw string, base *url.URL, fallback LinkPreview) LinkPreview {
	meta := map[string]string{}
	for _, tag := range reMeta.FindAllString(raw, 80) {
		attrs := htmlAttrs(tag)
		key := strings.ToLower(firstNonEmpty(attrs["property"], attrs["name"]))
		if key == "" {
			continue
		}
		if value := strings.TrimSpace(attrs["content"]); value != "" {
			meta[key] = value
		}
	}
	title := cleanPreviewText(firstNonEmpty(meta["og:title"], meta["twitter:title"]))
	if title == "" {
		if match := reTitle.FindStringSubmatch(raw); len(match) > 1 {
			title = cleanPreviewText(match[1])
		}
	}
	if title == "" {
		title = fallback.Title
	}
	description := cleanPreviewText(firstNonEmpty(meta["og:description"], meta["twitter:description"], meta["description"]))
	if utf8.RuneCountInString(description) > 180 {
		description = string([]rune(description)[:180]) + "…"
	}
	image := absPreviewURL(base, firstNonEmpty(meta["og:image"], meta["twitter:image"]))
	icon := ""
	for _, tag := range reLink.FindAllString(raw, 40) {
		attrs := htmlAttrs(tag)
		if reIconRel.MatchString(attrs["rel"]) {
			icon = absPreviewURL(base, attrs["href"])
			if icon != "" {
				break
			}
		}
	}
	if icon == "" {
		icon = fallback.Icon
	}
	site := cleanPreviewText(firstNonEmpty(meta["og:site_name"], base.Hostname()))
	return LinkPreview{URL: fallback.URL, Title: title, Description: description, Icon: icon, Image: image, SiteName: site}
}

func htmlAttrs(tag string) map[string]string {
	attrs := map[string]string{}
	for _, match := range reAttr.FindAllStringSubmatch(tag, 12) {
		attrs[strings.ToLower(match[1])] = html.UnescapeString(match[2])
	}
	return attrs
}

func cleanPreviewText(value string) string {
	value = html.UnescapeString(strings.TrimSpace(value))
	return strings.Join(strings.Fields(value), " ")
}

func absPreviewURL(base *url.URL, ref string) string {
	ref = strings.TrimSpace(ref)
	if ref == "" || strings.HasPrefix(strings.ToLower(ref), "javascript:") || strings.HasPrefix(strings.ToLower(ref), "data:") {
		return ""
	}
	parsed, err := url.Parse(ref)
	if err != nil {
		return ""
	}
	return base.ResolveReference(parsed).String()
}

func faviconURL(target *url.URL) string {
	return target.Scheme + "://" + target.Host + "/favicon.ico"
}

func displayHost(target *url.URL) string {
	host := strings.TrimPrefix(target.Hostname(), "www.")
	if target.Path != "" && target.Path != "/" {
		return host + target.Path
	}
	return host
}

func blockedHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" || host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") || host == "metadata.google.internal" {
		return true
	}
	if ip := net.ParseIP(host); ip != nil {
		return blockedIP(ip)
	}
	return false
}

func blockedIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast()
}
