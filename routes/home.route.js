// routes/home.route.js
import express from "express";
import ProductModel from "../models/product.model.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for contact form image uploads
const uploadDir = path.join(__dirname, '../static/imgs/uploadimgs');
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'contact-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadImages = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ được upload ảnh (JPG, PNG, GIF)'));
        }
    }
}).array('images', 5); // Max 5 files

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
router.post("/contact", uploadImages, async (req, res) => {
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

    // Process uploaded images
    let imgsPaths = null;
    if (req.files && req.files.length > 0) {
      // Store filenames as JSON string: ["file1.jpg", "file2.png"]
      imgsPaths = JSON.stringify(req.files.map(file => file.filename));
      console.log('📸 Uploaded images:', imgsPaths);
    }

    // Save to database
    await db.default('contacts').insert({
      name,
      email,
      subject,
      message,
      imgs: imgsPaths,
      is_read: false,
      created_at: new Date()
    });

    console.log("Contact form saved:", { name, email, subject, message, imgs: imgsPaths });

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