// routes/home.route.js
import express from "express";
import ProductModel from "../models/product.model.js";

const router = express.Router();

// Trang chủ
// routes/home.route.js - THÊM USER VÀO
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

    res.render("home", {
      title: "PetShop - Cửa hàng vật phẩm thú cưng",
      featuredProducts,
      newProducts,
      bestSellingProducts,
      banners,
      user: req.session.user // ← THÊM DÒNG NÀY
    });
  } catch (error) {
    console.error("Home page error:", error);
    res.render("home", {
      title: "PetShop - Cửa hàng vật phẩm thú cưng",
      featuredProducts: [],
      newProducts: [],
      bestSellingProducts: [],
      banners: [],
      user: req.session.user // ← THÊM VÀO ĐÂY NỮA
    });
  }
});

export default router;