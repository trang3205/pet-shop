// models/category.model.js
import db from "../utils/db.js";

export default {
  // Lấy tất cả danh mục active
  async findAllActive() {
    try {
      return await db("categories")
        .select("*")
        .where("is_active", true)
        .orderBy("sort_order", "asc")
        .orderBy("name", "asc");
    } catch (error) {
      console.error("Find all active categories error:", error);
      return [];
    }
  },

  // Lấy danh mục theo slug
  async findBySlug(slug) {
    try {
      return await db("categories")
        .select("*")
        .where("slug", slug)
        .where("is_active", true)
        .first();
    } catch (error) {
      console.error("Find category by slug error:", error);
      return null;
    }
  },

  // Lấy danh mục theo ID
  async findById(id) {
    try {
      return await db("categories")
        .select("*")
        .where("id", id)
        .where("is_active", true)
        .first();
    } catch (error) {
      console.error("Find category by id error:", error);
      return null;
    }
  },

  // Lấy danh mục có số lượng sản phẩm
  async findAllWithProductCount() {
    try {
      return await db("categories")
        .select(
          "categories.*",
          db.raw("COUNT(products.id) as product_count")
        )
        .leftJoin("products", function() {
          this.on("categories.id", "=", "products.category_id")
            .andOn("products.is_active", "=", db.raw("?", [true]))
        })
        .where("categories.is_active", true)
        .groupBy("categories.id")
        .orderBy("categories.sort_order", "asc")
        .orderBy("categories.name", "asc");
    } catch (error) {
      console.error("Find categories with product count error:", error);
      return [];
    }
  }
};