package app

import (
	"errors"
	"fmt"
)

func (s *Store) Reorder(resource string, ids []int64) error {
	if resource != "articles" && resource != "projects" {
		return errors.New("不支持排序此内容")
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var count int
	if err := tx.QueryRow(`SELECT count(*) FROM ` + resource).Scan(&count); err != nil {
		return err
	}
	if len(ids) != count {
		return errors.New("排序列表已变化，请刷新后重试")
	}
	seen := make(map[int64]bool, len(ids))
	for index, id := range ids {
		if id <= 0 || seen[id] {
			return errors.New("排序列表包含重复或无效条目")
		}
		seen[id] = true
		result, err := tx.Exec(fmt.Sprintf(`UPDATE %s SET sort_order=? WHERE id=?`, resource), index+1, id)
		if err != nil {
			return err
		}
		changed, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if changed != 1 {
			return errors.New("排序列表包含不存在的条目")
		}
	}
	return tx.Commit()
}
