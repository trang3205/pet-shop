// models/product.model.js
import db from "../utils/db.js";

export default {
  // Base query for products
  getBaseQuery() {
    return db("products")
      .select(
        "products.*",
        "categories.name as category_name",
        "categories.slug as category_slug"
      )
      .leftJoin("categories", "products.category_id", "categories.id")
      .where("products.is_active", true);
  },

  // Lấy sản phẩm nổi bật cho trang chủ
  async getFeaturedProducts(limit = 8) {
    try {
      return await this.getBaseQuery()
        .where("products.is_featured", true)
        .orderBy("products.created_at", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Get featured products error:", error);
      return [];
    }
  },

  // Lấy sản phẩm mới nhất
  async getNewProducts(limit = 8) {
    try {
      return await this.getBaseQuery()
        .orderBy("products.created_at", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Get new products error:", error);
      return [];
    }
  },

  // Lấy sản phẩm bán chạy
  async getBestSellingProducts(limit = 8) {
    try {
      return await this.getBaseQuery()
        .orderBy("products.average_rating", "desc")
        .orderBy("products.review_count", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Get best selling products error:", error);
      return [];
    }
  },

  // Lấy banners
  async getActiveBanners() {
    try {
      return await db("banners")
        .select("*")
        .where("is_active", true)
        .orderBy("sort_order", "asc");
    } catch (error) {
      console.error("Get banners error:", error);
      return [];
    }
  },

  // Lấy sản phẩm theo ID
  async findById(id) {
    try {
      return await this.getBaseQuery()
        .where("products.id", id)
        .first();
    } catch (error) {
      console.error("Find product by id error:", error);
      return null;
    }
  },

  // Lấy sản phẩm theo slug
  async findBySlug(slug) {
    try {
      return await this.getBaseQuery()
        .where("products.slug", slug)
        .first();
    } catch (error) {
      console.error("Find product by slug error:", error);
      return null;
    }
  },

  // Lấy sản phẩm liên quan
  async getRelatedProducts(productId, categoryId, limit = 4) {
    try {
      return await this.getBaseQuery()
        .where("products.category_id", categoryId)
        .whereNot("products.id", productId)
        .orderBy("products.is_featured", "desc")
        .orderBy("products.average_rating", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Get related products error:", error);
      return [];
    }
  }
};