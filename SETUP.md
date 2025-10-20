## 📁 CẤU TRÚC THƯ MỤC

- NOTE: Chỉ tham khảo, tên file/folder có thể khác. Đọc kỹ phần Hướng dẫn triển khai - Bước 1

```
pet-shop/
├── 📁 models/               # Data models & business logic
│   ├── User.js              # User operations
│   ├── Product.js           # Product operations
│   ├── Category.js          # Category operations
│   ├── Cart.js              # Cart operations
│   ├── Order.js             # Order operations
│   └── Review.js            # Review operations
├── 📁 utils/                # Core utilities
│   ├── database.js          # Knex connection & queries
│   ├── auth.js              # Authentication helpers
│   └── helpers.js           # Common functions
├── 📁 static/               # Static assets
│   ├── 📁 imgs/             # All images
│   │   ├── banners/         # Banner images
│   │   ├── products/        # Product images
│   │   ├── categories/      # Category images
│   │   ├── users/           # User avatars
│   │   └── logo/            # Logo files
│   ├── 📁 css/              # Stylesheets
│   └── 📁 js/               # JavaScript files
├── 📁 views/                # Template views
│   ├── 📁 layouts/          # Layout templates
│   ├── 📁 partials/         # Reusable components
│   ├── 📁 vwHome/           # Home module
│   ├── 📁 vwAuth/           # Auth module
│   ├── 📁 vwProducts/       # Products module
│   ├── 📁 vwCart/           # Cart module
│   ├── 📁 vwUser/           # User module
│   └── 📁 vwAdmin/          # Admin module
├── 📁 routes/               # Route handlers
├── 📁 middleware/           # Custom middleware
├── 📄 app.js               # Main application
└── 📄 .env                  # Environment variables

```

## 🎯 MODULE & CHỨC NĂNG

### **MODULE 1: TRANG CHỦ & PUBLIC**

**📁 routes/home.js**

```jsx
// Hướng dẫn thực hiện:
// 1. Sử dụng Product.findFeatured() lấy 8 sản phẩm nổi bật
// 2. Sử dụng Category.findAll() lấy 8 danh mục
// 3. Query banners từ bảng 'banners' (is_active=true)
// 4. Query new products (sort by created_at DESC, limit 8)
// 5. Render 'vwHome/index' với data
```

**Chức năng chính:**

- ✅ Hero slider với banners
- ✅ Danh mục nổi bật
- ✅ Sản phẩm featured & mới nhất
- ✅ Navigation với search

### **MODULE 2: XÁC THỰC**

**📁 routes/auth.js**

```jsx
// Hướng dẫn thực hiện:
// ĐĂNG KÝ:
// 1. Validate input (email, password, confirm)
// 2. Sử dụng User.create() tạo user mới
// 3. Hash password với bcryptjs
// 4. Generate JWT token & set cookie

// ĐĂNG NHẬP:
// 1. Sử dụng User.findByEmail() tìm user
// 2. Compare password với bcryptjs
// 3. Generate JWT token & set cookie
// 4. Redirect to homepage
```

**Chức năng chính:**

- ✅ Đăng ký tài khoản
- ✅ Đăng nhập/đăng xuất
- ✅ Remember me
- ✅ JWT session management

### **MODULE 3: SẢN PHẨM**

**📁 routes/products.js**

```jsx
// Hướng dẫn thực hiện:
// DANH SÁCH SẢN PHẨM:
// 1. Parse query params (category, price, rating, search)
// 2. Sử dụng Product.findAll() với filters
// 3. Pagination (limit 12 sản phẩm/trang)
// 4. Render 'vwProducts/list' với data

// CHI TIẾT SẢN PHẨM:
// 1. Sử dụng Product.findById() lấy product detail
// 2. Lấy product images từ 'product_images'
// 3. Lấy reviews từ 'reviews'
// 4. Sử dụng Product.findRelated() lấy sản phẩm liên quan
// 5. Render 'vwProducts/detail'
```

**Chức năng chính:**

- ✅ Danh sách sản phẩm với filter
- ✅ Tìm kiếm & sắp xếp
- ✅ Chi tiết sản phẩm với gallery
- ✅ Sản phẩm liên quan

### **MODULE 4: GIỎ HÀNG**

**📁 routes/cart.js**

```jsx
// Hướng dẫn thực hiện:
// THÊM VÀO GIỎ:
// 1. Kiểm tra user authentication
// 2. Validate productId & quantity
// 3. Sử dụng Cart.addItem() thêm vào giỏ hàng
// 4. Return JSON response

// XEM GIỎ HÀNG:
// 1. Sử dụng Cart.findByUserId() lấy cart items
// 2. Tính toán: subtotal, shipping, total
// 3. Render 'vwCart/index'

// CHECKOUT:
// 1. Validate shipping address
// 2. Sử dụng Order.create() tạo đơn hàng
// 3. Tạo order_items từ cart
// 4. Clear cart items
// 5. Redirect to confirmation
```

**Chức năng chính:**

- ✅ Thêm/xóa/sửa giỏ hàng
- ✅ Tính toán tự động
- ✅ Checkout process
- ✅ Payment methods (COD/bank)

