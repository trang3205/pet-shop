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

protectedRoutes.get('/dashboard', (req, res) => {
    res.render('vwAdmin/dashboard', {
        layout: 'admin',
        title: 'Admin Dashboard',
        active: 'dashboard'
    });
});

// Customer Locks
protectedRoutes.get('/customer-locks', async (req, res) => {
    const customers = await db.select('*').from('users').where('role', 'customer');
    res.render('vwAdmin/customer-locks', {
        layout: 'admin',
        title: 'Customer Account Locks',
        active: 'customer-locks',
        customers
    });
});

protectedRoutes.post('/customer-locks/toggle/:id', async (req, res) => {
    const userId = req.params.id;
    const user = await db.select('is_locked').from('users').where('id', userId).first();
    
    await db('users')
        .where('id', userId)
        .update({ is_locked: !user.is_locked });
        
    res.redirect('/admin/customer-locks');
});

// Manager Locks
protectedRoutes.get('/manager-locks', async (req, res) => {
    const managers = await db.select('*').from('users').where('role', 'manager');
    res.render('vwAdmin/manager-locks', {
        layout: 'admin',
        title: 'Manager Account Locks',
        active: 'manager-locks',
        managers
    });
});

protectedRoutes.post('/manager-locks/toggle/:id', async (req, res) => {
    const userId = req.params.id;
    const user = await db.select('is_locked').from('users').where('id', userId).first();
    
    await db('users')
        .where('id', userId)
        .update({ is_locked: !user.is_locked });
        
    res.redirect('/admin/manager-locks');
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

        // Redirect back with success message
        res.redirect('/admin/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).render('404', { 
            title: 'Error',
            message: 'An error occurred while updating your profile.' 
        });
    }
});

protectedRoutes.get('/customers', (req, res) => {
    res.render('vwAdmin/customers', {
        layout: 'admin',
        title: 'Customer Management',
        active: 'customers'
    });
});

// Shop Settings - read config from file
protectedRoutes.get('/shop-settings', async (req, res) => {
    try {
        const cfgPath = path.join(__dirname, '../config/shop.json');
        let shop = { name: '', phone: '', address: '', logo: null };
        try {
            const raw = await fs.readFile(cfgPath, 'utf8');
            shop = JSON.parse(raw);
        } catch (err) {
            // ignore if file missing
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
        const { name, phone, address } = req.body;
        const cfgDir = path.join(__dirname, '../config');
        const cfgPath = path.join(cfgDir, 'shop.json');

        // ensure directories exist
        await fs.mkdir(path.join(__dirname, '../static/imgs/shop'), { recursive: true });
        await fs.mkdir(cfgDir, { recursive: true });

        let shop = { name: name || '', phone: phone || '', address: address || '' };

        // if file was uploaded, move it to shop folder
        if (req.file) {
            const tmpPath = req.file.path;
            const destName = 'logo-' + Date.now() + path.extname(req.file.originalname);
            const destPath = path.join(__dirname, '../static/imgs/shop', destName);
            await fs.rename(tmpPath, destPath);
            shop.logo = destName;
        } else {
            // preserve existing logo if exists
            try {
                const raw = await fs.readFile(cfgPath, 'utf8');
                const prev = JSON.parse(raw);
                if (prev && prev.logo) shop.logo = prev.logo;
            } catch (e) {}
        }

        await fs.writeFile(cfgPath, JSON.stringify(shop, null, 2), 'utf8');

        // redirect back
        res.redirect('/admin/shop-settings');
    } catch (error) {
        console.error('Error updating shop settings:', error);
        res.status(500).render('404', { title: 'Error', message: 'Could not update shop settings' });
    }
});

protectedRoutes.get('/managers', (req, res) => {
    res.render('vwAdmin/managers', {
        layout: 'admin',
        title: 'Manager Management',
        active: 'managers'
    });
});

protectedRoutes.get('/products', (req, res) => {
    res.render('vwAdmin/products', {
        layout: 'admin',
        title: 'Product Management',
        active: 'products'
    });
});

router.use('/', protectedRoutes);

router.get('/dashboard', (req, res) => {
    res.render('vwAdmin/dashboard');
});

router.get('/customers', (req, res) => {
    res.render('vwAdmin/customers');
});

router.get('/managers', (req, res) => {
    res.render('vwAdmin/managers');
});

router.get('/products', (req, res) => {
    res.render('vwAdmin/products');
});

export default router;