import express from 'express';
import { AddCategory, AddProduct, AddOrder,UpdateProduct,DeleteProduct,DeleteCategory, GetCategories, GetProducts, GetProductById, GetProductsByCategory, GetDashboardStats, GetOrders, AcceptOrder, RejectOrder, getBanners, updateBanners } from '../controllers/ShopController.js';
import { verifyAdminSession } from '../middleware/sessionAuth.js';

const router = express.Router();

// Public GET routes - no authentication required
router.get('/get-categories', GetCategories);
router.get('/get-products', GetProducts);
router.get('/get-banners', getBanners);
router.get('/get-product/:id', GetProductById);
router.get('/get-products/category/:categoryId', GetProductsByCategory);

// Customer order placement - public
router.post('/add-order', AddOrder);

// Protected GET routes - require admin session (expose sensitive data)
router.get('/get-orders', verifyAdminSession, GetOrders);
router.get('/get-stats', verifyAdminSession, GetDashboardStats);

// Protected write routes - require admin session
router.post('/add-category', verifyAdminSession, AddCategory);
router.post('/add-product', verifyAdminSession, AddProduct);
router.put('/update-product/:id', verifyAdminSession, UpdateProduct);
router.put('/accept-order/:id', verifyAdminSession, AcceptOrder);
router.put('/reject-order/:id', verifyAdminSession, RejectOrder);
router.put('/update-banners', verifyAdminSession, updateBanners);
router.delete('/delete-product/:id', verifyAdminSession, DeleteProduct);
router.delete('/delete-category/:id', verifyAdminSession, DeleteCategory);

//////////////////////////////////////////////////////////////////////////////////////

// router.get('/get-orders',  GetOrders);
// router.get('/get-stats',  GetDashboardStats);

// // Protected write routes - require admin session
// router.post('/add-category',  AddCategory);
// router.post('/add-product', AddProduct);
// router.put('/update-product/:id',  UpdateProduct);
// router.put('/accept-order/:id',  AcceptOrder);
// router.put('/reject-order/:id',  RejectOrder);
// router.put('/update-banners',  updateBanners);
// router.delete('/delete-product/:id',  DeleteProduct);
// router.delete('/delete-category/:id',  DeleteCategory);



export default router;