### **MODULE 5: USER DASHBOARD**

**📁 routes/user.js**

```jsx
// Hướng dẫn thực hiện:
// PROFILE:
// 1. Sử dụng User.findById() lấy user info
// 2. Handle avatar upload
// 3. Sử dụng User.updateProfile() cập nhật data

// ORDERS:
// 1. Sử dụng Order.findByUserId() lấy orders của user
// 2. Hiển thị order history
// 3. Order details với 'order_items'

// ADDRESSES:
// 1. CRUD operations cho 'addresses'
// 2. Set default address
```

**Chức năng chính:**

- ✅ Quản lý profile
- ✅ Lịch sử đơn hàng
- ✅ Quản lý địa chỉ
- ✅ Đổi mật khẩu

### **MODULE 6: ADMIN DASHBOARD**

**📁 routes/admin.js**

```jsx
// Hướng dẫn thực hiện:
// DASHBOARD:
// 1. Query stats: revenue, orders, users, products
// 2. Recent orders & low stock alerts
// 3. Render 'vwAdmin/dashboard'

// PRODUCT MANAGEMENT:
// 1. Sử dụng Product model CRUD operations
// 2. Image upload với Multer
// 3. Inventory management

// ORDER MANAGEMENT:
// 1. View all orders với filters
// 2. Update order status
// 3. Order details
```

**Chức năng chính:**

- ✅ Dashboard thống kê
- ✅ Quản lý sản phẩm
- ✅ Quản lý đơn hàng
- ✅ Quản lý người dùng

## 🚀 HƯỚNG DẪN TRIỂN KHAI NHANH

### **BƯỚC 1: SETUP DỰ ÁN**

- Bỏ qua cái này

```bash
# Tạo project & cài dependencies
mkdir pet-shop && cd pet-shop
npm init -y
npm install express express-handlebars knex pg bcryptjs jsonwebtoken cookie-parser dotenv

# Tạo cấu trúc thư mục
mkdir -p models utils static/{imgs/{banners,products,categories,users,logo},css,js}
mkdir -p views/{layouts,partials,vwHome,vwAuth,vwProducts,vwCart,vwUser,vwAdmin}
mkdir -p routes middleware

```

- Chỉ cần:

1. Clone dự án về:

```bash
https://github.com/trang3205/pet-shop.git
```

2. Khởi chạy lại dự án:

```bash
npm install
```

3. Chuyển sang nhánh cá nhân:

```jsx
git checkout <tên nhánh cần đến>
```

4. Sau khi làm xong:

```jsx
git add .
//thêm tất cả các file mới tạo, file đã sửa
//hoặc dùng
git add <tên file>
//VD: git add app.js  (thêm các file cụ thể)

git commit -m "<thêm mô tả ngắn gọn (VD: Thêm chức năng ...)>"

git push -u origin <tên nhánh hiện đang làm việc> //chỉ cần lần đầu, các lần sau có thể dùng: git push
```

### **BƯỚC 2: CẤU HÌNH KNEX & CORE FILES**

- Bỏ qua phần này

```jsx
// 📄 .env
DB_HOST = your_db_host;
DB_PORT = 5432;
DB_NAME = your_db_name;
DB_USER = your_db_user;
DB_PASSWORD = your_db_password;
JWT_SECRET = your_jwt_secret;
NODE_ENV = development;

// 📁 utils/database.js
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  },
});

module.exports = knex;

// 📄 app.js
const express = require("express");
const exphbs = require("express-handlebars");
const app = express();

app.engine("hbs", exphbs.engine({ extname: ".hbs" }));
app.set("view engine", "hbs");
app.use(express.static("static"));

// Routes
app.use("/", require("./routes/home"));
app.use("/auth", require("./routes/auth"));
app.use("/products", require("./routes/products"));
app.use("/cart", require("./routes/cart"));
app.use("/user", require("./routes/user"));
app.use("/admin", require("./routes/admin"));

app.listen(3000, () => console.log("Server running on port 3000"));
```

### **BƯỚC 3: TẠO MODELS VỚI KNEX**

```jsx
// 📁 models/Product.js
const knex = require("../utils/database");

class Product {
  static async findAll(filters = {}) {
    let query = knex("products")
      .select("products.*", "categories.name as category_name")
      .leftJoin("categories", "products.category_id", "categories.id")
      .where("products.is_active", true);

    // Áp dụng filters
    if (filters.category) {
      query = query.where("products.category_id", filters.category);
    }
    if (filters.search) {
      query = query.where("products.name", "ilike", `%${filters.search}%`);
    }
    if (filters.minPrice) {
      query = query.where("products.price", ">=", filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.where("products.price", "<=", filters.maxPrice);
    }

    // Pagination
    if (filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.limit(filters.limit).offset(offset);
    }

    return await query;
  }

  static async findById(id) {
    const product = await knex("products")
      .select("products.*", "categories.name as category_name")
      .leftJoin("categories", "products.category_id", "categories.id")
      .where("products.id", id)
      .where("products.is_active", true)
      .first();

    if (product) {
      // Lấy images
      product.images = await knex("product_images")
        .where("product_id", id)
        .orderBy("sort_order");

      // Lấy reviews
      product.reviews = await knex("reviews")
        .select("reviews.*", "users.name as user_name")
        .leftJoin("users", "reviews.user_id", "users.id")
        .where("reviews.product_id", id)
        .where("reviews.status", "approved");
    }

    return product;
  }
}

module.exports = Product;
```

