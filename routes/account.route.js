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

// GET /account/orders - Trang đơn hàng của tôi
router.get("/orders", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    console.log(`📦 Loading orders for user ${userId}`);
    
    // Lấy tất cả đơn hàng của user
    const orders = await db('orders')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    
    // Format orders data và lấy thông tin chi tiết
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      // Parse shipping address
      let shippingAddress = {};
      try {
        shippingAddress = typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address;
      } catch (e) {
        console.error('Error parsing shipping address:', e);
        shippingAddress = {};
      }

      // Lấy số lượng sản phẩm trong đơn hàng
      const itemCount = await db('order_items')
        .where('order_id', order.id)
        .count('* as count')
        .first();

      // Lấy tổng số lượng sản phẩm (tính cả quantity)
      const totalItems = await db('order_items')
        .where('order_id', order.id)
        .sum('quantity as total')
        .first();

      // Lấy ảnh sản phẩm đầu tiên để hiển thị
      const firstItem = await db('order_items')
        .where('order_id', order.id)
        .select('product_image_url')
        .first();

      return {
        ...order,
        shipping_address: shippingAddress,
        item_count: parseInt(itemCount?.count) || 0,
        total_items: parseInt(totalItems?.total) || 0,
        first_image: firstItem?.product_image_url || '/static/imgs/products/default.jpg',
        canReview: order.order_status === 'delivered' || order.order_status === 'completed',
        created_at_formatted: new Date(order.created_at).toLocaleDateString('vi-VN'),
        status_badge_class: getStatusBadgeClass(order.order_status),
        status_text: getStatusText(order.order_status)
      };
    }));

    res.render("vwAccount/orders", {
      title: "Đơn hàng của tôi - PetShop",
      orders: formattedOrders,
      user: req.session.user
    });
  } catch (error) {
    console.error("❌ ORDERS PAGE ERROR:", error);
    res.render("vwAccount/orders", {
      title: "Đơn hàng của tôi - PetShop",
      orders: [],
      user: req.session.user,
      error: "Có lỗi xảy ra khi tải danh sách đơn hàng"
    });
  }
});

// GET /account/orders/:id - Chi tiết đơn hàng
router.get("/orders/:id", authenticateUser, requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user.id;
    
    console.log(`📋 Loading order detail: ${orderId} for user ${userId}`);
    
    // Lấy thông tin đơn hàng
    const order = await db('orders')
      .where('id', orderId)
      .where('user_id', userId)
      .first();

    if (!order) {
      console.log(`❌ Order ${orderId} not found for user ${userId}`);
      return res.status(404).render("404", {
        title: "Không tìm thấy đơn hàng - PetShop",
        message: "Đơn hàng không tồn tại hoặc bạn không có quyền truy cập"
      });
    }

    // Lấy chi tiết sản phẩm trong đơn hàng
    const orderItems = await db('order_items')
      .where('order_id', orderId)
      .select('*');

    console.log(`✅ Found ${orderItems.length} items in order ${orderId}`);

    // Parse shipping address
    let shippingAddress = {};
    try {
      shippingAddress = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address;
    } catch (e) {
      console.error('Error parsing shipping address:', e);
      shippingAddress = {};
    }

    // Kiểm tra điều kiện đánh giá (chỉ cho phép đánh giá khi đã giao hàng)
    const canReview = order.order_status === 'delivered' || order.order_status === 'completed';

    // Kiểm tra xem sản phẩm đã được đánh giá chưa
    const itemsWithReviewStatus = await Promise.all(
      orderItems.map(async (item) => {
        const existingReview = await db('reviews')
          .where('user_id', userId)
          .where('product_id', item.product_id)
          .where('order_item_id', item.id)
          .first();

        return {
          ...item,
          can_review: canReview && !existingReview,
          has_reviewed: !!existingReview,
          review_id: existingReview?.id,
          review_rating: existingReview?.rating
        };
      })
    );

    res.render("vwAccount/order-detail", {
      title: `Chi tiết đơn hàng ${order.order_number} - PetShop`,
      order: {
        ...order,
        shipping_address: shippingAddress,
        created_at_formatted: new Date(order.created_at).toLocaleDateString('vi-VN'),
        status_text: getStatusText(order.order_status),
        status_badge_class: getStatusBadgeClass(order.order_status)
      },
      orderItems: itemsWithReviewStatus,
      canReview,
      user: req.session.user
    });
  } catch (error) {
    console.error("❌ ORDER DETAIL ERROR:", error);
    res.status(500).render("404", {
      title: "Lỗi hệ thống - PetShop",
      message: "Có lỗi xảy ra khi tải chi tiết đơn hàng"
    });
  }
});

// ======================
// REVIEW ROUTES
// ======================

