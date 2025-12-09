import express from 'express';
import { requireAdmin } from '../middlewares/auth.js';
import db from '../utils/db.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';

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

// Protected routes with authentication
const protectedRoutes = express.Router();
protectedRoutes.use(requireAdmin);

protectedRoutes.get('/dashboard', async (req, res) => {
    try {
        // Get counts from database
        const totalCustomers = await db('users').where('role', 'customer').count('id as count').first();
        const totalManagers = await db('users').where('role', 'manager').count('id as count').first();
        const totalProducts = await db('products').count('id as count').first();
        const totalOrders = await db('orders').count('id as count').first();

        res.render('vwAdmin/dashboard', {
            layout: 'admin',
            title: 'Admin Dashboard',
            active: 'dashboard',
            stats: {
                totalCustomers: totalCustomers?.count || 0,
                totalManagers: totalManagers?.count || 0,
                totalProducts: totalProducts?.count || 0,
                totalOrders: totalOrders?.count || 0
            }
        });
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        res.render('vwAdmin/dashboard', {
            layout: 'admin',
            title: 'Admin Dashboard',
            active: 'dashboard',
            stats: {
                totalCustomers: 0,
                totalManagers: 0,
                totalProducts: 0,
                totalOrders: 0
            }
        });
    }
});

// Customer Locks
protectedRoutes.get('/customer-locks', async (req, res) => {
    try {
        const customers = await db.select('*').from('users').where('role', 'customer');
        res.render('vwAdmin/customer-locks', {
            layout: 'admin',
            title: 'Customer Account Locks',
            active: 'customer-locks',
            customers
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
        const managers = await db.select('*').from('users').where('role', 'manager');
        res.render('vwAdmin/manager-locks', {
            layout: 'admin',
            title: 'Manager Account Locks',
            active: 'manager-locks',
            managers
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
            updateData.avatar = req.file.filename;
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
            req.session.user.avatar = req.file.filename;
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
        const customers = await db.select('*').from('users').where('role', 'customer');
        res.render('vwAdmin/customers', {
            layout: 'admin',
            title: 'Customer Management',
            active: 'customers',
            customers
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not load customers' });
    }
});

protectedRoutes.get('/managers', async (req, res) => {
    try {
        const managers = await db.select('*').from('users').where('role', 'manager');
        res.render('vwAdmin/managers', {
            layout: 'admin',
            title: 'Manager Management',
            active: 'managers',
            managers
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
        let shop = { id: 1, name: 'PetShop', phone: '', street_address: '', province: '', district: '', ward: '' };
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
        const { name, phone, street_address, province, district, ward } = req.body;

        // Prepare update data
        const updateData = {
            name: name || 'PetShop',
            phone: phone || '',
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
        const { name, email, phone, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const newManager = {
            name,
            email,
            phone,
            password: hashedPassword,
            role: 'manager',
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
        const { name, email, phone, password } = req.body;
        const managerId = req.params.id;

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

        res.redirect('/admin/managers');
    } catch (error) {
        console.error('Error deleting manager:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not delete manager' });
    }
});

router.use('/', protectedRoutes);

export default router;