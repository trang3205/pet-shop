# Hướng dẫn thêm cột Email vào Shop Settings

## Phương pháp 1: Sử dụng Supabase SQL Editor (Dễ nhất)

1. Đăng nhập vào Supabase: https://supabase.com/dashboard
2. Chọn project PetShop
3. Vào **SQL Editor** ở bên trái
4. Nhấn **New Query**
5. Copy-paste đoạn SQL dưới đây:

```sql
-- Add email column to shop_settings table
ALTER TABLE shop_settings
ADD COLUMN IF NOT EXISTS email VARCHAR(255);
```

6. Nhấn **Run** (Ctrl + Enter)
7. Xong! Cột email đã được thêm vào table

---

## Kiểm tra kết quả

Chạy query này để xem cột email:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='shop_settings'
ORDER BY ordinal_position;
```

---

## Phương pháp 2: Qua pgAdmin (nếu có)

Tương tự như SQL Editor nhưng dùng interface pgAdmin

---

## Sau khi thêm cột:

- Admin vào Shop Settings
- Nhập email
- Bấm Save
- Email sẽ được lưu vào Supabase
- Email tự động hiển thị ở Footer, Contact, Shipping pages
