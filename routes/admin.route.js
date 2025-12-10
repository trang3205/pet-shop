import express from 'express';
import { requireAdmin } from '../middlewares/auth.js';
import db from '../utils/db.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import otpService from '../utils/otp.service.js';
import emailService from '../utils/email.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for uploads (profiles and shop logo)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // choose folder depending on route usage
        const dest = path.join(__dirname, '../static/imgs/');
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const router = express.Router();

// Basic routes without authentication
router.get('/', (req, res) => {
    res.redirect('/admin/dashboard');
});

router.get('/login', (req, res) => {
    res.render('vwAdmin/login');
});

// ========== ADMIN FORGOT PASSWORD ==========
router.get('/forgot-password', (req, res) => {
    res.render('vwAdmin/forgot-password', { error: null });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.render('vwAdmin/forgot-password', { error: 'Vui lòng nhập email.' });
    }

    try {
        const user = await db('users').where('email', email).where('role', 'admin').first();
        
        if (!user) {
            return res.render('vwAdmin/forgot-password', { error: 'Email không tồn tại hoặc không phải tài khoản Admin.' });
        }

        // Send OTP
        const otpCode = await otpService.create(email, 'forgot');
        await emailService.sendOTP(email, otpCode, 'forgot');

        // Store admin email in session
        req.session.adminResetEmail = email;

        return res.redirect(`/admin/verify-reset-otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.render('vwAdmin/forgot-password', { error: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    }
});

router.get('/verify-reset-otp', (req, res) => {
    const email = req.query.email;
    if (!email || !req.session.adminResetEmail) {
        return res.redirect('/admin/forgot-password');
    }
    res.render('vwAdmin/verify-reset-otp', { email, error: null });
});

router.post('/verify-reset-otp', async (req, res) => {
    const { email, otp_code } = req.body;
    if (!email || !otp_code || !req.session.adminResetEmail) {
        return res.redirect('/admin/forgot-password');
    }

    try {
        const isValid = await otpService.verify(email, otp_code, 'forgot');
        if (!isValid) {
            return res.render('vwAdmin/verify-reset-otp', { email, error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }

        // Store admin email for password reset
        req.session.adminResetEmail = email;
        return res.redirect(`/admin/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
        console.error('OTP verification error:', error);
        return res.render('vwAdmin/verify-reset-otp', { email, error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    }
});

router.get('/reset-password', (req, res) => {
    const email = req.query.email;
    if (!email || !req.session.adminResetEmail) {
        return res.redirect('/admin/forgot-password');
    }
    res.render('vwAdmin/reset-password', { email, error: null });
});

router.post('/reset-password', async (req, res) => {
    const { email, password, confirm_password } = req.body;
    if (!email || !password || !confirm_password || !req.session.adminResetEmail) {
        return res.redirect('/admin/forgot-password');
    }

    if (password !== confirm_password) {
        return res.render('vwAdmin/reset-password', { email, error: 'Mật khẩu xác nhận không khớp.' });
    }

    if (password.length < 6) {
        return res.render('vwAdmin/reset-password', { email, error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db('users')
            .where('email', email)
            .where('role', 'admin')
            .update({ password: hashedPassword });

        delete req.session.adminResetEmail;
        res.render('vwAdmin/reset-password-success');
    } catch (error) {
        console.error('Reset password error:', error);
        return res.render('vwAdmin/reset-password', { email, error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    }
});

// Protected routes with authentication
const protectedRoutes = express.Router();
protectedRoutes.use(requireAdmin);

protectedRoutes.get('/dashboard', async (req, res) => {
    try {
        const totalCustomers = await db('users').where('role', 'customer').count('* as count').first();
        const totalManagers = await db('users').where('role', 'manager').count('* as count').first();
        const totalProducts = await db('products').count('* as count').first();
        const totalOrders = await db('orders').count('* as count').first();

        res.render('vwAdmin/dashboard', {
            layout: 'admin',
            title: 'Dashboard',
            active: 'dashboard',
            user: req.session.user,
            stats: {
                totalCustomers: totalCustomers.count,
                totalManagers: totalManagers.count,
                totalProducts: totalProducts.count,
                totalOrders: totalOrders.count
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load dashboard' });
    }
});

// Customer Locks
protectedRoutes.get('/customer-locks', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 12;
        const offset = (page - 1) * itemsPerPage;

        // Get total count
        const countResult = await db('users').where('role', 'customer').count('* as count').first();
        const totalCustomers = countResult.count;
        const totalPages = Math.ceil(totalCustomers / itemsPerPage);

        // Get paginated customers
        const customers = await db('users')
            .where('role', 'customer')
            .limit(itemsPerPage)
            .offset(offset)
            .orderBy('created_at', 'desc');

        res.render('vwAdmin/customer-locks', {
            layout: 'admin',
            title: 'Customer Account Locks',
            active: 'customer-locks',
            customers,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalCustomers,
                itemsPerPage,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                pages: Array.from({ length: totalPages }, (_, i) => i + 1)
            }
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load customers' });
    }
});

protectedRoutes.post('/customer-locks/toggle/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await db.select('*').from('users').where('id', userId).first();
        
        if (!user) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Toggle the locked status
        const isCurrentlyLocked = user.is_locked || false;
        const newLockedStatus = !isCurrentlyLocked;
        
        await db('users')
            .where('id', userId)
            .update({ is_locked: newLockedStatus });
        
        const message = newLockedStatus ? 'Customer account locked successfully' : 'Customer account unlocked successfully';
        console.log('✅', message);
        res.json({ message });
    } catch (error) {
        console.error('❌ Error toggling customer lock:', error.message);
        res.status(500).json({ message: 'Could not toggle customer lock: ' + error.message });
    }
});

// Manager Locks
protectedRoutes.get('/manager-locks', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 12;
        const offset = (page - 1) * itemsPerPage;

        // Get total count
        const countResult = await db('users').where('role', 'manager').count('* as count').first();
        const totalManagers = countResult.count;
        const totalPages = Math.ceil(totalManagers / itemsPerPage);

        // Get paginated managers
        const managers = await db('users')
            .where('role', 'manager')
            .limit(itemsPerPage)
            .offset(offset)
            .orderBy('created_at', 'desc');

        res.render('vwAdmin/manager-locks', {
            layout: 'admin',
            title: 'Manager Account Locks',
            active: 'manager-locks',
            managers,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalManagers,
                itemsPerPage,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                pages: Array.from({ length: totalPages }, (_, i) => i + 1)
            }
        });
    } catch (error) {
        console.error('Error fetching managers:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load managers' });
    }
});

protectedRoutes.post('/manager-locks/toggle/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await db.select('*').from('users').where('id', userId).first();
        
        if (!user) {
            return res.status(404).json({ message: 'Manager not found' });
        }
        
        // Toggle the locked status
        const isCurrentlyLocked = user.is_locked || false;
        const newLockedStatus = !isCurrentlyLocked;
        
        await db('users')
            .where('id', userId)
            .update({ is_locked: newLockedStatus });
        
        const message = newLockedStatus ? 'Manager account locked successfully' : 'Manager account unlocked successfully';
        console.log('✅', message);
        res.json({ message });
    } catch (error) {
        console.error('❌ Error toggling manager lock:', error.message);
        res.status(500).json({ message: 'Could not toggle manager lock: ' + error.message });
    }
});

