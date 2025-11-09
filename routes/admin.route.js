import express from 'express';
import { requireAdmin } from '../middlewares/auth.js';

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