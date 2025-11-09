import "dotenv/config";
import express from "express";
import { engine } from "express-handlebars";
import hbs_sections from "express-handlebars-sections";
import session from "express-session";
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import homeRouter from './routes/home.route.js';
import productRouter from './routes/product.route.js';
import accountRoute from './routes/account.route.js';
import categoryRouter from './routes/category.route.js';
import wishlistRouter from './routes/wishlist.route.js';
import cartRouter from './routes/cart.route.js';
// Middlewares
import {
  authenticateUser,
  getCartCount,
  getCategories,
  getWishlistCount
} from './middlewares/auth.js';

// QUAN TRỌNG: Import db.js để khởi tạo kết nối database
import './utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ======================
// TRUST PROXY SETTING
// ======================
app.set("trust proxy", 1);

// ======================
// SESSION CONFIGURATION
// ======================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// ======================
// HANDLEBARS CONFIGURATION
// ======================
app.engine(
  "handlebars",
  engine({
    helpers: {
      fill_section: hbs_sections(),
      formatNumber(value) {
        return new Intl.NumberFormat("en-US").format(value);
      },
      ifEqual(a, b, options) {
        return a === b ? options.fn(this) : options.inverse(this);
      },
      formatCurrency(amount) {
        if (!amount) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(amount);
      },
      formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      },
      arrayRange(count) {
        const arr = [];
        for (let i = 1; i <= count; i++) {
          arr.push(i);
        }
        return arr;
      },
      // Helper để thêm divider sau mỗi 2 category (tuỳ chỉnh được)
      ifDivider: function (index, categories, options) {
        // Thêm divider sau category thứ 2 và thứ 4
        // Có thể điều chỉnh theo số lượng categories bạn muốn
        const dividerPositions = [1, 3]; // Sau item thứ 2 và thứ 4 (0-based index)
        return dividerPositions.includes(index) ? options.fn(this) : options.inverse(this);
      },
      // Helper cho pagination
      subtract: function (a, b) {
        return a - b;
      },
      add: function (a, b) {
        return a + b;
      },
      // Helper cho reviews - FIXED VERSION
      ifGreater: function (a, b, options) {
        if (b === undefined || b === null) return options.inverse(this);
        return a > b ? options.fn(this) : options.inverse(this);
      },

      getRatingStats: function (rating, stats) {
        // Kiểm tra nếu stats không tồn tại hoặc không có reviews
        if (!stats || !stats.total_reviews || stats.total_reviews === 0) {
          return { count: 0, percentage: 0 };
        }

        const ratingsMap = {
          5: { count: stats.rating_5 || 0, percentage: ((stats.rating_5 || 0) / stats.total_reviews) * 100 },
          4: { count: stats.rating_4 || 0, percentage: ((stats.rating_4 || 0) / stats.total_reviews) * 100 },
          3: { count: stats.rating_3 || 0, percentage: ((stats.rating_3 || 0) / stats.total_reviews) * 100 },
          2: { count: stats.rating_2 || 0, percentage: ((stats.rating_2 || 0) / stats.total_reviews) * 100 },
          1: { count: stats.rating_1 || 0, percentage: ((stats.rating_1 || 0) / stats.total_reviews) * 100 }
        };

        return ratingsMap[6 - rating] || { count: 0, percentage: 0 };
      },
      // Helper để set giá trị mặc định
      default: function (value, defaultValue) {
        return value !== undefined && value !== null ? value : defaultValue;
      },
      multiply: function (a, b) {
        return a * b;
      },
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", "./views");

// ======================
// STATIC FILES & MIDDLEWARE
// ======================
app.use("/static", express.static("static"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// ======================
// CUSTOM MIDDLEWARES - QUAN TRỌNG: ĐẶT SAU TẤT CẢ CONFIG
// ======================
app.use(authenticateUser);
app.use(getCartCount);
app.use(getCategories);
app.use(getWishlistCount);
// ======================
// DEBUG MIDDLEWARE - XÓA SAU KHI FIX
// ======================
app.use((req, res, next) => {
   // Tạo CSRF token cho mỗi request
    res.locals.csrfToken = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
    
    console.log('🔍 DEBUG MIDDLEWARE - res.locals.user:', res.locals.user);
    console.log('🛡️ CSRF Token generated:', res.locals.csrfToken);
    next();
});

// ======================
// ROUTES SETUP
// ======================
app.use('/', homeRouter);
app.use('/categories', categoryRouter);
app.use('/products', productRouter);
app.use('/account', accountRoute);
app.use('/user', wishlistRouter);
app.use('/cart', cartRouter);
// ======================
// 404 ERROR HANDLER
// ======================
app.use((req, res) => {

  res.status(404).render('404', {
    title: 'Không tìm thấy trang'
  });
});

// ======================
// START SERVER
// ======================
app.listen(3000, function () {
  console.log("Server is running on port 3000");
});