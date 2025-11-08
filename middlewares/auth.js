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
// middlewares/auth.js - cập nhật hàm getCartCount
export async function getCartCount(req, res, next) {
  try {
    if (req.session && req.session.user) {
      const CartModel = await import('../models/cart.model.js');
      const count = await CartModel.default.getItemsCount(req.session.user.id);
      res.locals.cartItemsCount = count;
      console.log('CART COUNT:', res.locals.cartItemsCount);
    } else {
      res.locals.cartItemsCount = 0;
      console.log('NO CART - User not logged in');
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

export async function getCategories(req, res, next) {
  try {
    const CategoryModel = await import('../models/category.model.js');
    const categories = await CategoryModel.default.findAllActive();
    
    res.locals.categories = categories;
    console.log('📂 CATEGORIES LOADED:', categories.length, 'categories');
  } catch (error) {
    console.error('Error getting categories:', error);
    res.locals.categories = [];
  }
  next();
}

// Thêm vào middlewares/auth.js - ở cuối file
export const getWishlistCount = async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      const db = await import('../utils/db.js');
      const wishlistCount = await db.default("wishlists")
        .where("user_id", req.session.user.id)
        .count('* as count')
        .first();
      
      res.locals.wishlistCount = parseInt(wishlistCount.count, 10) || 0;
      console.log(' WISHLIST COUNT:', res.locals.wishlistCount);
    } else {
      res.locals.wishlistCount = 0;
    }
  } catch (error) {
    console.error("Error getting wishlist count:", error);
    res.locals.wishlistCount = 0;
  }
  next();
};