// models/user.model.js
import db from '../utils/db.js';
import bcrypt from 'bcryptjs';

export default {
    async findByEmail(email) {
        try {
            return await db('users')
                .select('id', 'name', 'email', 'password', 'phone', 'role', 'avatar_url', 'is_locked')
                .where({ email })
                .first();
        } catch {
            return null;
        }
    },

    async create(userData) {
        const { email, password, name, phone } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);  // Hash password

        const [user] = await db('users').insert({
            email,
            password: hashedPassword,  // 🚨 Lưu password ĐÃ HASH vào column 'password'
            name,
            phone,
            role: 'customer',
            created_at: new Date()
        }).returning('*');

        return user;
    },

    async authenticate(email, password) {
        const user = await this.findByEmail(email);
        if (!user) return null;

        // Check if account is locked
        if (user.is_locked) {
            console.log('❌ Account locked:', email);
            return null;
        }

        // So sánh password nhập vào với hash trong database
        const isValid = await bcrypt.compare(password, user.password);
        return isValid ? user : null;
    }
};