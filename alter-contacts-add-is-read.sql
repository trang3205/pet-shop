-- Add is_read column to contacts table
ALTER TABLE contacts ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;

-- Set existing contacts as read (since they don't have read status)
UPDATE contacts SET is_read = true WHERE is_read IS NULL;
