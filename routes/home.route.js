// routes/home.route.js
import express from "express";
import ProductModel from "../models/product.model.js";

const router = express.Router();

// Trang chủ
// routes/home.route.js - THÊM USER VÀO
// routes/home.route.js
router.get("/", async (req, res) => {
  try {
    const [
      featuredProducts,
      newProducts,
      bestSellingProducts,
      banners
    ] = await Promise.all([
      ProductModel.getFeaturedProducts(8),
      ProductModel.getNewProducts(8),
      ProductModel.getBestSellingProducts(8),
      ProductModel.getActiveBanners()
    ]);

    // DEBUG LOG
    console.log('🔍 HOME PAGE DEBUG:');
    console.log('- Featured Products:', featuredProducts.length);
    console.log('- New Products:', newProducts.length);
    console.log('- Best Selling Products:', bestSellingProducts.length);
    console.log('- Banners:', banners.length);
    
    // Log chi tiết best selling
    if (bestSellingProducts.length > 0) {
      console.log('📊 Best Selling Details:');
      bestSellingProducts.forEach((p, i) => {
        console.log(`${i+1}. ${p.name} - Sold: ${p.total_sold || 0}, Rating: ${p.average_rating}`);
      });
    }

    res.render("home", {
      title: "PetShop - Cửa hàng vật phẩm thú cưng",
      featuredProducts,
      newProducts,
      bestSellingProducts,
      banners,
      user: req.session.user
    });
  } catch (error) {
    console.error("Home page error:", error);
    res.render("home", {
      title: "PetShop - Cửa hàng vật phẩm thú cưng",
      featuredProducts: [],
      newProducts: [],
      bestSellingProducts: [],
      banners: [],
      user: req.session.user
    });
  }
});

export default router;