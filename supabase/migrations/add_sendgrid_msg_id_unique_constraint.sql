-- Add unique constraint to sendgrid_msg_id for upsert operations
-- This allows the CSV importer to update existing records

ALTER TABLE email_send_history
ADD CONSTRAINT email_send_history_sendgrid_msg_id_key
UNIQUE (sendgrid_msg_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_send_history_sendgrid_msg_id
ON email_send_history(sendgrid_msg_id);
