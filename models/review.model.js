// models/review.model.js
import db from "../utils/db.js";

export default {
  // Lấy reviews theo product_id
  async findByProductId(productId, limit = 10) {
    try {
      return await db("reviews")
        .select(
          "reviews.*",
          "users.name as user_name",
          "users.avatar_url"
        )
        .leftJoin("users", "reviews.user_id", "users.id")
        .where("reviews.product_id", productId)
        .where("reviews.status", "approved")
        .orderBy("reviews.created_at", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Find reviews by product error:", error);
      return [];
    }
  },

  // Lấy rating stats
  async getRatingStats(productId) {
    try {
      return await db("reviews")
        .select(
          db.raw('COUNT(*) as total_reviews'),
          db.raw('AVG(rating) as avg_rating'),
          db.raw('COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5'),
          db.raw('COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4'),
          db.raw('COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3'),
          db.raw('COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2'),
          db.raw('COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1')
        )
        .where("product_id", productId)
        .where("status", "approved")
        .first();
    } catch (error) {
      console.error("Get rating stats error:", error);
      return {
        total_reviews: 0,
        avg_rating: 0,
        rating_5: 0,
        rating_4: 0,
        rating_3: 0,
        rating_2: 0,
        rating_1: 0
      };
    }
  }
};