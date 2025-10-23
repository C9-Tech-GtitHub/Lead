-- Create junction table for email suppressions to ASM group many-to-many relationship
-- This allows an email to belong to multiple ASM groups simultaneously

CREATE TABLE IF NOT EXISTS email_asm_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES email_suppression(email) ON DELETE CASCADE,
  asm_group_id INTEGER NOT NULL,
  asm_group_name TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint: each email can only be in each group once
  UNIQUE(email, asm_group_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_asm_groups_email ON email_asm_groups(email);
CREATE INDEX IF NOT EXISTS idx_email_asm_groups_asm_group_id ON email_asm_groups(asm_group_id);
CREATE INDEX IF NOT EXISTS idx_email_asm_groups_created_at ON email_asm_groups(created_at);

-- Add comment for documentation
COMMENT ON TABLE email_asm_groups IS 'Junction table tracking which ASM unsubscribe groups each suppressed email belongs to. Supports many-to-many relationships.';
COMMENT ON COLUMN email_asm_groups.email IS 'Email address (foreign key to email_suppression table)';
COMMENT ON COLUMN email_asm_groups.asm_group_id IS 'SendGrid ASM group ID';
COMMENT ON COLUMN email_asm_groups.asm_group_name IS 'SendGrid ASM group name for convenience';
COMMENT ON COLUMN email_asm_groups.synced_at IS 'When this group membership was last confirmed during sync';

-- Migrate existing data from email_suppression table
-- Copy any emails that currently have an asm_group_id set
INSERT INTO email_asm_groups (email, asm_group_id, asm_group_name, created_at)
SELECT
  email,
  asm_group_id,
  COALESCE(asm_group_name, 'Unknown Group'),
  created_at
FROM email_suppression
WHERE asm_group_id IS NOT NULL
  AND source = 'asm_group'
ON CONFLICT (email, asm_group_id) DO NOTHING;

-- Note: We keep the asm_group_id and asm_group_name columns in email_suppression
-- for backwards compatibility, but they will no longer be the source of truth
-- The junction table is now the authoritative source for ASM group memberships
