import express from 'express';
import { AddCategory, AddProduct, AddOrder, UpdateProduct, DeleteProduct, DeleteCategory, GetCategories, GetProducts, GetProductById, GetProductsByCategory, GetDashboardStats, GetOrders, AcceptOrder, RejectOrder, UpdateOrder, getBanners, updateBanners, GetProductReviews, AddUserReview, AddAdminReview, DeleteReview, AddLeftedOrder, GetLeftedOrders, UpdateLeftedOrder, DeleteLeftedOrder, ConvertLeftedOrder, DeleteLeftedOrderPublic, GetDeliveryWilayas, UpdateDeliveryWilayas, GetWilayaBaladiyas, UpdateWilayaStopDesk, GetDeliveryStats, GetPublicWilayas } from '../controllers/ShopController.js';
import { verifyAdminSession } from '../middleware/sessionAuth.js';

const router = express.Router();


// Public GET routes - no authentication required
router.get('/get-categories', GetCategories);
router.get('/get-products', GetProducts);
router.get('/get-banners', getBanners);
router.get('/get-product/:id', GetProductById);
router.get('/get-products/category/:categoryId', GetProductsByCategory);

// Public review routes
router.get('/get-product/:id/reviews', GetProductReviews);
router.post('/add-product/:id/review', AddUserReview);

// Customer order placement - public
router.post('/add-order', AddOrder);

// Lefted orders - public
router.post('/add-lefted-order', AddLeftedOrder);
router.post('/delete-lefted-order', DeleteLeftedOrderPublic);

// Protected GET routes - require admin session (expose sensitive data)
router.get('/get-orders', verifyAdminSession, GetOrders);
router.get('/get-stats', verifyAdminSession,GetDashboardStats);

// Lefted orders - admin
router.get('/get-lefted-orders', verifyAdminSession, GetLeftedOrders);
router.put('/update-lefted-order/:id', verifyAdminSession, UpdateLeftedOrder);
router.delete('/delete-lefted-order/:id', verifyAdminSession, DeleteLeftedOrder);
router.post('/convert-lefted-order/:id', verifyAdminSession, ConvertLeftedOrder);

// Protected write routes - require admin session
router.post('/add-category', verifyAdminSession, AddCategory);
router.post('/add-product', verifyAdminSession, AddProduct);
router.put('/update-product/:id', verifyAdminSession,UpdateProduct);
router.post('/add-product/:id/review/admin', verifyAdminSession,AddAdminReview);
router.delete('/reviews/:id', verifyAdminSession, DeleteReview);
router.put('/accept-order/:id', verifyAdminSession, AcceptOrder);
router.put('/reject-order/:id', verifyAdminSession, RejectOrder);
router.put('/update-order/:id', verifyAdminSession, UpdateOrder);
router.put('/update-banners', verifyAdminSession, updateBanners);
router.delete('/delete-product/:id', verifyAdminSession,DeleteProduct);
router.delete('/delete-category/:id', verifyAdminSession,DeleteCategory);

// Delivery / Wilaya routes
router.get('/get-public-wilayas', GetPublicWilayas);

router.get('/get-delivery-wilayas', verifyAdminSession, GetDeliveryWilayas);
router.put('/update-delivery-wilayas', verifyAdminSession, UpdateDeliveryWilayas);
router.get('/get-wilaya-baladiyas/:code', verifyAdminSession, GetWilayaBaladiyas);
router.put('/update-wilaya-stopdesk/:code', verifyAdminSession, UpdateWilayaStopDesk);
router.get('/get-delivery-stats', verifyAdminSession, GetDeliveryStats);

export default router;