// Admin Profile
protectedRoutes.get('/profile', async (req, res) => {
    const adminId = req.session.user.id;
    const admin = await db.select('*').from('users').where('id', adminId).first();
    
    res.render('vwAdmin/profile', {
        layout: 'admin',
        title: 'Admin Profile',
        active: 'profile',
        admin
    });
});

// Update Admin Profile
protectedRoutes.post('/profile/update', upload.single('avatar'), async (req, res) => {
    try {
        const adminId = req.session.user.id;
        const { name, phone, password } = req.body;

        console.log('🔧 Update Profile Request:', { name, phone, avatar: req.file?.filename });

        // Prepare update data
        const updateData = {
            name,
            phone: phone || null
        };

        // Add avatar if uploaded
        if (req.file) {
            updateData.avatar_url = req.file.filename;
        }

        // Hash password if provided
        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update database
        await db('users')
            .where('id', adminId)
            .update(updateData);

        // Update session user info
        req.session.user.name = name;
        if (req.file) {
            req.session.user.avatar_url = req.file.filename;
        }

        console.log('✅ Profile updated successfully');
        res.json({ message: 'Profile updated successfully!' });
    } catch (error) {
        console.error('❌ Error updating profile:', error.message);
        res.status(500).json({ message: 'Could not update profile: ' + error.message });
    }
});

