import dotenv from 'dotenv';
import db from './utils/db.js';

dotenv.config();

async function createSessionsTable() {
    try {
        console.log('🔧 Creating sessions table if not exists...');
        
        // Check if table already exists
        const tableExists = await db.raw(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'sessions'
            );
        `);
        
        if (tableExists.rows && tableExists.rows[0].exists) {
            console.log('✅ Sessions table already exists');
            await db.destroy();
            process.exit(0);
        }
        
        // Create sessions table
        await db.raw(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                login_time TIMESTAMP NOT NULL,
                logout_time TIMESTAMP,
                duration_minutes INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create indexes
        await db.raw(`
            CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
        `);
        
        await db.raw(`
            CREATE INDEX IF NOT EXISTS idx_sessions_login_time ON sessions(login_time DESC)
        `);
        
        await db.raw(`
            CREATE INDEX IF NOT EXISTS idx_sessions_logout_time ON sessions(logout_time)
        `);
        
        console.log('✅ Sessions table created successfully with indexes');
        await db.destroy();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating sessions table:', error);
        console.error('Error details:', error.message);
        await db.destroy().catch(() => {});
        process.exit(1);
    }
}

createSessionsTable();