```jsx
// 📁 models/User.js
const knex = require("../utils/database");
const { hashPassword, comparePassword } = require("../utils/auth");

class User {
  static async create(userData) {
    const { email, password, name, phone } = userData;
    const hashedPassword = await hashPassword(password);

    const [user] = await knex("users")
      .insert({
        email,
        password: hashedPassword,
        name,
        phone,
        avatar_url: "/static/imgs/users/default-avatar.jpg",
      })
      .returning("*");

    return user;
  }

  static async findByEmail(email) {
    return await knex("users")
      .where("email", email)
      .where("is_active", true)
      .first();
  }

  static async findById(id) {
    return await knex("users")
      .select("id", "email", "name", "role", "avatar_url", "is_active")
      .where("id", id)
      .first();
  }
}

module.exports = User;
```

```jsx
// 📁 models/Cart.js
const knex = require("../utils/database");

class Cart {
  static async findByUserId(userId) {
    return await knex("cart_items")
      .select(
        "cart_items.*",
        "products.name",
        "products.price",
        "products.main_image_url",
        "products.stock_quantity",
        "products.sku"
      )
      .leftJoin("products", "cart_items.product_id", "products.id")
      .where("cart_items.user_id", userId);
  }

  static async addItem(userId, productId, quantity = 1) {
    // Kiểm tra nếu item đã tồn tại
    const existingItem = await knex("cart_items")
      .where("user_id", userId)
      .where("product_id", productId)
      .first();

    if (existingItem) {
      // Update quantity
      return await knex("cart_items")
        .where("user_id", userId)
        .where("product_id", productId)
        .update({
          quantity: existingItem.quantity + quantity,
          updated_at: knex.fn.now(),
        });
    } else {
      // Insert new item
      return await knex("cart_items").insert({
        user_id: userId,
        product_id: productId,
        quantity: quantity,
      });
    }
  }
}

module.exports = Cart;
```

### **BƯỚC 4: TRIỂN KHAI THEO THỨ TỰ**

**Tuần 1: Core System**

```bash
1. Setup Knex connection & models ✅
2. Authentication system ✅
3. Homepage với banners ✅
4. Basic product listing ✅

```

**Tuần 2: Shopping Features**

```bash
5. Product detail pages ✅
6. Shopping cart ✅
7. Checkout process ✅
8. User registration ✅

```

**Tuần 3: User Management**

```bash
9. User dashboard ✅
10. Order history ✅
11. Profile management ✅
12. Admin panel ✅

```

**Tuần 4: Enhancement**

```bash
13. Search & filters ✅
14. Payment integration ✅
15. Email notifications ✅
16. Performance optimization ✅

```

## 🔧 KNEX QUERIES MẪU

### **Basic Queries**

```jsx
// SELECT với WHERE
const users = await knex("users")
  .where("is_active", true)
  .where("role", "customer");

// INSERT
const [newProduct] = await knex("products").insert(productData).returning("*");

// UPDATE
await knex("products")
  .where("id", productId)
  .update({ stock_quantity: newQuantity });

// DELETE
await knex("cart_items")
  .where("user_id", userId)
  .where("product_id", productId)
  .delete();
```

### **Advanced Queries**

```jsx
// JOIN queries
const orders = await knex("orders")
  .select(
    "orders.*",
    "users.name as customer_name",
    "users.email as customer_email"
  )
  .leftJoin("users", "orders.user_id", "users.id")
  .where("orders.order_status", "completed");

// Aggregation
const stats = await knex("orders")
  .where("created_at", ">=", startDate)
  .sum("total_amount as revenue")
  .count("id as total_orders")
  .first();

// Pagination
const products = await knex("products")
  .where("is_active", true)
  .limit(12)
  .offset((page - 1) * 12)
  .orderBy("created_at", "desc");
```

## 🎯 LỢI ÍCH KHI DÙNG KNEX

1. **Query Builder** - Viết SQL dễ dàng hơn
2. **Database Agnostic** - Hỗ trợ nhiều database
3. **Migrations** - Quản lý schema changes
4. **Transactions** - Xử lý complex operations
5. **Security** - Tránh SQL injection

## 📋 CHECKLIST HOÀN THÀNH

- [ ] **Module 1:** Homepage & Navigation
- [ ] **Module 2:** User Authentication
- [ ] **Module 3:** Product Catalog
- [ ] **Module 4:** Shopping Cart
- [ ] **Module 5:** Checkout Process
- [ ] **Module 6:** User Dashboard
- [ ] **Module 7:** Admin Panel
- [ ] **Module 8:** Payment Integration
- [ ] **Module 9:** Email Notifications
- [ ] **Module 10:** Search & Filters