protectedRoutes.get('/customers', async (req, res) => {
    try {
        const customersPerPage = 10;
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search || '';

        const customerOffset = (page - 1) * customersPerPage;

        let allCustomers = await db.select('*').from('users').where('role', 'customer');

        if (searchQuery) {
            allCustomers = allCustomers.filter(customer => 
                customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                customer.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const totalCustomers = allCustomers.length;
        const totalPages = Math.ceil(totalCustomers / customersPerPage);

        const customers = allCustomers.slice(customerOffset, customerOffset + customersPerPage);

        res.render('vwAdmin/customers', {
            layout: 'admin',
            title: 'Customers Management',
            active: 'customers',
            customers,
            currentPage: page,
            totalPages,
            totalCustomers,
            searchQuery
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load customers' });
    }
});

protectedRoutes.get('/managers', async (req, res) => {
    try {
        const adminsPerPage = 3;
        const managersPerPage = 3;
        const page = parseInt(req.query.page) || 1;

        const adminOffset = (page - 1) * adminsPerPage;
        const managerOffset = (page - 1) * managersPerPage;

        const allAdmins = await db.select('*').from('users').where('role', 'admin');
        const allManagers = await db.select('*').from('users').where('role', 'manager');

        const totalAdmins = allAdmins.length;
        const totalManagers = allManagers.length;

        const totalPages = Math.ceil(Math.max(totalAdmins / adminsPerPage, totalManagers / managersPerPage));

        const admins = allAdmins.slice(adminOffset, adminOffset + adminsPerPage);
        const managers = allManagers.slice(managerOffset, managerOffset + managersPerPage);

        res.render('vwAdmin/managers', {
            layout: 'admin',
            title: 'Manager Management',
            active: 'managers',
            admins,
            managers,
            currentPage: page,
            totalPages,
            totalAdmins,
            totalManagers
        });
    } catch (error) {
        console.error('Error fetching managers:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load managers' });
    }
});

// Shop Settings - read config from file
protectedRoutes.get('/shop-settings', async (req, res) => {
    try {
        // Get shop info from shop_settings table
        let shop = { id: 1, name: 'PetShop', phone: '', email: '', street_address: '', province: '', district: '', ward: '' };
        try {
            const result = await db('shop_settings').where('id', 1).first();
            if (result) {
                shop = result;
            }
        } catch (err) {
            console.log('Shop settings not found, using defaults');
        }

        res.render('vwAdmin/shop-settings', {
            layout: 'admin',
            title: 'Shop Settings',
            active: 'shop-settings',
            shop
        });
    } catch (error) {
        console.error('Error loading shop settings:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load shop settings' });
    }
});

// Update shop settings
protectedRoutes.post('/shop-settings/update', upload.single('logo'), async (req, res) => {
    try {
        const { name, phone, email, street_address, province, district, ward } = req.body;

        // Prepare update data
        const updateData = {
            name: name || 'PetShop',
            phone: phone || '',
            email: email || '',
            street_address: street_address || '',
            province: province || '',
            district: district || '',
            ward: ward || '',
            updated_at: new Date()
        };

        // Update or insert into shop_settings table (id = 1)
        const existing = await db('shop_settings').where('id', 1).first();
        
        if (existing) {
            await db('shop_settings').where('id', 1).update(updateData);
        } else {
            await db('shop_settings').insert({
                id: 1,
                ...updateData,
                created_at: new Date()
            });
        }

        res.json({ success: true, message: 'Shop settings updated successfully' });
    } catch (error) {
        console.error('Error updating shop settings:', error);
        res.status(500).json({ success: false, message: 'Could not update shop settings' });
    }
});

// Contacts - Xem tin nhắn liên hệ
protectedRoutes.get('/contacts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 10;
        const offset = (page - 1) * pageSize;

        // Get total count
        const countResult = await db('contacts').count('id as total').first();
        const totalContacts = countResult?.total || 0;
        const totalPages = Math.ceil(totalContacts / pageSize);

        // Get unread count
        const unreadResult = await db('contacts').where('is_read', false).count('id as count').first();
        const unreadCount = unreadResult?.count || 0;

        // Get contacts with pagination
        const contacts = await db('contacts')
            .orderBy('created_at', 'desc')
            .limit(pageSize)
            .offset(offset);

        res.render('vwAdmin/contacts', {
            layout: 'admin',
            title: 'Contact Messages',
            active: 'contacts',
            contacts,
            currentPage: page,
            totalPages,
            totalContacts,
            unreadCount
        });
    } catch (error) {
        console.error('Error loading contacts:', error);
        res.render('vwAdmin/contacts', {
            layout: 'admin',
            title: 'Contact Messages',
            active: 'contacts',
            contacts: [],
            currentPage: 1,
            totalPages: 0,
            totalContacts: 0,
            error: 'Lỗi khi tải tin nhắn'
        });
    }
});

