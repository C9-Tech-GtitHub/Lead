-- ============================================
-- FIX EMAIL DOMAIN TRIGGER FUNCTION
-- ============================================
-- Fixes the logic error in populate_lead_email_domain()
-- Original version referenced non-existent lead_emails table
-- and had flawed logic

-- Drop old trigger and function
DROP TRIGGER IF EXISTS trigger_populate_lead_email_domain ON leads;
DROP FUNCTION IF EXISTS populate_lead_email_domain();

-- Create improved function that extracts domain from website
CREATE OR REPLACE FUNCTION populate_lead_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract domain from website if available
  IF NEW.website IS NOT NULL AND NEW.website != '' THEN
    -- Remove protocol (http://, https://)
    -- Remove www. prefix
    -- Remove trailing paths
    NEW.email_domain := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(NEW.website, '^https?://', ''),
          '^www\.', ''
        ),
        '/.*$', ''
      )
    );
  ELSIF NEW.email_domain IS NULL OR NEW.email_domain = '' THEN
    -- If no website and no email_domain, try to extract from business name
    -- This is a fallback - not guaranteed to be accurate
    IF NEW.business_name IS NOT NULL AND NEW.business_name != '' THEN
      -- Simple heuristic: convert business name to potential domain
      -- Example: "ABC Plumbing" -> "abcplumbing.com.au" (if in Australia)
      -- This is just a placeholder - adjust based on your data
      NEW.email_domain := NULL; -- Keep NULL if we can't determine
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_populate_lead_email_domain
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION populate_lead_email_domain();

-- Backfill existing leads with missing email_domain
UPDATE leads
SET email_domain = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(website, '^https?://', ''),
      '^www\.', ''
    ),
    '/.*$', ''
  )
)
WHERE website IS NOT NULL
  AND website != ''
  AND (email_domain IS NULL OR email_domain = '');

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  leads_with_domain_count INTEGER;
  total_leads_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_leads_count FROM leads;
  SELECT COUNT(*) INTO leads_with_domain_count
    FROM leads
    WHERE email_domain IS NOT NULL AND email_domain != '';

  RAISE NOTICE '✅ Fixed populate_lead_email_domain() function';
  RAISE NOTICE '✅ Recreated trigger';
  RAISE NOTICE '✅ Backfilled email_domain for existing leads';
  RAISE NOTICE '';
  RAISE NOTICE 'Leads with email_domain: % / %', leads_with_domain_count, total_leads_count;
END $$;