// GET /account/reviews - Trang đánh giá của tôi
router.get("/reviews", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const reviews = await db('reviews')
      .select(
        'reviews.*',
        'products.name as product_name',
        'products.main_image_url as product_image',
        'products.slug as product_slug'
      )
      .leftJoin('products', 'reviews.product_id', 'products.id')
      .where('reviews.user_id', userId)
      .orderBy('reviews.created_at', 'desc');

    res.render("vwAccount/reviews", {
      title: "Đánh giá của tôi - PetShop",
      reviews,
      user: req.session.user
    });
  } catch (error) {
    console.error("❌ REVIEWS PAGE ERROR:", error);
    res.render("vwAccount/reviews", {
      title: "Đánh giá của tôi - PetShop",
      reviews: [],
      user: req.session.user
    });
  }
});

// POST /account/reviews - Xử lý gửi đánh giá
router.post("/reviews", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { order_item_id, product_id, product_name, rating, comment } = req.body;

    console.log('📝 SUBMITTING REVIEW:', { 
      userId, 
      order_item_id, 
      product_id, 
      rating,
      comment 
    });

    // Validation
    if (!order_item_id || !product_id || !rating) {
      console.log('❌ VALIDATION FAILED: Missing required fields');
      return res.json({ 
        success: false, 
        message: "Vui lòng chọn đánh giá sao và điền đầy đủ thông tin" 
      });
    }

    // Kiểm tra xem user có quyền đánh giá sản phẩm này không
    const orderItem = await db('order_items')
      .select(
        'order_items.*',
        'orders.user_id',
        'orders.order_status'
      )
      .leftJoin('orders', 'order_items.order_id', 'orders.id')
      .where('order_items.id', order_item_id)
      .where('orders.user_id', userId)
      .first();

    console.log('🔍 ORDER ITEM CHECK:', orderItem);

    if (!orderItem) {
      console.log('❌ ORDER ITEM NOT FOUND OR NOT OWNED BY USER');
      return res.json({ 
        success: false, 
        message: "Không tìm thấy sản phẩm trong đơn hàng của bạn" 
      });
    }

    // Kiểm tra đơn hàng đã được giao chưa
    if (orderItem.order_status !== 'delivered' && orderItem.order_status !== 'completed') {
      console.log('❌ ORDER NOT DELIVERED:', orderItem.order_status);
      return res.json({ 
        success: false, 
        message: "Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao" 
      });
    }

    // Kiểm tra xem đã đánh giá chưa
    const existingReview = await db('reviews')
      .where('user_id', userId)
      .where('order_item_id', order_item_id)
      .first();

    if (existingReview) {
      console.log('❌ REVIEW ALREADY EXISTS:', existingReview.id);
      return res.json({ 
        success: false, 
        message: "Bạn đã đánh giá sản phẩm này rồi" 
      });
    }

    // ✅ FIX: Không dùng transaction vì đã có trigger tự động update
    // Tạo đánh giá mới
    const [newReview] = await db('reviews')
      .insert({
        user_id: userId,
        product_id: product_id,
        order_item_id: order_item_id,
        rating: parseInt(rating),
        title: comment ? `Đánh giá cho ${product_name}` : `Đánh giá ${rating} sao cho ${product_name}`,
        comment: comment || '',
        is_verified_purchase: true,
        status: 'approved', // Tự động approve cho user đã mua
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    console.log('✅ REVIEW CREATED:', newReview.id);
    console.log('✅ TRIGGER WILL AUTOMATICALLY UPDATE PRODUCT RATING');

    // ✅ KHÔNG cần gọi updateProductRating thủ công vì trigger đã xử lý

    res.json({ 
      success: true, 
      message: "Cảm ơn bạn đã đánh giá sản phẩm!",
      review_id: newReview.id
    });

  } catch (error) {
    console.error("❌ SUBMIT REVIEW ERROR:", error);
    console.error("❌ ERROR DETAILS:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Kiểm tra lỗi constraint
    if (error.code === '23505') { // unique_violation
      return res.json({ 
        success: false, 
        message: "Bạn đã đánh giá sản phẩm này rồi" 
      });
    }
    
    res.json({ 
      success: false, 
      message: "Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại." 
    });
  }
});

// ======================
// HELPER FUNCTIONS
// ======================

// Helper function để lấy class badge cho status
function getStatusBadgeClass(status) {
  const statusClasses = {
    'pending': 'bg-secondary',
    'confirmed': 'bg-info',
    'processing': 'bg-primary',
    'shipping': 'bg-warning',
    'delivered': 'bg-success',
    'completed': 'bg-success',
    'cancelled': 'bg-danger'
  };
  return statusClasses[status] || 'bg-secondary';
}

// Helper function để lấy text cho status
function getStatusText(status) {
  const statusTexts = {
    'pending': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'processing': 'Đang xử lý',
    'shipping': 'Đang giao hàng',
    'delivered': 'Đã giao hàng',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy'
  };
  return statusTexts[status] || status;
}



export default router;