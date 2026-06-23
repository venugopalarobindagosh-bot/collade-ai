-- Run in Supabase SQL Editor

-- 1. Ensure columns exist
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS balance integer DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS credits_remaining integer DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Sync balance columns
UPDATE user_credits
SET
  balance = COALESCE(NULLIF(balance, 0), credits_remaining, 0),
  credits_remaining = COALESCE(NULLIF(credits_remaining, 0), balance, 0)
WHERE balance IS DISTINCT FROM credits_remaining;

-- 3. Link your row to your auth user (REPLACE with your UUID from Authentication → Users)
-- UPDATE user_credits SET user_id = 'YOUR-USER-UUID-HERE' WHERE user_id IS NULL;

-- 4. Delete duplicate rows (keeps the row with highest balance per user_id)
DELETE FROM user_credits a
USING user_credits b
WHERE a.user_id = b.user_id
  AND a.user_id IS NOT NULL
  AND a.id < b.id;

-- 5. RLS policy
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own credits" ON user_credits;
CREATE POLICY "Users manage own credits"
ON user_credits FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS user_credits_user_id_unique ON user_credits(user_id);
