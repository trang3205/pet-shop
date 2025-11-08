// routes/cart.route.js - CẬP NHẬT VỚI DEBUG
import express from "express";
import CartModel from "../models/cart.model.js";
import { requireAuth, requireCustomer } from "../middlewares/auth.js";

const router = express.Router();

// Thêm sản phẩm vào giỏ hàng - VỚI DEBUG CHI TIẾT
router.post("/add", requireAuth, requireCustomer, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const userId = req.session.user.id;

    console.log('🚀 ADD TO CART REQUEST:');
    console.log('   User ID:', userId);
    console.log('   Product ID:', product_id);
    console.log('   Quantity:', quantity);
    console.log('   Session User:', req.session.user);

    if (!product_id) {
      console.log('❌ MISSING PRODUCT ID');
      return res.json({
        success: false,
        message: "Thiếu thông tin sản phẩm"
      });
    }

    const result = await CartModel.addItem(userId, product_id, parseInt(quantity));
    const cartItemsCount = await CartModel.getItemsCount(userId);

    console.log('✅ ADD TO CART SUCCESS:', result);
    console.log('🛒 NEW CART COUNT:', cartItemsCount);

    res.json({
      success: true,
      message: result.action === "added" 
        ? "Đã thêm sản phẩm vào giỏ hàng!" 
        : "Đã cập nhật số lượng sản phẩm!",
      cartItemsCount,
      action: result.action
    });

  } catch (error) {
    console.error("❌ Add to cart route error:", error);
    res.json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi thêm vào giỏ hàng"
    });
  }
});



// Xem giỏ hàng
router.get("/", requireAuth, requireCustomer, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const cartData = await CartModel.calculateTotal(userId);

    res.render("vwCart/index", {
      title: "Giỏ hàng của bạn",
      ...cartData
    });

  } catch (error) {
    console.error("Get cart error:", error);
    res.render("vwCart/index", {
      title: "Giỏ hàng của bạn",
      subtotal: 0,
      totalItems: 0,
      items: [],
      error: "Có lỗi xảy ra khi tải giỏ hàng"
    });
  }
});

// Cập nhật số lượng sản phẩm
router.put("/update", requireAuth, requireCustomer, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = req.session.user.id;

    if (!product_id || quantity === undefined) {
      return res.json({
        success: false,
        message: "Thiếu thông tin cập nhật"
      });
    }

    const result = await CartModel.updateQuantity(userId, product_id, parseInt(quantity));
    const cartData = await CartModel.calculateTotal(userId);

    res.json({
      success: true,
      message: result.action === "removed" 
        ? "Đã xóa sản phẩm khỏi giỏ hàng" 
        : "Đã cập nhật số lượng",
      ...cartData,
      action: result.action
    });

  } catch (error) {
    console.error("Update cart error:", error);
    res.json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi cập nhật giỏ hàng"
    });
  }
});

// Xóa sản phẩm khỏi giỏ hàng
router.delete("/remove", requireAuth, requireCustomer, async (req, res) => {
  try {
    const { product_id } = req.body;
    const userId = req.session.user.id;

    if (!product_id) {
      return res.json({
        success: false,
        message: "Thiếu thông tin sản phẩm"
      });
    }

    await CartModel.removeItem(userId, product_id);
    const cartData = await CartModel.calculateTotal(userId);

    res.json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng",
      ...cartData
    });

  } catch (error) {
    console.error("Remove from cart error:", error);
    res.json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi xóa sản phẩm"
    });
  }
});

// Lấy số lượng sản phẩm trong giỏ hàng (API)
router.get("/count", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const count = await CartModel.getItemsCount(userId);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error("Get cart count error:", error);
    res.json({
      success: false,
      count: 0
    });
  }
});

export default router;