// Mark contact as read
protectedRoutes.put('/contacts/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db('contacts').where('id', id).update({ is_read: true });
        
        res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        console.error('Error marking contact as read:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi đánh dấu đã đọc' });
    }
});

// Delete contact message
protectedRoutes.delete('/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db('contacts').where('id', id).delete();
        
        res.json({ success: true, message: 'Tin nhắn đã được xóa' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa tin nhắn' });
    }
});

protectedRoutes.get('/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const sortBy = req.query.sort || 'name';
        const pageSize = 4;
        const offset = (page - 1) * pageSize;

        // Build base query for filtering
        let baseQuery = db('products');

        // Apply search filter
        if (search) {
            baseQuery = baseQuery.where(db.raw(`name ILIKE ?`, [`%${search}%`]));
        }

        // Apply category filter
        if (category && category !== '') {
            baseQuery = baseQuery.where('category_id', category);
        }

        // Get total count with filters applied
        const countQuery = baseQuery.clone().count('id as count').first();
        const totalCountResult = await countQuery;
        const totalCount = totalCountResult?.count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Apply sorting
        let query = baseQuery.clone();
        if (sortBy === 'price') {
            query = query.orderBy('price');
        } else if (sortBy === 'stock') {
            query = query.orderBy('stock');
        } else {
            query = query.orderBy('name');
        }

        // Apply pagination
        const products = await query.offset(offset).limit(pageSize).select('*');

        // Get categories for filter dropdown
        const categories = await db('categories').select('*');

        res.render('vwAdmin/products', {
            layout: 'admin',
            title: 'Product Management',
            active: 'products',
            products,
            categories,
            currentPage: page,
            totalPages,
            search,
            category,
            sortBy
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load products' });
    }
});

