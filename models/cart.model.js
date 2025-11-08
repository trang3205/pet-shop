// models/cart.model.js - PHIÊN BẢN ĐÃ SỬA LỖI
import db from "../utils/db.js";

export default {
  // Lấy tất cả items trong giỏ hàng của user
  async findByUserId(userId) {
    try {
      console.log('🛒 FINDING CART ITEMS FOR USER:', userId);
      
      const items = await db("cart_items")
        .select(
          "cart_items.id",
          "cart_items.user_id",
          "cart_items.product_id", 
          "cart_items.quantity",
          "cart_items.created_at",
          "cart_items.updated_at",
          "products.name",
          "products.price",
          "products.discount_price",
          "products.main_image_url",
          "products.stock_quantity",
          "products.sku",
          "products.is_active"
        )
        .leftJoin("products", "cart_items.product_id", "products.id")
        .where("cart_items.user_id", userId)
        .where("products.is_active", true)
        .orderBy("cart_items.created_at", "desc");

      console.log('🛒 FOUND CART ITEMS:', items.length);
      return items;
    } catch (error) {
      console.error("❌ Find cart by user id error:", error);
      return [];
    }
  },

  // Thêm sản phẩm vào giỏ hàng - PHIÊN BẢN ĐÃ SỬA
  async addItem(userId, productId, quantity = 1) {
    try {
      console.log('🛒 ADDING TO CART - User:', userId, 'Product:', productId, 'Qty:', quantity);

      // Kiểm tra sản phẩm tồn tại và còn hàng
      const product = await db("products")
        .where("id", productId)
        .where("is_active", true)
        .first();

      if (!product) {
        throw new Error("Sản phẩm không tồn tại");
      }

      console.log('📦 PRODUCT FOUND:', product.name, 'Stock:', product.stock_quantity);

      if (product.stock_quantity < quantity) {
        throw new Error(`Số lượng sản phẩm trong kho không đủ. Chỉ còn ${product.stock_quantity} sản phẩm`);
      }

      // Kiểm tra nếu item đã tồn tại trong giỏ hàng
      const existingItem = await db("cart_items")
        .where("user_id", userId)
        .where("product_id", productId)
        .first();

      if (existingItem) {
        console.log('📝 UPDATING EXISTING CART ITEM');
        // Update quantity nếu đã tồn tại
        const newQuantity = existingItem.quantity + quantity;
        
        if (newQuantity > product.stock_quantity) {
          throw new Error(`Chỉ còn ${product.stock_quantity} sản phẩm trong kho`);
        }

        const result = await db("cart_items")
          .where("user_id", userId)
          .where("product_id", productId)
          .update({
            quantity: newQuantity,
            updated_at: db.fn.now(),
          });

        console.log('✅ CART ITEM UPDATED:', result);
        return { action: "updated", quantity: newQuantity };
      } else {
        console.log('🆕 ADDING NEW CART ITEM');
        // Thêm mới item
        const result = await db("cart_items").insert({
          user_id: userId,
          product_id: productId,
          quantity: quantity,
        });

        console.log('✅ NEW CART ITEM ADDED:', result);
        return { action: "added", quantity: quantity };
      }
    } catch (error) {
      console.error("❌ Add to cart error:", error);
      throw error;
    }
  },

  // Cập nhật số lượng sản phẩm trong giỏ hàng
  async updateQuantity(userId, productId, quantity) {
    try {
      console.log('🛒 UPDATING QUANTITY - User:', userId, 'Product:', productId, 'New Qty:', quantity);

      if (quantity <= 0) {
        // Nếu quantity <= 0 thì xóa item
        await this.removeItem(userId, productId);
        return { action: "removed" };
      }

      // Kiểm tra tồn kho
      const product = await db("products")
        .where("id", productId)
        .where("is_active", true)
        .first();

      if (!product) {
        throw new Error("Sản phẩm không tồn tại");
      }

      if (quantity > product.stock_quantity) {
        throw new Error(`Chỉ còn ${product.stock_quantity} sản phẩm trong kho`);
      }

      const result = await db("cart_items")
        .where("user_id", userId)
        .where("product_id", productId)
        .update({
          quantity: quantity,
          updated_at: db.fn.now(),
        });

      console.log('✅ QUANTITY UPDATED:', result);
      return { action: "updated", quantity: quantity };
    } catch (error) {
      console.error("❌ Update cart quantity error:", error);
      throw error;
    }
  },

  // Xóa sản phẩm khỏi giỏ hàng
  async removeItem(userId, productId) {
    try {
      console.log('🛒 REMOVING FROM CART - User:', userId, 'Product:', productId);
      
      const result = await db("cart_items")
        .where("user_id", userId)
        .where("product_id", productId)
        .delete();

      console.log('✅ ITEM REMOVED:', result);
      return { success: true, deletedCount: result };
    } catch (error) {
      console.error("❌ Remove from cart error:", error);
      throw error;
    }
  },

  // Đếm số lượng sản phẩm trong giỏ hàng
  async getItemsCount(userId) {
    try {
      const result = await db("cart_items")
        .where("user_id", userId)
        .sum("quantity as count")
        .first();

      const count = result?.count || 0;
      console.log('🛒 CART COUNT FOR USER', userId, ':', count);
      return count;
    } catch (error) {
      console.error("❌ Get cart count error:", error);
      return 0;
    }
  },

  // Tính tổng tiền giỏ hàng
  async calculateTotal(userId) {
    try {
      const items = await this.findByUserId(userId);
      
      let subtotal = 0;
      let totalItems = 0;

      items.forEach(item => {
        const price = item.discount_price || item.price;
        subtotal += price * item.quantity;
        totalItems += item.quantity;
      });

      console.log('💰 CART TOTAL - Subtotal:', subtotal, 'Items:', totalItems);
      
      return {
        subtotal,
        totalItems,
        items: items
      };
    } catch (error) {
      console.error("❌ Calculate cart total error:", error);
      return { subtotal: 0, totalItems: 0, items: [] };
    }
  }
};