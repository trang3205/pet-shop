// 📁 routes/checkout.route.js - CẬP NHẬT
import express from "express";
import CartModel from "../models/cart.model.js";
import OrderModel from "../models/order.model.js";
import { requireAuth, requireCustomer } from "../middlewares/auth.js";

const router = express.Router();

// 📄 routes/checkout.route.js - THÊM VALIDATION
// 📄 routes/checkout.route.js - SỬA LẠI KHÔNG DÙNG FLASH
// 📄 routes/checkout.route.js - THÊM DEBUG CHI TIẾT
router.get("/", requireAuth, requireCustomer, async (req, res) => {
    console.log('🔍 CHECKOUT GET REQUEST STARTED');
    
    try {
        const userId = req.session.user.id;
        const { selected, error, warning } = req.query;

        console.log('🛒 CHECKOUT PAGE - Selected products from URL:', selected);
        console.log('👤 User ID:', userId);
        console.log('📋 Session user:', req.session.user);

        if (!selected) {
            console.log('❌ No selected products in URL');
            return res.redirect('/cart?error=' + encodeURIComponent('Vui lòng chọn sản phẩm để thanh toán'));
        }

        let cartData;
        let selectedProductIds = [];

        try {
            selectedProductIds = selected.split(',').map(id => {
                const parsedId = parseInt(id.trim());
                if (isNaN(parsedId) || parsedId <= 0) {
                    throw new Error('Invalid product ID');
                }
                return parsedId;
            });
            
            console.log('✅ Parsed selected product IDs:', selectedProductIds);
            console.log('✅ Selected IDs types:', selectedProductIds.map(id => typeof id));

        } catch (parseError) {
            console.log('❌ Error parsing selected products:', parseError);
            return res.redirect('/cart?error=' + encodeURIComponent('Danh sách sản phẩm không hợp lệ'));
        }

        // ✅ THÊM: Kiểm tra cart items trước khi gọi calculateSelectedTotal
        const allCartItems = await CartModel.findByUserId(userId);
        console.log('🛒 ALL CART ITEMS FOR USER:', allCartItems.map(item => ({
            id: item.product_id,
            name: item.name,
            type: typeof item.product_id
        })));

        cartData = await CartModel.calculateSelectedTotal(userId, selectedProductIds);
        
        console.log('📦 FINAL CART DATA FOR CHECKOUT:', {
            items_count: cartData.items.length,
            selected_count: selectedProductIds.length,
            items: cartData.items.map(item => ({
                id: item.product_id,
                name: item.name
            }))
        });

        let warningMessage = null;
        if (cartData.items.length !== selectedProductIds.length) {
            console.log('⚠️ Some selected products not found in cart');
            console.log('   - Expected:', selectedProductIds.length);
            console.log('   - Found:', cartData.items.length);
            warningMessage = 'Một số sản phẩm đã chọn không còn trong giỏ hàng';
        }

        if (cartData.items.length === 0) {
            console.log('❌ No valid products to checkout');
            console.log('   - Selected IDs:', selectedProductIds);
            console.log('   - Available cart items:', allCartItems.map(item => item.product_id));
            return res.redirect('/cart?error=' + encodeURIComponent('Không có sản phẩm hợp lệ để thanh toán'));
        }

        res.render("vwCheckout/index", {
            title: "Thanh toán",
            ...cartData,
            user: req.session.user,
            selectedProductIds: selectedProductIds,
            error: error,
            warning: warningMessage
        });

    } catch (error) {
        console.error("Checkout page error:", error);
        return res.redirect('/cart?error=' + encodeURIComponent('Có lỗi xảy ra khi tải trang thanh toán'));
    }
});