// Add new customer
protectedRoutes.post('/customers/add', async (req, res) => {
    try {
        console.log('🔧 Add Customer Request Body:', req.body);
        const { name, email, phone, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const newCustomer = {
            name,
            email,
            phone,
            password: hashedPassword,
            role: 'customer',
            created_at: new Date()
        };

        await db('users').insert(newCustomer);
        console.log('✅ Customer added successfully:', newCustomer);
        res.json({ message: 'Customer added successfully!' });
    } catch (error) {
        console.error('❌ Error adding customer:', error.message);
        res.status(500).json({ message: 'Could not add customer: ' + error.message });
    }
});

// Edit customer
protectedRoutes.post('/customers/edit/:id', async (req, res) => {
    try {
        console.log('🔧 Edit Customer Request Body:', req.body);
        const { name, email, phone, password } = req.body;
        const customerId = req.params.id;

        if (!name || !email) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const updateData = {
            name,
            email,
            phone
        };

        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await db('users')
            .where('id', customerId)
            .update(updateData);

        console.log('✅ Customer updated successfully:', updateData);
        res.json({ message: 'Customer updated successfully!' });
    } catch (error) {
        console.error('❌ Error editing customer:', error.message);
        res.status(500).json({ message: 'Could not edit customer: ' + error.message });
    }
});

// Delete customer
protectedRoutes.post('/customers/delete/:id', async (req, res) => {
    try {
        const customerId = req.params.id;

        await db('users')
            .where('id', customerId)
            .del();

        res.redirect('/admin/customers');
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not delete customer' });
    }
});

// Add new manager
protectedRoutes.post('/managers/add', async (req, res) => {
    try {
        console.log('🔧 Add Manager Request Body:', req.body);
        const { name, email, phone, password, role } = req.body;
        
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate role
        if (!['admin', 'manager'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const newManager = {
            name,
            email,
            phone,
            password: hashedPassword,
            role: role,
            created_at: new Date()
        };

        await db('users').insert(newManager);
        console.log('✅ Manager added successfully:', newManager);
        res.json({ message: 'Manager added successfully!' });
    } catch (error) {
        console.error('❌ Error adding manager:', error.message);
        res.status(500).json({ message: 'Could not add manager: ' + error.message });
    }
});

// Edit manager
protectedRoutes.post('/managers/edit/:id', async (req, res) => {
    try {
        console.log('🔧 Edit Manager Request Body:', req.body);
        const { name, email, phone, password, role } = req.body;
        const managerId = req.params.id;

        if (!name || !email) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate role if provided
        if (role && !['admin', 'manager'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected' });
        }

        const updateData = {
            name,
            email,
            phone
        };

        if (role) {
            updateData.role = role;
        }

        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await db('users')
            .where('id', managerId)
            .update(updateData);

        console.log('✅ Manager updated successfully:', updateData);
        res.json({ message: 'Manager updated successfully!' });
    } catch (error) {
        console.error('❌ Error editing manager:', error.message);
        res.status(500).json({ message: 'Could not edit manager: ' + error.message });
    }
});

// Delete manager
protectedRoutes.post('/managers/delete/:id', async (req, res) => {
    try {
        const managerId = req.params.id;

        await db('users')
            .where('id', managerId)
            .del();

        res.json({ success: true, message: 'Manager deleted successfully' });
    } catch (error) {
        console.error('Error deleting manager:', error);
        res.status(500).json({ success: false, message: 'Could not delete manager' });
    }
});

// Activity History - New route for viewing activity logs
protectedRoutes.get('/activity-history', async (req, res) => {
    try {
        // Get all sessions with user details
        let sessions = await db.raw(`
            SELECT 
                s.id,
                s.user_id,
                u.name,
                u.email,
                u.role AS role,
                s.login_time,
                s.logout_time,
                s.duration_minutes,
                s.created_at
            FROM sessions s
            INNER JOIN users u ON s.user_id = u.id
            ORDER BY s.login_time DESC
        `);

        sessions = sessions.rows || sessions;

        res.render('vwAdmin/activity-history', {
            layout: 'admin',
            title: 'Activity History',
            active: 'activity-history',
            sessions
        });
    } catch (error) {
        console.error('Error fetching activity history:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load activity history' });
    }
});

protectedRoutes.get('/activity-history/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Get user details
        const userDetails = await db('users').select('*').where('id', userId).first();

        if (!userDetails) {
            return res.status(404).render('404', { title: 'Error', message: 'User not found' });
        }

        // Get all sessions for this user
        let userSessions = await db('sessions')
            .where('user_id', userId)
            .orderBy('login_time', 'desc');

        // Calculate duration for sessions that have logout_time but no duration_minutes
        for (let session of userSessions) {
            if (session.logout_time && !session.duration_minutes) {
                const loginTime = new Date(session.login_time);
                const logoutTime = new Date(session.logout_time);
                const durationMinutes = Math.floor((logoutTime - loginTime) / (1000 * 60));
                session.duration_minutes = durationMinutes;
                
                // Update database with calculated duration
                await db('sessions').where('id', session.id).update({
                    duration_minutes: durationMinutes
                });
            }
        }

        res.render('vwAdmin/activity-details', {
            layout: 'admin',
            title: `Activity Details for ${userDetails.name}`,
            userDetails,
            userSessions
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load user details' });
    }
});

router.use('/', protectedRoutes);

export default router;