// routes/wishlist.route.js
import express from "express";
import db from "../utils/db.js";
import { authenticateUser, requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// Helper function để tạo danh sách page numbers
function generatePageNumbers(currentPage, totalPages, maxVisible = 5) {
  const pages = [];
  let startPage, endPage;

  if (totalPages <= maxVisible) {
    // Nếu tổng số trang ít hơn hoặc bằng maxVisible
    startPage = 1;
    endPage = totalPages;
  } else {
    // Nếu tổng số trang nhiều hơn maxVisible
    const maxVisibleBeforeCurrent = Math.floor(maxVisible / 2);
    const maxVisibleAfterCurrent = Math.ceil(maxVisible / 2) - 1;
    
    if (currentPage <= maxVisibleBeforeCurrent) {
      // Gần đầu
      startPage = 1;
      endPage = maxVisible;
    } else if (currentPage + maxVisibleAfterCurrent >= totalPages) {
      // Gần cuối
      startPage = totalPages - maxVisible + 1;
      endPage = totalPages;
    } else {
      // Ở giữa
      startPage = currentPage - maxVisibleBeforeCurrent;
      endPage = currentPage + maxVisibleAfterCurrent;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
}

// GET /user/wishlist - Trang wishlist với pagination
router.get("/wishlist", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4; // 12 items per page (3x4 grid)
    const offset = (page - 1) * limit;

    console.log("🔄 LOADING WISHLIST FOR USER:", userId, "Page:", page);

    // 1. Lấy tổng số items trong wishlist
    const totalResult = await db("wishlists")
      .count("* as total")
      .where("user_id", userId)
      .first();
    
    const totalItems = parseInt(totalResult.total);
    const totalPages = Math.ceil(totalItems / limit);

    console.log("📊 Wishlist Stats - Total:", totalItems, "Pages:", totalPages);

    // 2. Lấy danh sách sản phẩm với pagination
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
      .orderBy("wishlists.created_at", "desc")
      .limit(limit)
      .offset(offset);

    console.log("✅ WISHLIST ITEMS LOADED:", wishlistItems.length, "for page", page);

    res.render("vwUser/wishlist", {
      title: "Sản phẩm yêu thích - PetShop",
      wishlistItems,
      user: req.session.user,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        limit: limit,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1,
        pages: generatePageNumbers(page, totalPages),
        showPagination: totalPages > 1
      }
    });
  } catch (error) {
    console.error("❌ WISHLIST PAGE ERROR:", error);
    res.render("vwUser/wishlist", {
      title: "Sản phẩm yêu thích - PetShop",
      wishlistItems: [],
      user: req.session.user,
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        showPagination: false
      }
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