import dotenv from 'dotenv';
import db from './utils/db.js';

dotenv.config();

async function addEmailColumn() {
    try {
        console.log('🔧 Adding email column to shop_settings table...');
        
        // Check if column already exists
        const columns = await db.raw(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='shop_settings' AND column_name='email'
        `);
        
        if (columns.rows && columns.rows.length > 0) {
            console.log('✅ Email column already exists in shop_settings table');
            await db.destroy();
            process.exit(0);
        }
        
        // Add email column if it doesn't exist
        await db.raw(`
            ALTER TABLE shop_settings
            ADD COLUMN email VARCHAR(255)
        `);
        
        console.log('✅ Email column added successfully to shop_settings table');
        await db.destroy();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding email column:', error);
        console.error('Error details:', error.message);
        await db.destroy().catch(() => {});
        process.exit(1);
    }
}

addEmailColumn();
