// routes/product.route.js
import express from "express";
import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";
import db from "../utils/db.js";

const router = express.Router();

// Trang tất cả sản phẩm
router.get("/", async (req, res) => {
  try {
    console.log("=== DEBUG PRODUCTS ROUTE ===");
    
    const { category, page = 1, limit = 12, sort = 'newest' } = req.query;
    console.log("1. Query params:", { category, page, limit, sort });

    // TEST CƠ BẢN TRƯỚC
    console.log("2. Testing raw database query...");
    const rawTest = await db.raw('SELECT COUNT(*) as count FROM products WHERE is_active = true');
    console.log("Raw products count:", rawTest.rows[0].count);

    let products;
    let totalProducts = 0;
    
    // Base query
    let query = ProductModel.getBaseQuery();
    
    // Filter by category
    if (category) {
      console.log("5. Filtering by category:", category);
      const categoryData = await CategoryModel.findBySlug(category);
      console.log("Category data:", categoryData);
      if (categoryData) {
        query = query.where("products.category_id", categoryData.id);
      }
    }
    
    // SỬA: Count riêng không dùng clone
    console.log("6. Getting total count...");
    const countQuery = db("products")
      .count('* as total')
      .where("products.is_active", true);
    
    if (category) {
      const categoryData = await CategoryModel.findBySlug(category);
      if (categoryData) {
        countQuery.where("products.category_id", categoryData.id);
      }
    }
    
    const countResult = await countQuery.first();
    totalProducts = parseInt(countResult.total, 10);
    console.log("Total products after filter:", totalProducts);
    
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
      default: // newest
        query = query.orderBy("products.created_at", "desc");
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    products = await query.offset(offset).limit(limit);
    console.log("7. Final products to render:", products.length);
    
    // Get categories for filter
    const categories = await CategoryModel.findAllActive();
    
    console.log("8. Rendering template with:", {
      productsCount: products.length,
      categoriesCount: categories.length,
      totalProducts: totalProducts
    });
    
    res.render("vwProduct/index", {
      title: "Sản phẩm - PetShop",
      products,
      categories,
      currentCategory: category,
      currentSort: sort,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalProducts,
        pages: Math.ceil(totalProducts / limit)
      },
      //user: req.user
    });
  } catch (error) {
    console.error("❌ PRODUCTS PAGE ERROR:", error);
    console.error("Error stack:", error.stack);
    res.render("vwProduct/index", {
      title: "Sản phẩm - PetShop",
      products: [],
      categories: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        pages: 1
      },
      //user: req.user
    });
  }
});

// Trang chi tiết sản phẩm
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = await ProductModel.findBySlug(slug);
    
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
    
    res.render("vwProduct/detail", {
      title: `${product.name} - PetShop`,
      product,
      relatedProducts,
      //user: req.user
    });
  } catch (error) {
    console.error("Product detail error:", error);
    res.status(500).render("500", {
      title: "Lỗi server"
    });
  }
});

// Sản phẩm theo danh mục
router.get("/category/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 12, sort = 'newest' } = req.query;
    
    const category = await CategoryModel.findBySlug(slug);
    
    if (!category) {
      return res.status(404).render("404", {
        title: "Không tìm thấy danh mục"
      });
    }
    
    let query = ProductModel.getBaseQuery()
      .where("products.category_id", category.id);
    
    // SỬA: Count riêng
    const countResult = await db("products")
      .count('* as total')
      .where("products.is_active", true)
      .where("products.category_id", category.id)
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
      //user: req.user
    });
  } catch (error) {
    console.error("Category products error:", error);
    res.status(500).render("500", {
      title: "Lỗi server"
    });
  }
});

export default router;