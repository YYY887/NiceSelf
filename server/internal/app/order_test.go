package app

import (
	"path/filepath"
	"testing"
)

func TestReorderPersistsAndRejectsPartialLists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "site.db")
	store, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}

	articles, err := store.Articles(true)
	if err != nil {
		t.Fatal(err)
	}
	if len(articles) < 2 {
		t.Fatal("expected seeded articles")
	}
	originalFirst := articles[0].ID
	ids := make([]int64, len(articles))
	for i := range articles {
		ids[i] = articles[len(articles)-1-i].ID
	}
	if err := store.Reorder("articles", ids); err != nil {
		t.Fatal(err)
	}
	ordered, err := store.Articles(false)
	if err != nil {
		t.Fatal(err)
	}
	if ordered[0].ID != ids[0] || ordered[len(ordered)-1].ID != originalFirst {
		t.Fatalf("article order not applied: %+v", ordered)
	}
	if err := store.Reorder("articles", ids[:1]); err == nil {
		t.Fatal("partial order should fail")
	}
	if err := store.Reorder("articles", []int64{ids[0], ids[0]}); err == nil {
		t.Fatal("duplicate IDs should fail")
	}

	project, err := store.SaveProject(Project{Slug: "second-project", Title: "Second project", Status: "published"})
	if err != nil {
		t.Fatal(err)
	}
	projects, err := store.Projects(true)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Reorder("projects", []int64{project.ID, projects[0].ID}); err != nil {
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
	ordered, err = store.Articles(true)
	if err != nil {
		t.Fatal(err)
	}
	if ordered[0].ID != ids[0] {
		t.Fatal("article order was not persisted")
	}
	projects, err = store.Projects(false)
	if err != nil {
		t.Fatal(err)
	}
	if projects[0].ID != project.ID {
		t.Fatal("project order was not persisted")
	}
}
