package app

import "testing"

func TestNormalizeProjectURL(t *testing.T) {
	tests := []struct {
		input string
		want  string
		valid bool
	}{
		{"qianqiu.dev", "https://qianqiu.dev", true},
		{" qianqiu.dev/docs ", "https://qianqiu.dev/docs", true},
		{"https://github.com/user/repo", "https://github.com/user/repo", true},
		{"/api/uploads/cover.png", "/api/uploads/cover.png", true},
		{"http://qianqiu.dev", "http://qianqiu.dev", false},
		{"not a url", "not a url", false},
	}
	for _, tt := range tests {
		got := normalizeProjectURL(tt.input)
		if got != tt.want || validURL(got) != tt.valid {
			t.Errorf("normalizeProjectURL(%q) = %q, valid = %v; want %q, %v", tt.input, got, validURL(got), tt.want, tt.valid)
		}
	}
}
