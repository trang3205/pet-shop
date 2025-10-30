// utils/otp.service.js
import db from './db.js';

class OTPService {
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async create(email, type = 'register') {
        const code = this.generateCode();
        const expires_at = new Date(Date.now() + 10 * 60 * 1000);

        await db('otps').where({ email, type }).del();

        await db('otps').insert({
            email,
            code,
            type,
            expires_at,
            created_at: new Date()
        });

        return code;
    }

    async verify(email, code, type = 'register') {
        console.log('🔍 VERIFY OTP - Input:', { email, code, type });
        console.log('🔍 Current time:', new Date());

        try {
            const otp = await db('otps')
                .where({ email, code, type, is_used: false })
                .andWhere('expires_at', '>', new Date())
                .first();

            console.log('🔍 OTP FOUND IN DATABASE:', otp);

            if (!otp) {
                // Debug chi tiết hơn - kiểm tra từng điều kiện
                const byEmail = await db('otps').where({ email }).first();
                const byCode = await db('otps').where({ code }).first();
                const byType = await db('otps').where({ type }).first();
                const byUsed = await db('otps').where({ is_used: false }).first();
                const byExpiry = await db('otps').where('expires_at', '>', new Date()).first();

                console.log('🔍 DEBUG CONDITIONS:');
                console.log(' - OTP with email exists:', !!byEmail);
                console.log(' - OTP with code exists:', !!byCode);
                console.log(' - OTP with type exists:', !!byType);
                console.log(' - OTP not used exists:', !!byUsed);
                console.log(' - OTP not expired exists:', !!byExpiry);

                return false;
            }

            await db('otps').where({ id: otp.id }).update({ is_used: true });
            console.log('✅ OTP VERIFIED SUCCESSFULLY');
            return true;
        } catch (error) {
            console.error('❌ OTP VERIFY ERROR:', error);
            return false;
        }
    }
}

export default new OTPService();