// Xử lý thanh toán - SỬA ĐỂ CHỈ XỬ LÝ SẢN PHẨM ĐƯỢC CHỌN
// 📁 routes/checkout.route.js - THÊM DEBUG CHI TIẾT
router.post("/process", requireAuth, requireCustomer, async (req, res) => {
    console.log('💰 ============ CHECKOUT PROCESS STARTED ============');
    
    try {
        const userId = req.session.user.id;
        console.log('👤 User ID from session:', userId);

        const {
            full_name,
            phone,
            email,
            province,
            district,
            ward,
            street_address,
            payment_method,
            notes,
            agree_terms,
            selected_products,
            shipping_method = 'Giao hàng tiêu chuẩn' // ✅ THÊM SHIPPING METHOD
        } = req.body;

        // ✅ TÍNH SHIPPING FEE THEO PHƯƠNG THỨC
        const shippingFee = shipping_method === 'Giao hàng nhanh' ? 50000 : 30000;

        // ✅ THÊM VALIDATION CHO SELECTED_PRODUCTS
        if (!selected_products) {
            console.log('❌ Validation failed: No selected products');
            return res.json({
                success: false,
                message: "Không có sản phẩm nào được chọn để thanh toán"
            });
        }

        // Validate dữ liệu cơ bản
        if (!full_name || !phone || !province || !district || !ward || !street_address) {
            console.log('❌ Validation failed: Missing required fields');
            return res.json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin giao hàng"
            });
        }
        if (!payment_method) {
            console.log('❌ Validation failed: No payment method');
            return res.json({
                success: false,
                message: "Vui lòng chọn phương thức thanh toán"
            });
        }

        if (!agree_terms) {
            console.log('❌ Validation failed: Terms not agreed');
            return res.json({
                success: false,
                message: "Vui lòng đồng ý với điều khoản và điều kiện"
            });
        }

        console.log('✅ Basic validation passed');

        // Xử lý selected products
        let cartData;
        let selectedProductIds = [];

        if (selected_products) {
            if (typeof selected_products === 'string') {
                selectedProductIds = selected_products.split(',').map(id => parseInt(id.trim()));
            } else if (Array.isArray(selected_products)) {
                selectedProductIds = selected_products.map(id => parseInt(id));
            }
            
            console.log('🎯 Processing selected products:', selectedProductIds);
            cartData = await CartModel.calculateSelectedTotal(userId, selectedProductIds);
        } else {
            console.log('🛒 Processing all cart items');
            cartData = await CartModel.calculateTotal(userId);
        }

        console.log('📊 Cart data:', {
            items_count: cartData.items.length,
            subtotal: cartData.subtotal,
            items: cartData.items.map(item => ({
                id: item.product_id,
                name: item.name,
                quantity: item.quantity,
                price: item.discount_price || item.price
            }))
        });

        if (cartData.items.length === 0) {
            console.log('❌ No items to checkout');
            return res.json({
                success: false,
                message: "Không có sản phẩm nào để thanh toán"
            });
        }

        // Kiểm tra tồn kho
        console.log('📦 Checking stock...');
        for (const item of cartData.items) {
            if (item.quantity > item.stock_quantity) {
                console.log(`❌ Stock issue: ${item.name} - requested: ${item.quantity}, available: ${item.stock_quantity}`);
                return res.json({
                    success: false,
                    message: `Sản phẩm "${item.name}" chỉ còn ${item.stock_quantity} sản phẩm trong kho`
                });
            }
        }
        console.log('✅ Stock check passed');

        // Tạo shipping address
        const shipping_address = {
            full_name,
            phone,
            email: email || req.session.user.email,
            province,
            district,
            ward,
            street_address,
            country: 'Vietnam'
        };

        console.log('📮 Shipping address:', shipping_address);

        // Tạo order data
        const orderData = {
            user_id: userId,
            customer_name: full_name,
            customer_email: email || req.session.user.email,
            customer_phone: phone,
            shipping_address,
            payment_method,
            items: cartData.items,
            subtotal: cartData.subtotal,
            shipping_fee: shippingFee, // ✅ DÙNG SHIPPING FEE TÍNH TOÁN
            shipping_method: shipping_method, // ✅ THÊM SHIPPING METHOD
            total_amount: cartData.subtotal + shippingFee,
            notes: notes || ''
        };

        console.log('📋 Final order data:', orderData);

        // Tạo đơn hàng
        console.log('🚀 Calling OrderModel.create...');
        const order = await OrderModel.create(orderData);
        
        console.log('🎉 ORDER CREATION SUCCESSFUL:', {
            order_id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount
        });

        res.json({
            success: true,
            message: "Đặt hàng thành công!",
            order_id: order.id,
            order_number: order.order_number
        });

    } catch (error) {
        console.error("💥 CHECKOUT PROCESS ERROR:", error);
        console.error("Error stack:", error.stack);
        
        res.json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi xử lý đơn hàng"
        });
    } finally {
        console.log('💰 ============ CHECKOUT PROCESS ENDED ============');
    }
});
// Trang xác nhận đơn hàng
router.get("/confirmation/:orderId", requireAuth, requireCustomer, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user.id;

        const order = await OrderModel.findById(orderId, userId);

        if (!order) {
            return res.redirect('/cart');
        }

        res.render("vwCheckout/confirmation", {
            title: "Xác nhận đơn hàng",
            order
        });

    } catch (error) {
        console.error("Order confirmation error:", error);
        res.redirect('/cart');
    }
});

export default router;