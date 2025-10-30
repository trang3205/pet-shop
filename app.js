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
// Middlewares
import { 
  authenticateUser, 
  getCartCount 
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
      arrayRange(count) {
        const arr = [];
        for (let i = 1; i <= count; i++) {
          arr.push(i);
        }
        return arr;
      }
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", "./views");

// ======================
// STATIC FILES & MIDDLEWARE
// ======================
app.use("/static", express.static("static"));
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

// ======================
// DEBUG MIDDLEWARE - XÓA SAU KHI FIX
// ======================
app.use((req, res, next) => {
  console.log('🔍 DEBUG MIDDLEWARE - res.locals.user:', res.locals.user);
  next();
});

// ======================
// ROUTES SETUP
// ======================
app.use('/', homeRouter);
app.use('/products', productRouter);
app.use('/account', accountRoute);

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