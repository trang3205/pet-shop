-- Add email column to shop_settings table
ALTER TABLE shop_settings
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Verify the column was added
SELECT column_name FROM information_schema.columns 
WHERE table_name='shop_settings' AND column_name='email';
