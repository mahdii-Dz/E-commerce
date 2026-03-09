import express from 'express';
import { AddCategory, AddProduct, AddOrder,UpdateProduct,DeleteProduct,DeleteCategory, GetCategories, GetProducts, GetProductById, GetProductsByCategory, GetDashboardStats, GetOrders } from '../controllers/ShopController.js';

const router = express.Router()
//GEt
router.get('/get-categories',GetCategories)
router.get('/get-products',GetProducts)
router.get('/get-orders',GetOrders)
    //by id or category
    router.get('/get-product/:id',GetProductById)
    router.get('/get-products/category/:categoryId',GetProductsByCategory)
    //Stats 
    router.get('/get-stats', GetDashboardStats)
//POST
router.post('/add-category',AddCategory)
router.post('/add-product',AddProduct)
router.post('/add-order',AddOrder)
//PUT
router.put('/update-product/:id',UpdateProduct)
//DELETE
router.delete('/delete-product/:id',DeleteProduct)
router.delete('/delete-category/:id',DeleteCategory)
export default router
