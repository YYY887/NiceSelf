package app

import (
	"path/filepath"
	"testing"
)

func TestProjectGalleryPersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "site.db")
	store, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	project, err := store.SaveProject(Project{Slug: "gallery-test", Title: "Gallery", CoverURL: "/api/uploads/first.png", LogoURL: "/api/uploads/logo.png", Screenshots: []string{"/api/uploads/first.png", "/api/uploads/second.png"}, SiteURL: "https://example.com", SiteLabel: "试用应用", RepoURL: "https://github.com/example/gallery", RepoLabel: "GitHub 源码", Links: []ProjectLink{{Label: "使用文档", URL: "https://example.com/docs"}}, Technologies: []string{"Go"}})
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Close(); err != nil {
		t.Fatal(err)
	}
	store, err = OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	projects, err := store.Projects(true)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range projects {
		if item.ID == project.ID {
			if item.LogoURL != "/api/uploads/logo.png" {
				t.Fatalf("logo lost: %q", item.LogoURL)
			}
			if len(item.Screenshots) != 2 || item.Screenshots[1] != "/api/uploads/second.png" {
				t.Fatalf("gallery lost: %#v", item.Screenshots)
			}
			if item.SiteLabel != "试用应用" || item.RepoLabel != "GitHub 源码" || len(item.Links) != 1 || item.Links[0].Label != "使用文档" {
				t.Fatalf("project links lost: %#v", item)
			}
			return
		}
	}
	t.Fatal("saved project not found")
}
