-- メンバー自身が登録する試験期間・休暇などの予定不可期間。
CREATE TABLE IF NOT EXISTS editorial_member_unavailability (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_editorial_member_unavailability_email
  ON editorial_member_unavailability(email, starts_at);
