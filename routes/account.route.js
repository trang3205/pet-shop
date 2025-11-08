// routes/account.route.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../utils/db.js';
import User from '../models/user.model.js';
import otpService from '../utils/otp.service.js';
import emailService from '../utils/email.service.js';
import { authenticateUser, requireAuth } from '../middlewares/auth.js';
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
// ========== PROFILE ROUTES ==========

// GET /account/profile - Trang profile
router.get("/profile", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Lấy thông tin user
    const user = await db("users")
      .select("id", "email", "name", "phone", "avatar_url", "role", "created_at")
      .where("id", userId)
      .first();

    // Lấy thống kê
    const stats = await Promise.all([
      // Đếm số đơn hàng
      db("orders")
        .where("user_id", userId)
        .count('* as count')
        .first(),
      
      // Đếm số sản phẩm trong wishlist
      db("wishlists")
        .where("user_id", userId)
        .count('* as count')
        .first(),
      
      // Đếm số sản phẩm trong giỏ hàng
      db("cart_items")
        .where("user_id", userId)
        .count('* as count')
        .first()
    ]);

    res.render("vwAccount/profile", {
      title: "Thông tin tài khoản - PetShop",
      user,
      stats: {
        orders: stats[0].count || 0,
        wishlist: stats[1].count || 0,
        cart: stats[2].count || 0
      }
    });
  } catch (error) {
    console.error("❌ PROFILE PAGE ERROR:", error);
    res.render("vwAccount/profile", {
      title: "Thông tin tài khoản - PetShop",
      user: req.session.user,
      stats: { orders: 0, wishlist: 0, cart: 0 }
    });
  }
});

// POST /account/profile/update - Cập nhật thông tin
router.post("/profile/update", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email, phone } = req.body;

    // Kiểm tra email đã tồn tại chưa (trừ chính user hiện tại)
    const existingUser = await db("users")
      .where("email", email)
      .whereNot("id", userId)
      .first();

    if (existingUser) {
      return res.json({ 
        success: false, 
        message: "Email đã được sử dụng bởi tài khoản khác" 
      });
    }

    // Cập nhật thông tin
    await db("users")
      .where("id", userId)
      .update({
        name,
        email, 
        phone,
        updated_at: new Date()
      });

    // Cập nhật session
    req.session.user.name = name;
    req.session.user.email = email;
    req.session.user.phone = phone;

    res.json({ 
      success: true, 
      message: "Cập nhật thông tin thành công" 
    });
  } catch (error) {
    console.error("❌ UPDATE PROFILE ERROR:", error);
    res.json({ 
      success: false, 
      message: "Có lỗi xảy ra khi cập nhật thông tin" 
    });
  }
});

// POST /account/profile/change-password - Đổi mật khẩu
router.post("/profile/change-password", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { current_password, new_password, confirm_password } = req.body;

    // Kiểm tra mật khẩu hiện tại
    const user = await db("users")
      .select("password")
      .where("id", userId)
      .first();

    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.json({ 
        success: false, 
        message: "Mật khẩu hiện tại không đúng" 
      });
    }

    // Kiểm tra mật khẩu mới
    if (new_password !== confirm_password) {
      return res.json({ 
        success: false, 
        message: "Mật khẩu xác nhận không khớp" 
      });
    }

    if (new_password.length < 6) {
      return res.json({ 
        success: false, 
        message: "Mật khẩu phải có ít nhất 6 ký tự" 
      });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Cập nhật mật khẩu
    await db("users")
      .where("id", userId)
      .update({
        password: hashedPassword,
        updated_at: new Date()
      });

    res.json({ 
      success: true, 
      message: "Đổi mật khẩu thành công" 
    });
  } catch (error) {
    console.error("❌ CHANGE PASSWORD ERROR:", error);
    res.json({ 
      success: false, 
      message: "Có lỗi xảy ra khi đổi mật khẩu" 
    });
  }
});
export default router;