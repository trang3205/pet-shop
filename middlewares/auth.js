// middlewares/auth.js

// Middleware xác thực người dùng (cho tất cả routes)
export function authenticateUser(req, res, next) {
  console.log('🔍 AUTHENTICATE MIDDLEWARE - Session exists:', !!req.session);
  console.log('🔍 AUTHENTICATE MIDDLEWARE - Session user:', req.session?.user);
  
  // Kiểm tra session tồn tại trước khi truy cập user
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    console.log('✅ USER AUTHENTICATED:', req.session.user.name);
  } else {
    res.locals.user = null;
    console.log('❌ NO USER IN SESSION');
  }
  next();
}

// Middleware lấy số lượng giỏ hàng
export async function getCartCount(req, res, next) {
  try {
    if (req.session && req.session.user) {
      const db = await import('../utils/db.js');
      const result = await db.default('cart_items')
        .where('user_id', req.session.user.id)
        .count('id as count')
        .first();
      res.locals.cartItemsCount = result?.count || 0;
      console.log('🛒 CART COUNT:', res.locals.cartItemsCount);
    } else {
      res.locals.cartItemsCount = 0;
      console.log('🛒 NO CART - User not logged in');
    }
  } catch (error) {
    console.error('Error getting cart count:', error);
    res.locals.cartItemsCount = 0;
  }
  next();
}

// Yêu cầu đăng nhập
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/account/login');
  }
  next();
}

// Yêu cầu chưa đăng nhập (cho login/register)
export function requireGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  next();
}

// Kiểm tra quyền Admin
export function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('404', { 
      title: 'Truy cập bị từ chối',
      message: 'Bạn không có quyền truy cập trang này.' 
    });
  }
  next();
}

// Kiểm tra quyền Staff
export function requireStaff(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'staff') {
    return res.status(403).render('404', { 
      title: 'Truy cập bị từ chối',
      message: 'Bạn không có quyền truy cập trang này.' 
    });
  }
  next();
}

// Kiểm tra quyền Customer
export function requireCustomer(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'customer') {
    return res.status(403).render('404', { 
      title: 'Truy cập bị từ chối',
      message: 'Bạn không có quyền truy cập trang này.' 
    });
  }
  next();
}

// Cho phép Admin hoặc Staff
export function requireAdminOrStaff(req, res, next) {
  if (!req.session || !req.session.user || !['admin', 'staff'].includes(req.session.user.role)) {
    return res.status(403).render('404', { 
      title: 'Truy cập bị từ chối',
      message: 'Bạn không có quyền truy cập trang này.' 
    });
  }
  next();
}