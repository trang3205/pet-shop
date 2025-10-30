// routes/category.route.js
import express from "express";
import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import db from "../utils/db.js";

const router = express.Router();

// GET /categories - Trang danh sách categories (TẤT CẢ SẢN PHẨM)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = 'newest' } = req.query;
    
    console.log("🔄 CATEGORIES PAGE - All products");
    
    // Lấy tất cả sản phẩm active
    let query = ProductModel.getBaseQuery();
    
    // Count total products
    const countResult = await db("products")
      .count('* as total')
      .where("products.is_active", true)
      .first();
    
    const totalProducts = parseInt(countResult.total, 10);
    
    // Apply sorting
    switch(sort) {
      case 'price_asc':
        query = query.orderBy("products.price", "asc");
        break;
      case 'price_desc':
        query = query.orderBy("products.price", "desc");
        break;
      case 'name':
        query = query.orderBy("products.name", "asc");
        break;
      case 'rating':
        query = query.orderBy("products.average_rating", "desc");
        break;
      default:
        query = query.orderBy("products.created_at", "desc");
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const products = await query.offset(offset).limit(limit);
    
    // Get all categories for sidebar
    const categories = await CategoryModel.findAllActive();
    
    res.render("vwProduct/index", {
      title: "Tất cả sản phẩm - PetShop",
      products,
      categories,
      currentSort: sort,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalProducts,
        pages: Math.ceil(totalProducts / limit)
      },
    });
  } catch (error) {
    console.error("❌ CATEGORIES PAGE ERROR:", error);
    res.render("vwProduct/index", {
      title: "Tất cả sản phẩm - PetShop",
      products: [],
      categories: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        pages: 1
      }
    });
  }
});

// GET /categories/:id - Sản phẩm theo category
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 12, sort = 'newest' } = req.query;
    
    console.log("🔄 CATEGORY PRODUCTS - ID:", id);
    
    if (isNaN(id)) {
      return res.status(404).render("404", { 
        title: "Không tìm thấy danh mục" 
      });
    }
    
    const category = await CategoryModel.findById(parseInt(id));
    console.log("🔄 CATEGORY DATA:", category);
    
    if (!category) {
      return res.status(404).render("404", { 
        title: "Không tìm thấy danh mục" 
      });
    }
    
    let query = ProductModel.getBaseQuery()
      .where("products.category_id", category.id);
    
    // Count total products in category
    const countResult = await db("products")
      .count('* as total')
      .where("products.is_active", true)
      .where("products.category_id", category.id)
      .first();
    
    const totalProducts = parseInt(countResult.total, 10);
    console.log("🔄 TOTAL PRODUCTS IN CATEGORY:", totalProducts);
    
    // Apply sorting
    switch(sort) {
      case 'price_asc':
        query = query.orderBy("products.price", "asc");
        break;
      case 'price_desc':
        query = query.orderBy("products.price", "desc");
        break;
      case 'name':
        query = query.orderBy("products.name", "asc");
        break;
      case 'rating':
        query = query.orderBy("products.average_rating", "desc");
        break;
      default:
        query = query.orderBy("products.created_at", "desc");
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const products = await query.offset(offset).limit(limit);
    
    console.log("🔄 PRODUCTS FOUND:", products.length);
    
    // Get all categories for sidebar
    const categories = await CategoryModel.findAllActive();
    
    res.render("vwProduct/index", {
      title: `${category.name} - PetShop`,
      products,
      category,
      categories,
      currentSort: sort,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalProducts,
        pages: Math.ceil(totalProducts / limit)
      },
    });
  } catch (error) {
    console.error("❌ CATEGORY PRODUCTS ERROR:", error);
    res.status(500).render("500", {
      title: "Lỗi server"
    });
  }
});

export default router;