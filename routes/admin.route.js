import express from 'express';
import { requireAdmin } from '../middlewares/auth.js';
import db from '../utils/db.js';

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

protectedRoutes.get('/customers', (req, res) => {
    res.render('vwAdmin/customers', {
        layout: 'admin',
        title: 'Customer Management',
        active: 'customers'
    });
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