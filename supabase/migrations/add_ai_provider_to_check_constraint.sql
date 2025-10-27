-- ============================================
-- ADD AI PROVIDER TO CHECK CONSTRAINT
-- ============================================
-- Update the provider check constraint to include 'ai' option
-- ============================================

-- Drop the existing constraint
ALTER TABLE lead_emails DROP CONSTRAINT IF EXISTS lead_emails_provider_check;

-- Add the updated constraint with 'ai' included
ALTER TABLE lead_emails ADD CONSTRAINT lead_emails_provider_check CHECK (provider IN ('hunter', 'tomba', 'ai'));
