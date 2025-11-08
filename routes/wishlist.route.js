// routes/wishlist.route.js
import express from "express";
import db from "../utils/db.js";
import { authenticateUser, requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// GET /user/wishlist - Trang wishlist
router.get("/wishlist", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    console.log("🔄 LOADING WISHLIST FOR USER:", userId);
    
    // Lấy danh sách sản phẩm trong wishlist
    const wishlistItems = await db("wishlists")
      .select(
        "wishlists.id as wishlist_id",
        "wishlists.created_at as added_date",
        "products.*",
        "categories.name as category_name"
      )
      .leftJoin("products", "wishlists.product_id", "products.id")
      .leftJoin("categories", "products.category_id", "categories.id")
      .where("wishlists.user_id", userId)
      .where("products.is_active", true)
      .orderBy("wishlists.created_at", "desc");

    console.log("✅ WISHLIST ITEMS FOUND:", wishlistItems.length);

    res.render("vwUser/wishlist", {
      title: "Sản phẩm yêu thích - PetShop",
      wishlistItems,
      user: req.session.user
    });
  } catch (error) {
    console.error("❌ WISHLIST PAGE ERROR:", error);
    res.render("vwUser/wishlist", {
      title: "Sản phẩm yêu thích - PetShop",
      wishlistItems: [],
      user: req.session.user
    });
  }
});

// POST /wishlist/toggle - Thêm/xóa sản phẩm khỏi wishlist
router.post("/wishlist/toggle", authenticateUser, requireAuth, async (req, res) => {
  try {
    const { product_id } = req.body;
    const userId = req.session.user.id;

    if (!product_id) {
      return res.json({ success: false, message: "Thiếu product_id" });
    }

    // Kiểm tra xem sản phẩm đã có trong wishlist chưa
    const existingItem = await db("wishlists")
      .where("user_id", userId)
      .where("product_id", product_id)
      .first();

    if (existingItem) {
      // Nếu đã có, xóa khỏi wishlist
      await db("wishlists")
        .where("user_id", userId)
        .where("product_id", product_id)
        .delete();

      return res.json({ 
        success: true, 
        isInWishlist: false,
        message: "Đã xóa khỏi danh sách yêu thích" 
      });
    } else {
      // Nếu chưa có, thêm vào wishlist
      await db("wishlists").insert({
        user_id: userId,
        product_id: product_id
      });

      return res.json({ 
        success: true, 
        isInWishlist: true,
        message: "Đã thêm vào danh sách yêu thích" 
      });
    }
  } catch (error) {
    console.error("❌ TOGGLE WISHLIST ERROR:", error);
    return res.json({ 
      success: false, 
      message: "Có lỗi xảy ra khi cập nhật wishlist" 
    });
  }
});

// GET /wishlist/check/:productId - Kiểm tra trạng thái wishlist
router.get("/wishlist/check/:productId", authenticateUser, requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user.id;

    const existingItem = await db("wishlists")
      .where("user_id", userId)
      .where("product_id", productId)
      .first();

    return res.json({ 
      success: true, 
      isInWishlist: !!existingItem 
    });
  } catch (error) {
    console.error("❌ CHECK WISHLIST ERROR:", error);
    return res.json({ 
      success: false, 
      isInWishlist: false 
    });
  }
});

// POST /wishlist/remove/:wishlistId - Xóa item khỏi wishlist
router.post("/wishlist/remove/:wishlistId", authenticateUser, requireAuth, async (req, res) => {
  try {
    const { wishlistId } = req.params;
    const userId = req.session.user.id;

    await db("wishlists")
      .where("id", wishlistId)
      .where("user_id", userId)
      .delete();

    return res.json({ 
      success: true, 
      message: "Đã xóa sản phẩm khỏi danh sách yêu thích" 
    });
  } catch (error) {
    console.error("❌ REMOVE WISHLIST ITEM ERROR:", error);
    return res.json({ 
      success: false, 
      message: "Có lỗi xảy ra khi xóa sản phẩm" 
    });
  }
});

export default router;