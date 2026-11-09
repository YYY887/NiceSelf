package app

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/xml"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const maxUploadSize = 50 << 20

func originalExtension(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	if len(ext) < 2 || len(ext) > 9 {
		return ""
	}
	for _, r := range ext[1:] {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') {
			return ""
		}
	}
	return ext
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func mimeFromExtension(ext string) string {
	switch ext {
	case ".html", ".htm":
		return "text/html"
	case ".md", ".txt":
		return "text/plain"
	case ".json":
		return "application/json"
	case ".pdf":
		return "application/pdf"
	case ".zip":
		return "application/zip"
	case ".xml":
		return "application/xml"
	case ".css":
		return "text/css"
	case ".js", ".mjs":
		return "text/javascript"
	case ".csv":
		return "text/csv"
	case ".mp4", ".m4v":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".mov":
		return "video/quicktime"
	case ".mp3":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	case ".m4a":
		return "audio/mp4"
	case ".ogg":
		return "audio/ogg"
	case ".doc":
		return "application/msword"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case ".xls":
		return "application/vnd.ms-excel"
	case ".xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case ".ppt":
		return "application/vnd.ms-powerpoint"
	case ".pptx":
		return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	default:
		if t := mime.TypeByExtension(ext); t != "" {
			t = strings.TrimSpace(strings.Split(t, ";")[0])
			if strings.HasPrefix(t, "image/") {
				return ""
			}
			return t
		}
		return ""
	}
}

// Detect MIME from content so a renamed PNG is still an image. Keep the original
// suffix on the stored name; unknown bytes stay downloadable attachments.
func uploadFormat(data []byte, originalName string) (mimeType, extension string) {
	orig := originalExtension(originalName)
	if isSVG(data) {
		return "image/svg+xml", firstNonEmpty(orig, ".svg")
	}
	var sniffed string
	switch detected := http.DetectContentType(data); {
	case strings.HasPrefix(detected, "image/png"):
		mimeType, sniffed = "image/png", ".png"
	case strings.HasPrefix(detected, "image/jpeg"):
		mimeType, sniffed = "image/jpeg", ".jpg"
	case strings.HasPrefix(detected, "image/webp"):
		mimeType, sniffed = "image/webp", ".webp"
	case strings.HasPrefix(detected, "image/gif"):
		mimeType, sniffed = "image/gif", ".gif"
	case strings.HasPrefix(detected, "application/pdf"):
		mimeType, sniffed = "application/pdf", ".pdf"
	case isMP4(data):
		mimeType, sniffed = "video/mp4", ".mp4"
	case strings.HasPrefix(detected, "text/html"):
		mimeType, sniffed = "text/html", ".html"
	case strings.HasPrefix(detected, "text/xml"), strings.Contains(detected, "xml"):
		mimeType, sniffed = "application/xml", ".xml"
	case strings.HasPrefix(detected, "text/plain"):
		mimeType, sniffed = "text/plain", ".txt"
	default:
		mimeType, sniffed = "application/octet-stream", ".bin"
	}
	extension = firstNonEmpty(orig, sniffed)
	if orig != "" && (mimeType == "application/octet-stream" || mimeType == "text/plain") {
		if mapped := mimeFromExtension(orig); mapped != "" {
			mimeType = mapped
		}
	}
	return mimeType, extension
}

func isMP4(data []byte) bool {
	return len(data) >= 12 && string(data[4:8]) == "ftyp"
}

func serveInline(mimeType string) bool {
	return strings.HasPrefix(mimeType, "image/") || strings.HasPrefix(mimeType, "video/") || strings.HasPrefix(mimeType, "audio/") || mimeType == "application/pdf"
}

func isSVG(data []byte) bool {
	decoder := xml.NewDecoder(bytes.NewReader(bytes.TrimPrefix(data, []byte{0xef, 0xbb, 0xbf})))
	for {
		token, err := decoder.Token()
		if err != nil {
			return false
		}
		if root, ok := token.(xml.StartElement); ok {
			return root.Name.Local == "svg" && (root.Name.Space == "" || root.Name.Space == "http://www.w3.org/2000/svg")
		}
	}
}

