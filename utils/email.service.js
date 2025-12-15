// utils/email.service.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

class EmailService {
    async sendOTP(email, code, type = 'register') {
        const subject = type === 'register' 
            ? 'Xác thực email - Pet Shop' 
            : 'Đặt lại mật khẩu - Pet Shop';

        const html = this._buildOTPTemplate(code, type);

        try {
            await transporter.sendMail({
                from: `"Pet Shop" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: subject,
                html: html
            });
            console.log(`OTP sent to ${email}`);
            return true;
        } catch (error) {
            console.error('Email error:', error);
            return false;
        }
    }

    _buildOTPTemplate(code, type) {
        const title = type === 'register' ? 'Xác thực email' : 'Đặt lại mật khẩu';
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">${title} - Pet Shop</h2>
                <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.</p>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
                    <h1 style="margin: 0; color: #333; letter-spacing: 5px;">${code}</h1>
                </div>
                <p><strong>Lưu ý:</strong> Mã OTP có hiệu lực trong 10 phút</p>
                <hr style="border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời.</p>
            </div>
        `;
    }
}

export default new EmailService();