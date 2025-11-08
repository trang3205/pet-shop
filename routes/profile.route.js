// routes/profile.route.js
import express from "express";
import db from "../utils/db.js";
import { authenticateUser, requireAuth } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";

const router = express.Router();

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