-- Create shop_settings table
CREATE TABLE IF NOT EXISTS shop_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT 'PetShop',
    phone VARCHAR(20),
    street_address TEXT,
    province VARCHAR(100),
    district VARCHAR(100),
    ward VARCHAR(100),
    logo VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO shop_settings (id, name, phone, street_address, province, district, ward) 
VALUES (1, 'PetShop', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;
