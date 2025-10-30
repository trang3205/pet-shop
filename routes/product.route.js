// routes/product.route.js
import express from "express";
import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";
import ReviewModel from "../models/review.model.js";
import db from "../utils/db.js";

const router = express.Router();



router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra nếu id là số
    if (isNaN(id)) {
      return res.status(404).render("404", {
        title: "Không tìm thấy sản phẩm"
      });
    }
    
    const product = await ProductModel.findById(parseInt(id));
    
    if (!product) {
      return res.status(404).render("404", {
        title: "Không tìm thấy sản phẩm"
      });
    }
    
    // Lấy sản phẩm liên quan
    const relatedProducts = await ProductModel.getRelatedProducts(
      product.id, 
      product.category_id, 
      4
    );
    // 🆕 LẤY REVIEWS & RATING STATS
    const [reviews, ratingStats] = await Promise.all([
      ReviewModel.findByProductId(product.id),
      ReviewModel.getRatingStats(product.id)
    ]);

    res.render("vwProduct/detail", {
      title: `${product.name} - PetShop`,
      product,
      relatedProducts,
    });
  } catch (error) {
    console.error("Product detail by ID error:", error);
    res.status(500).render("500", {
      title: "Lỗi server"
    });
  }
});





export default router;