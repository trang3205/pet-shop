// routes/account.route.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../utils/db.js';
import User from '../models/user.model.js';
import otpService from '../utils/otp.service.js';
import emailService from '../utils/email.service.js';

const router = Router();

// ========== REGISTER ==========
router.get('/register', (req, res) => {
    res.render('vwAccount/register', { error: null });
});

router.post('/register', async (req, res) => {
    const { email, password, confirm_password, name, phone } = req.body;

    if (!name || !email || !password) {
        return res.render('vwAccount/register', { error: 'Vui lòng điền đầy đủ thông tin.' });
    }
    if (password !== confirm_password) {
        return res.render('vwAccount/register', { error: 'Mật khẩu xác nhận không khớp.' });
    }
    if (password.length < 6) {
        return res.render('vwAccount/register', { error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const existed = await User.findByEmail(email);
    if (existed) {
        return res.render('vwAccount/register', { error: 'Email đã được sử dụng.' });
    }

    try {
        req.session.tempUser = { email, password, name, phone };
        const otpCode = await otpService.create(email, 'register');
        await emailService.sendOTP(email, otpCode, 'register');

        return res.redirect(`/account/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
        console.error('Register error:', error);
        return res.render('vwAccount/register', { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    }
});

// ========== VERIFY OTP ==========
router.get('/verify-otp', (req, res) => {
    const email = req.query.email;
    if (!email || !req.session.tempUser) {
        return res.redirect('/account/register');
    }
    res.render('vwAccount/verify-otp', { email, error: null });
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp_code } = req.body;
    if (!email || !otp_code || !req.session.tempUser) {
        return res.redirect('/account/register');
    }

    try {
        const isValid = await otpService.verify(email, otp_code, 'register');
        if (!isValid) {
            return res.render('vwAccount/verify-otp', { email, error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }

        const { password, name, phone } = req.session.tempUser;
        await User.create({ email, password, name, phone });

        delete req.session.tempUser;
        return res.redirect('/account/login?success=1');
    } catch (error) {
        console.error('OTP verification error:', error);
        return res.render('vwAccount/verify-otp', { email, error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    }
});

// ========== VERIFY ADMIN OTP ==========
router.get('/verify-admin-otp', (req, res) => {
    const email = req.query.email;
    if (!email || !req.session.tempAdmin) {
        return res.redirect('/admin/login');
    }
    res.render('vwAccount/verify-admin-otp', { email, error: null });
});

router.post('/verify-admin-otp', async (req, res) => {
    const { email, otp_code } = req.body;
    if (!email || !otp_code || !req.session.tempAdmin) {
        return res.redirect('/admin/login');
    }

    try {
        const isValid = await otpService.verify(email, otp_code, 'admin');
        if (!isValid) {
            return res.render('vwAccount/verify-admin-otp', { email, error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }

        const adminUser = req.session.tempAdmin;
        req.session.user = {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role
        };

        console.log('✅ ADMIN LOGIN SUCCESS - Session user set:', req.session.user);

        // Create session record with user info
        try {
            await db('sessions').insert({
                user_id: adminUser.id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role,
                login_time: new Date()
            });
        } catch (err) {
            console.error('Error creating session record:', err);
        }

        delete req.session.tempAdmin;
        return res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Admin OTP verification error:', error);
        return res.render('vwAccount/verify-admin-otp', { email, error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    }
});

// ========== LOGIN ==========
router.get('/login', (req, res) => {
    const success = req.query.success === '1' ? 'Đăng ký thành công! Vui lòng đăng nhập.' : null;
    res.render('vwAccount/login', { success, error: null });
});

router.post('/login', async (req, res) => {
    const { email, password, redirectTo } = req.body;
    if (!email || !password) {
        return res.render('vwAccount/login', { error: 'Vui lòng nhập email và mật khẩu.' });
    }

    try {
        const userRecord = await User.findByEmail(email);

        if (userRecord && userRecord.is_locked) {
            return res.render('vwAccount/login', { error: 'Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên.' });
        }

        const user = await User.authenticate(email, password);
        if (!user) {
            return res.render('vwAccount/login', { error: 'Email hoặc mật khẩu không đúng.' });
        }

        // Check if this is admin login from admin page (redirectTo indicates this)
        if (redirectTo === '/admin/dashboard') {
            // Admin login must be from admin page and user must be admin
            if (user.role !== 'admin') {
                return res.render('vwAdmin/login', { error: 'Chỉ tài khoản Admin mới có thể đăng nhập tại đây.' });
            }

            // For admin login, require OTP verification
            try {
                const otpCode = await otpService.create(email, 'admin');
                await emailService.sendOTP(email, otpCode, 'admin');

                // Store admin user info temporarily in session for OTP verification
                req.session.tempAdmin = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                return res.redirect(`/account/verify-admin-otp?email=${encodeURIComponent(email)}`);
            } catch (error) {
                console.error('Error sending admin OTP:', error);
                return res.render('vwAdmin/login', { error: 'Có lỗi xảy ra khi gửi OTP. Vui lòng thử lại.' });
            }
        } else {
            // Customer/Manager login - admins cannot use regular login
            if (user.role === 'admin') {
                return res.render('vwAccount/login', { error: 'Tài khoản Admin không thể đăng nhập tại đây. Vui lòng sử dụng chức năng "Login as Admin".' });
            }
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        console.log('🔍 LOGIN SUCCESS - Session user set:', req.session.user);
        console.log('🔍 LOGIN SUCCESS - Session ID:', req.sessionID);

        // Create session record with user info
        try {
            await db('sessions').insert({
                user_id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                login_time: new Date()
            });
        } catch (err) {
            console.error('Error creating session record:', err);
        }

        // Redirect theo redirectTo hoặc role
        if (redirectTo) {
            return res.redirect(redirectTo);
        }
        if (user.role === 'admin') return res.redirect('/admin');
        if (user.role === 'manager') return res.redirect('/');
        return res.redirect('/');
        return res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        return res.render('vwAccount/login', { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    }
});

// ========== LOGOUT ==========
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

router.post('/logout', async (req, res) => {
    const userId = req.session.user?.id;

    if (userId) {
        try {
            // Get the latest active session (without logout_time)
            const latestSession = await db('sessions')
                .where('user_id', userId)
                .whereNull('logout_time')
                .orderBy('login_time', 'desc')
                .first();

            if (latestSession) {
                const logoutTime = new Date();
                const loginTime = new Date(latestSession.login_time);
                const durationMinutes = Math.floor((logoutTime - loginTime) / (1000 * 60));

                // Update session with logout time and duration
                await db('sessions').where('id', latestSession.id).update({
                    logout_time: logoutTime,
                    duration_minutes: durationMinutes
                });
            }
        } catch (err) {
            console.error('Error recording logout:', err);
        }
    }

    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ========== RESEND OTP ==========
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || !req.session.tempUser) {
        return res.redirect('/account/register');
    }

    try {
        const otpCode = await otpService.create(email, 'register');
        await emailService.sendOTP(email, otpCode, 'register');
        
        return res.redirect(`/account/verify-otp?email=${encodeURIComponent(email)}&resent=1`);
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.redirect(`/account/verify-otp?email=${encodeURIComponent(email)}&error=1`);
    }
});

export default router;