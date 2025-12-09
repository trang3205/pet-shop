// routes/home.route.js
import express from "express";
import ProductModel from "../models/product.model.js";

const router = express.Router();

// Trang chủ
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
      banners
      // 🚨 XÓA: user: req.user - đã có trong res.locals
    });
  } catch (error) {
    console.error("Home page error:", error);
    res.render("home", {
      title: "PetShop - Cửa hàng vật phẩm thú cưng",
      featuredProducts: [],
      newProducts: [],
      bestSellingProducts: [],
      banners: []
      // 🚨 XÓA: user: req.user
    });
  }
});

// Trang Về chúng tôi
router.get("/about", (req, res) => {
  res.render("about", {
    title: "Về chúng tôi - PetShop",
    layout: "main"
  });
});

// Trang Liên hệ
router.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Liên hệ - PetShop",
    layout: "main"
  });
});

// Xử lý form liên hệ
router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const db = await import("../utils/db.js");

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng điền đầy đủ thông tin" 
      });
    }

    // Save to database
    await db.default('contacts').insert({
      name,
      email,
      subject,
      message,
      is_read: false,
      created_at: new Date()
    });

    console.log("Contact form saved:", { name, email, subject, message });

    res.json({ 
      success: true, 
      message: "Cảm ơn bạn đã liên hệ với chúng tôi. Vui lòng để ý email của bạn, chúng tôi sẽ cố gắng phản hồi sớm nhất có thể!" 
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    res.status(500).json({ 
      success: false, 
      message: "Có lỗi xảy ra, vui lòng thử lại" 
    });
  }
});

// Trang Chính sách vận chuyển
router.get("/shipping", (req, res) => {
  res.render("shipping", {
    title: "Chính sách vận chuyển - PetShop",
    layout: "main"
  });
});

// Trang Chính sách đổi trả
router.get("/return", (req, res) => {
  res.render("return", {
    title: "Chính sách đổi trả - PetShop",
    layout: "main"
  });
});

export default router;