# 📧 Hướng dẫn thêm cột Email vào Shop Settings

## ⚡ Quick Start

### Bước 1: Thêm cột email vào Supabase

1. **Đăng nhập Supabase Dashboard**

   - Truy cập: https://supabase.com/dashboard
   - Chọn project **pet-shop**

2. **Mở SQL Editor**

   - Click **SQL Editor** ở menu bên trái
   - Click nút **New Query**

3. **Chạy SQL migration**

   ```sql
   ALTER TABLE shop_settings
   ADD COLUMN IF NOT EXISTS email VARCHAR(255);
   ```

   - Copy-paste query trên
   - Nhấn **Run** hoặc **Ctrl + Enter**
   - Chờ kết quả "Success" ✅

4. **Kiểm tra cột được thêm**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name='shop_settings'
   ORDER BY ordinal_position;
   ```

---

## 📋 Cấu trúc bảng shop_settings (Sau khi update)

| Column         | Type             | Notes                |
| -------------- | ---------------- | -------------------- |
| id             | SERIAL           | Primary Key          |
| name           | VARCHAR(255)     | Shop name            |
| phone          | VARCHAR(20)      | Shop phone (NEW)     |
| **email**      | **VARCHAR(255)** | **Shop email (NEW)** |
| street_address | TEXT             | Address              |
| province       | VARCHAR(100)     | Province             |
| district       | VARCHAR(100)     | District             |
| ward           | VARCHAR(100)     | Ward                 |
| logo           | VARCHAR(255)     | Logo path            |
| created_at     | TIMESTAMP        | Created date         |
| updated_at     | TIMESTAMP        | Updated date         |

---

## 🖥️ Admin Panel - Cách sử dụng

1. **Đăng nhập Admin**

   - URL: `http://localhost:3000/admin/login`
   - Login với tài khoản admin

2. **Vào Shop Settings**

   - Click sidebar → **Shop Settings**
   - Nhập/sửa email
   - Bấm **Save Settings**

3. **Kết quả**
   - Email được lưu vào Supabase
   - Email tự động hiển thị trên:
     - ✅ Footer (tất cả pages)
     - ✅ Contact page
     - ✅ Shipping policy page

---

## 🔗 Nơi hiển thị Email

### 1. Footer (main.handlebars)

```
Liên hệ
├── Địa chỉ: [address]
├── Hotline: [phone]
├── Email: [shop.email] ← ĐÂY
└── Giờ: 8:00 - 22:00
```

### 2. Contact Page (contact.handlebars)

```
Email card
├── Icon: 📧
├── Title: Email
├── Email: [shop.email] ← ĐÂY
└── Note: Phản hồi trong vòng 24 giờ
```

### 3. Shipping Policy (shipping.handlebars)

```
Help Card - Thông tin liên hệ
├── Hotline: [phone]
├── Email: [shop.email] ← ĐÂY
└── Giờ: 8:00 - 22:00
```

---

## 🛠️ Code thay đổi

### Admin Route (routes/admin.route.js)

```javascript
// GET - Hiển thị form
protectedRoutes.get('/shop-settings', async (req, res) => {
    let shop = { id: 1, name: 'PetShop', phone: '', email: '', ... };
    // ...
});

// POST - Lưu data
protectedRoutes.post('/shop-settings/update', async (req, res) => {
    const { name, phone, email, street_address, ... } = req.body;
    const updateData = { name, phone, email, street_address, ... };
    // Lưu vào shop_settings
});
```

### View - Shop Settings Form (views/vwAdmin/shop-settings.handlebars)

```html
<div class="mb-3">
  <label class="form-label">Email</label>
  <input
    type="email"
    name="email"
    class="form-control"
    value="{{shop.email}}"
  />
</div>
```

---

## ✅ Checklist

- [ ] Thêm cột email vào Supabase (SQL query)
- [ ] Kiểm tra cột được thêm thành công
- [ ] Admin vào Shop Settings
- [ ] Nhập email test
- [ ] Bấm Save Settings
- [ ] Kiểm tra email hiển thị ở footer
- [ ] Kiểm tra email hiển thị ở contact page
- [ ] Kiểm tra email hiển thị ở shipping page

---

## 🐛 Troubleshooting

**Q: SQL query báo lỗi?**

- A: Kiểm tra bảng shop_settings tồn tại
- Nếu chưa tạo, chạy: `create-shop-settings.sql`

**Q: Email không lưu?**

- A: Kiểm tra:
  1. Cột email tồn tại trong Supabase ✓
  2. Admin page hiển thị email input ✓
  3. Save button gửi POST request ✓
  4. Database lưu thành công ✓

**Q: Email không hiển thị ở pages?**

- A: Kiểm tra:
  1. `{{shop.email}}` có trong templates ✓
  2. Middleware getShopInfo lấy được email ✓
  3. Clear cache/reload page ✓

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra browser console (F12) có error không
2. Kiểm tra server logs (terminal)
3. Kiểm tra Supabase SQL query history
4. Test trực tiếp SQL query trên Supabase
