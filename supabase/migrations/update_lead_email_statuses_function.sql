-- Function to update lead email_status based on email_suppression table
-- This should be run after syncing SendGrid data

CREATE OR REPLACE FUNCTION update_lead_email_statuses()
RETURNS void AS $$
BEGIN
  -- Update bounced emails (highest priority)
  UPDATE leads
  SET email_status = 'bounced'
  WHERE email_domain IN (
    SELECT DISTINCT domain
    FROM email_suppression
    WHERE source = 'bounce'
  );

  -- Update unsubscribed emails
  UPDATE leads
  SET email_status = 'unsubscribed'
  WHERE email_domain IN (
    SELECT DISTINCT domain
    FROM email_suppression
    WHERE source IN ('unsubscribe', 'asm_group')
  )
  AND email_status NOT IN ('bounced'); -- Don't override bounced

  -- Update invalid emails
  UPDATE leads
  SET email_status = 'invalid'
  WHERE email_domain IN (
    SELECT DISTINCT domain
    FROM email_suppression
    WHERE source = 'invalid'
  )
  AND email_status NOT IN ('bounced', 'unsubscribed');

  -- Update other suppressions
  UPDATE leads
  SET email_status = 'suppressed'
  WHERE email_domain IN (
    SELECT DISTINCT domain
    FROM email_suppression
    WHERE source NOT IN ('bounce', 'unsubscribe', 'asm_group', 'invalid')
  )
  AND email_status NOT IN ('bounced', 'unsubscribed', 'invalid');

  -- Mark leads with no suppressions as valid
  UPDATE leads
  SET email_status = 'valid'
  WHERE email_domain IS NOT NULL
  AND email_domain != ''
  AND email_status = 'unknown'
  AND email_domain NOT IN (
    SELECT DISTINCT domain
    FROM email_suppression
  );

  RAISE NOTICE 'Lead email statuses updated successfully';
END;
$$ LANGUAGE plpgsql;
