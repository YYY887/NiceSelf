package app

import "time"

type Article struct {
	ID             int64    `json:"id"`
	Slug           string   `json:"slug"`
	Title          string   `json:"title"`
	Summary        string   `json:"summary"`
	Markdown       string   `json:"markdown"`
	Category       string   `json:"category"`
	Tags           []string `json:"tags"`
	Status         string   `json:"status"`
	Date           string   `json:"date"`
	ReadingMinutes int      `json:"readingMinutes"`
	SortOrder      int      `json:"sortOrder"`
	CreatedAt      string   `json:"createdAt"`
	UpdatedAt      string   `json:"updatedAt"`
}

type Category struct {
	ID          int64  `json:"id"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type Tag struct {
	ID   int64  `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type Project struct {
	ID           int64         `json:"id"`
	Slug         string        `json:"slug"`
	Title        string        `json:"title"`
	Summary      string        `json:"summary"`
	Markdown     string        `json:"markdown"`
	CoverURL     string        `json:"coverUrl"`
	LogoURL      string        `json:"logoUrl"`
	Screenshots  []string      `json:"screenshots"`
	Videos       []string      `json:"videos"`
	SiteURL      string        `json:"siteUrl"`
	SiteLabel    string        `json:"siteLabel"`
	RepoURL      string        `json:"repoUrl"`
	RepoLabel    string        `json:"repoLabel"`
	Links        []ProjectLink `json:"links"`
	Technologies []string      `json:"technologies"`
	Status       string        `json:"status"`
	SortOrder    int           `json:"sortOrder"`
	CreatedAt    string        `json:"createdAt"`
	UpdatedAt    string        `json:"updatedAt"`
}

type ProjectLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type Settings struct {
	SiteName        string `json:"siteName"`
	SiteDescription string `json:"siteDescription"`
	AboutIntro      string `json:"aboutIntro"`
	GitHubUsername  string `json:"githubUsername"`
}

type GitHubAuth struct {
	ClientID     string
	ClientSecret string
	Token        string
}

type GitHubAuthView struct {
	ClientID    string `json:"clientId"`
	HasSecret   bool   `json:"hasSecret"`
	HasToken    bool   `json:"hasToken"`
	Configured  bool   `json:"configured"`
	CallbackURL string `json:"callbackUrl"`
}

type User struct {
	ID        int64  `json:"id"`
	GitHubID  int64  `json:"githubId"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl"`
	Role      string `json:"role"`
}

type Comment struct {
	ID          int64  `json:"id"`
	ArticleID   int64  `json:"articleId"`
	ArticleSlug string `json:"articleSlug"`
	User        User   `json:"user"`
	Body        string `json:"body"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
}

type Upload struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	StoredName  string `json:"storedName"`
	URL         string `json:"url"`
	MIME        string `json:"mime"`
	Size        int64  `json:"size"`
	Storage     string `json:"storage"`
	StorageName string `json:"storageName"`
	CreatedAt   string `json:"createdAt"`
	Duplicate   bool   `json:"duplicate,omitempty"`
}

type WebDAVView struct {
	Enabled     bool   `json:"enabled"`
	URL         string `json:"url"`
	Username    string `json:"username"`
	HasPassword bool   `json:"hasPassword"`
	PublicBase  string `json:"publicBase"`
	StorageName string `json:"storageName"`
	Target      string `json:"target"`
}

type Config struct {
	Addr               string
	DatabasePath       string
	UploadDir          string
	BackupDir          string
	PublicURL          string
	GitHubClientID     string
	GitHubClientSecret string
	GitHubToken        string
	SessionDays        int
	HTTPClientTimeout  time.Duration
}
