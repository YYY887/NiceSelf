package app

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"time"
)

type Backup struct {
	Name      string `json:"name"`
	Size      int64  `json:"size"`
	CreatedAt string `json:"createdAt"`
}

var backupName = regexp.MustCompile(`^site-[0-9]{8}-[0-9]{6}-[0-9a-f]{8}\.db$`)

func (a *API) backupDir() string {
	if a.Config.BackupDir != "" {
		return a.Config.BackupDir
	}
	return filepath.Join(filepath.Dir(a.Config.DatabasePath), "backups")
}

func (a *API) backups() ([]Backup, error) {
	if err := os.MkdirAll(a.backupDir(), 0700); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(a.backupDir())
	if err != nil {
		return nil, err
	}
	items := []Backup{}
	for _, entry := range entries {
		if entry.IsDir() || !backupName.MatchString(entry.Name()) {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		items = append(items, Backup{Name: entry.Name(), Size: info.Size(), CreatedAt: info.ModTime().Format(time.RFC3339)})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name > items[j].Name })
	return items, nil
}

func (a *API) listBackups(w http.ResponseWriter, r *http.Request, u User) {
	items, err := a.backups()
	if err != nil {
		fail(w, 500, "读取备份失败")
		return
	}
	writeJSON(w, 200, items)
}

func (a *API) createBackup(w http.ResponseWriter, r *http.Request, u User) {
	if err := os.MkdirAll(a.backupDir(), 0700); err != nil {
		fail(w, 500, "创建备份目录失败")
		return
	}
	random := make([]byte, 4)
	if _, err := rand.Read(random); err != nil {
		fail(w, 500, "生成备份名失败")
		return
	}
	name := "site-" + time.Now().Format("20060102-150405") + "-" + hex.EncodeToString(random) + ".db"
	path := filepath.Join(a.backupDir(), name)
	if _, err := a.Store.db.ExecContext(r.Context(), `VACUUM INTO ?`, path); err != nil {
		_ = os.Remove(path)
		fail(w, 500, "创建 SQLite 备份失败")
		return
	}
	_ = os.Chmod(path, 0600)
	info, err := os.Stat(path)
	if err != nil {
		fail(w, 500, "备份文件读取失败")
		return
	}
	writeJSON(w, 201, Backup{Name: name, Size: info.Size(), CreatedAt: info.ModTime().Format(time.RFC3339)})
}

func (a *API) downloadBackup(w http.ResponseWriter, r *http.Request, u User) {
	name := r.PathValue("name")
	if !backupName.MatchString(name) {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join(a.backupDir(), name)
	if _, err := os.Stat(path); err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/vnd.sqlite3")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, path)
}
