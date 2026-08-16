-- 編集・査読後の進捗報告に、後から参照できる具体的内容を保持する。
-- 既存の報告は空文字として扱い、旧データの読み取り互換性を保つ。
ALTER TABLE editorial_progress_reports
  ADD COLUMN details TEXT NOT NULL DEFAULT '';