func (a *API) uploadDir() string {
	if a.Config.UploadDir != "" {
		return a.Config.UploadDir
	}
	return filepath.Join(filepath.Dir(a.Config.DatabasePath), "uploads")
}

func (s *Store) Uploads() ([]Upload, error) {
	rows, err := s.db.Query(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Upload{}
	for rows.Next() {
		var v Upload
		if err := rows.Scan(&v.ID, &v.Name, &v.StoredName, &v.MIME, &v.Size, &v.URL, &v.Storage, &v.StorageName, &v.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, normalizeUpload(v))
	}
	return items, rows.Err()
}

func (s *Store) UploadByName(name string) (Upload, error) {
	var v Upload
	err := s.db.QueryRow(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads WHERE stored_name=?`, name).Scan(&v.ID, &v.Name, &v.StoredName, &v.MIME, &v.Size, &v.URL, &v.Storage, &v.StorageName, &v.CreatedAt)
	return normalizeUpload(v), err
}

func (s *Store) uploadByHash(hash string) (Upload, bool, error) {
	var v Upload
	err := s.db.QueryRow(`SELECT id,name,stored_name,mime,size,url,storage,storage_name,created_at FROM uploads WHERE content_hash=? AND content_hash!=''`, hash).Scan(&v.ID, &v.Name, &v.StoredName, &v.MIME, &v.Size, &v.URL, &v.Storage, &v.StorageName, &v.CreatedAt)
	if err == sql.ErrNoRows {
		return Upload{}, false, nil
	}
	if err != nil {
		return Upload{}, false, err
	}
	return normalizeUpload(v), true, nil
}

func normalizeUpload(v Upload) Upload {
	if v.Storage == "" {
		v.Storage = "local"
	}
	if v.URL == "" {
		v.URL = "/api/uploads/" + v.StoredName
	}
	if v.StorageName == "" {
		if v.Storage == "webdav" {
			v.StorageName = "WebDAV"
		} else {
			v.StorageName = "本地"
		}
	}
	return v
}

func (a *API) listUploads(w http.ResponseWriter, r *http.Request, u User) {
	items, err := a.Store.Uploads()
	if err != nil {
		fail(w, 500, "读取文件失败")
		return
	}
	writeJSON(w, 200, items)
}

func (a *API) uploadFile(w http.ResponseWriter, r *http.Request, u User) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize+(1<<20))
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		fail(w, 413, "文件不能超过 50 MB")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		fail(w, 400, "请选择文件")
		return
	}
	defer file.Close()
	name := filepath.Base(header.Filename)
	if name == "." || name == "" || len(name) > 180 {
		fail(w, 400, "文件名无效")
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, maxUploadSize+1))
	if err != nil || len(data) > maxUploadSize {
		fail(w, 413, "文件不能超过 50 MB")
		return
	}
	want, ext := uploadFormat(data, name)
	a.uploadMu.Lock()
	defer a.uploadMu.Unlock()
	wantHash := sha256.Sum256(data)
	hash := hex.EncodeToString(wantHash[:])
	if existing, ok, err := a.Store.uploadByHash(hash); err != nil {
		fail(w, 500, "检查重复文件失败")
		return
	} else if ok {
		existing.Duplicate = true
		writeJSON(w, 200, existing)
		return
	}
	dav, err := a.Store.WebDAVConfig()
	if err != nil {
		fail(w, 500, "读取存储配置失败")
		return
	}
	if dav.Target == "webdav" && !dav.Ready() {
		fail(w, 503, "尚未完成 WebDAV 配置")
		return
	}
	random := make([]byte, 12)
	if _, err := rand.Read(random); err != nil {
		fail(w, 500, "生成文件名失败")
		return
	}
	stored := hex.EncodeToString(random) + ext
	storage := "local"
	storageName := "本地"
	public := "/api/uploads/" + stored
	localPath := filepath.Join(a.uploadDir(), stored)
	if dav.UsesRemote() {
		if err := a.webdavPut(dav, stored, want, data); err != nil {
			fail(w, 502, err.Error())
			return
		}
		storage = "webdav"
		storageName = dav.Label()
		public = dav.publicURL(stored)
	} else {
		if err := os.MkdirAll(a.uploadDir(), 0700); err != nil {
			fail(w, 500, "创建上传目录失败")
			return
		}
		if err := os.WriteFile(localPath, data, 0600); err != nil {
			fail(w, 500, "写入文件失败")
			return
		}
	}
	stamp := now()
	result, err := a.Store.db.Exec(`INSERT INTO uploads(name,stored_name,mime,size,content_hash,url,storage,storage_name,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, name, stored, want, len(data), hash, public, storage, storageName, stamp)
	if err != nil {
		if storage == "webdav" {
			_ = a.webdavDelete(dav, stored)
		} else {
			_ = os.Remove(localPath)
		}
		fail(w, 500, "保存文件记录失败")
		return
	}
	id, _ := result.LastInsertId()
	writeJSON(w, 201, Upload{ID: id, Name: name, StoredName: stored, URL: public, MIME: want, Size: int64(len(data)), Storage: storage, StorageName: storageName, CreatedAt: stamp})
}

func (a *API) serveUpload(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name != filepath.Base(name) || strings.Contains(name, "..") {
		http.NotFound(w, r)
		return
	}
	item, err := a.Store.UploadByName(name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if item.Storage == "webdav" && strings.HasPrefix(item.URL, "http") {
		http.Redirect(w, r, item.URL, http.StatusFound)
		return
	}
	var src io.ReadCloser
	if item.Storage == "webdav" {
		dav, err := a.Store.WebDAVConfig()
		if err != nil || !dav.Ready() {
			http.NotFound(w, r)
			return
		}
		res, err := a.webdavGet(dav, item.StoredName)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		src = res.Body
	} else {
		f, err := os.Open(filepath.Join(a.uploadDir(), item.StoredName))
		if err != nil {
			http.NotFound(w, r)
			return
		}
		src = f
	}
	defer src.Close()
	w.Header().Set("Content-Type", item.MIME)
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Security-Policy", "default-src 'none'")
	if item.MIME == "image/svg+xml" {
		w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:")
	}
	if !serveInline(item.MIME) {
		w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": item.Name}))
	}
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if file, ok := src.(*os.File); ok {
		info, err := file.Stat()
		if err == nil {
			http.ServeContent(w, r, item.Name, info.ModTime(), file)
			return
		}
	}
	_, _ = io.Copy(w, src)
}

func (a *API) deleteUpload(w http.ResponseWriter, r *http.Request, u User) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id < 1 {
		fail(w, 400, "无效文件 ID")
		return
	}
	var name, storage string
	if err := a.Store.db.QueryRow(`SELECT stored_name,storage FROM uploads WHERE id=?`, id).Scan(&name, &storage); err != nil {
		fail(w, 404, "文件不存在")
		return
	}
	if storage == "webdav" {
		if dav, err := a.Store.WebDAVConfig(); err == nil && dav.Ready() {
			if err := a.webdavDelete(dav, name); err != nil {
				fail(w, 502, err.Error())
				return
			}
		}
	} else if err := os.Remove(filepath.Join(a.uploadDir(), name)); err != nil && !os.IsNotExist(err) {
		fail(w, 500, "删除文件失败")
		return
	}
	if _, err := a.Store.db.Exec(`DELETE FROM uploads WHERE id=?`, id); err != nil {
		fail(w, 500, "删除文件记录失败")
		return
	}
	w.WriteHeader(204)
}
