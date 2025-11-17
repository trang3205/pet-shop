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

// ========== LOGIN ==========
router.get('/login', (req, res) => {
    const success = req.query.success === '1' ? 'Đăng ký thành công! Vui lòng đăng nhập.' : null;
    res.render('vwAccount/login', { success, error: null });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.render('vwAccount/login', { error: 'Vui lòng nhập email và mật khẩu.' });
    }

    try {
        const user = await User.authenticate(email, password);
        if (!user) {
            return res.render('vwAccount/login', { error: 'Email hoặc mật khẩu không đúng.' });
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        console.log('🔍 LOGIN SUCCESS - Session user set:', req.session.user);
        console.log('🔍 LOGIN SUCCESS - Session ID:', req.sessionID);

        // Redirect theo role
        if (user.role === 'admin') return res.redirect('/admin');
        if (user.role === 'staff') return res.redirect('/staff');
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

router.post('/logout', (req, res) => {
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