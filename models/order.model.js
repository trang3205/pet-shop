// 📁 models/order.model.js - PHIÊN BẢN ĐÃ SỬA HOÀN TOÀN
import db from "../utils/db.js";

export default {
    // Tạo đơn hàng mới - ĐÃ SỬA SYNTAX
    async create(orderData) {
    const trx = await db.transaction();
    
    try {
        const {
            user_id,
            customer_name,
            customer_email,
            customer_phone,
            shipping_address,
            payment_method,
            items,
            subtotal,
            shipping_fee = 30000,
            shipping_method = 'Giao hàng tiêu chuẩn', // ✅ THÊM SHIPPING METHOD
            total_amount,
            notes = ''
        } = orderData;

        console.log('🛒 CREATING ORDER:', { 
            user_id, 
            customer_name, 
            total_amount,
            items_count: items.length 
        });

        // Tạo order number
        const orderNumber = 'PS' + Date.now().toString().slice(-8);
        console.log('📋 Order number:', orderNumber);

        // ✅ FIX: THÊM billing_address (default = shipping_address)
        const billing_address = shipping_address;

         // 1. Tạo order
        const [newOrder] = await trx('orders')
            .insert({
                order_number: orderNumber,
                user_id,
                customer_email,
                customer_name,
                customer_phone,
                shipping_address: JSON.stringify(shipping_address),
                billing_address: JSON.stringify(billing_address),
                subtotal,
                shipping_fee,
                shipping_method: shipping_method, // ✅ THÊM VÀO DATABASE
                tax_amount: 0,
                discount_amount: 0,
                total_amount,
                payment_method,
                payment_status: 'pending',
                order_status: 'pending',
                notes,
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            })
            .returning('*');

            console.log('✅ ORDER CREATED WITH ID:', newOrder.id);

            // 2. Tạo order items
            console.log('📦 Creating order items...');
            const orderItems = items.map(item => ({
                order_id: newOrder.id,
                product_id: item.product_id,
                product_name: item.name,
                product_sku: item.sku,
                product_image_url: item.main_image_url,
                quantity: item.quantity,
                unit_price: item.discount_price || item.price,
                total_price: (item.discount_price || item.price) * item.quantity,
                created_at: db.fn.now()
            }));

            await trx('order_items').insert(orderItems);
            console.log('✅ ORDER ITEMS CREATED:', orderItems.length);

            // 3. Cập nhật tồn kho
            console.log('📊 Updating stock quantities...');
            for (const item of items) {
                await trx('products')
                    .where('id', item.product_id)
                    .decrement('stock_quantity', item.quantity);
                console.log(`   - Product ${item.product_id}: -${item.quantity}`);
            }

            // 4. Xóa cart items
            console.log('🗑️ Removing cart items...');
            const productIds = items.map(item => item.product_id);
            const deletedCount = await trx('cart_items')
                .where('user_id', user_id)
                .whereIn('product_id', productIds)
                .delete();

            console.log('✅ CART ITEMS DELETED:', deletedCount);

            // Commit transaction
            await trx.commit();
            console.log('🎉 TRANSACTION COMPLETED SUCCESSFULLY');
            
            return newOrder;

        } catch (error) {
            await trx.rollback();
            console.error('💥 Create order error:', error);
            throw new Error(`Không thể tạo đơn hàng: ${error.message}`);
        }
    },

    // Lấy đơn hàng theo user
    async findByUserId(userId) {
        try {
            const orders = await db('orders')
                .where('user_id', userId)
                .orderBy('created_at', 'desc');

            console.log(`📋 Found ${orders.length} orders for user ${userId}`);
            return orders;
        } catch (error) {
            console.error('Find orders by user error:', error);
            return [];
        }
    },

    // Lấy chi tiết đơn hàng
    async findById(orderId, userId = null) {
        try {
            let query = db('orders').where('id', orderId);

            if (userId) {
                query = query.where('user_id', userId);
            }

            const order = await query.first();

            if (order) {
                // Lấy order items
                order.items = await db('order_items')
                    .where('order_id', orderId);

                // Parse shipping address
                if (order.shipping_address && typeof order.shipping_address === 'string') {
                    try {
                        order.shipping_address = JSON.parse(order.shipping_address);
                    } catch (parseError) {
                        console.error('Error parsing shipping address:', parseError);
                        order.shipping_address = {};
                    }
                }

                console.log(`📦 Order ${orderId} found with ${order.items.length} items`);
            } else {
                console.log(`❌ Order ${orderId} not found`);
            }

            return order;
        } catch (error) {
            console.error('Find order by id error:', error);
            return null;
        }
    },

    // Cập nhật trạng thái đơn hàng
    async updateStatus(orderId, status) {
        try {
            const result = await db('orders')
                .where('id', orderId)
                .update({
                    order_status: status,
                    updated_at: db.fn.now()
                });

            console.log(`🔄 Order ${orderId} status updated to: ${status}`);
            return result;
        } catch (error) {
            console.error('Update order status error:', error);
            throw error;
        }
    }
};