// routes/category.route.js
import express from "express";
import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import db from "../utils/db.js";

const router = express.Router();

// GET /categories - Trang danh sách categories với search + filter
router.get("/", async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      sort = 'newest',
      q = '', // search query
      category: categoryId = '' // filter by category
    } = req.query;
    
    console.log("🔄 CATEGORIES PAGE - Search:", q, "Category:", categoryId);
    
    // Lấy tất cả sản phẩm active
    let query = ProductModel.getBaseQuery();
    
    // Áp dụng search nếu có
    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      query = query.where(function() {
        this.where('products.name', 'ilike', searchTerm)
          .orWhere('products.short_description', 'ilike', searchTerm)
          .orWhere('products.description', 'ilike', searchTerm)
          .orWhere('categories.name', 'ilike', searchTerm);
      });
    }
    
    // Áp dụng category filter nếu có
    if (categoryId && !isNaN(categoryId)) {
      query = query.where("products.category_id", parseInt(categoryId));
    }
    
    // Count total products với điều kiện search/filter
    let countQuery = db("products")
      .leftJoin("categories", "products.category_id", "categories.id")
      .where("products.is_active", true);
    
    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      countQuery = countQuery.where(function() {
        this.where('products.name', 'ilike', searchTerm)
          .orWhere('products.short_description', 'ilike', searchTerm)
          .orWhere('products.description', 'ilike', searchTerm)
          .orWhere('categories.name', 'ilike', searchTerm);
      });
    }
    
    if (categoryId && !isNaN(categoryId)) {
      countQuery = countQuery.where("products.category_id", parseInt(categoryId));
    }
    
    const countResult = await countQuery.count('* as total').first();
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
    
    // Get category info nếu có filter
    let category = null;
    if (categoryId && !isNaN(categoryId)) {
      category = await CategoryModel.findById(parseInt(categoryId));
    }
    
    res.render("vwProduct/index", {
      title: q ? `Tìm kiếm: "${q}" - PetShop` : "Tất cả sản phẩm - PetShop",
      products,
      categories,
      category,
      currentSort: sort,
      searchQuery: q,
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

// routes/category.route.js - SỬA PHẦN NÀY

// GET /categories/:id - Sản phẩm theo category + search
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 12, sort = 'newest', q = '' } = req.query;
    
    console.log("🔄 CATEGORY PRODUCTS - ID:", id, "Search:", q);
    
    if (isNaN(id)) {
      return res.status(404).render("404", { 
        title: "Không tìm thấy danh mục" 
      });
    }
    
    const category = await CategoryModel.findById(parseInt(id));
    
    if (!category) {
      return res.status(404).render("404", { 
        title: "Không tìm thấy danh mục" 
      });
    }
    
    let query = ProductModel.getBaseQuery()
      .where("products.category_id", category.id);
    
    // 🔥 QUAN TRỌNG: Áp dụng search query nếu có
    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      query = query.andWhere(function() {
        this.where('products.name', 'ilike', searchTerm)
          .orWhere('products.short_description', 'ilike', searchTerm)
          .orWhere('products.description', 'ilike', searchTerm);
      });
    }
    
    // Count total products với search
    let countQuery = db("products")
      .where("products.is_active", true)
      .where("products.category_id", category.id);
    
    // 🔥 QUAN TRỌNG: Count với search query
    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      countQuery = countQuery.andWhere(function() {
        this.where('products.name', 'ilike', searchTerm)
          .orWhere('products.short_description', 'ilike', searchTerm)
          .orWhere('products.description', 'ilike', searchTerm);
      });
    }
    
    const countResult = await countQuery.count('* as total').first();
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
      title: q ? `Tìm kiếm: "${q}" - ${category.name}` : `${category.name} - PetShop`,
      products,
      category,
      categories,
      currentSort: sort,
      searchQuery: q, // 🔥 QUAN TRỌNG: Truyền searchQuery vào template
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