import express from 'express';
import { AddCategory, AddProduct, AddOrder,UpdateProduct,DeleteProduct,DeleteCategory, GetCategories, GetProducts, GetProductById } from '../controllers/ShopController.js';

const router = express.Router()

router.get('/get-categories',GetCategories)
router.get('/get-products',GetProducts)
router.get('/get-product/:id',GetProductById)
router.post('/add-category',AddCategory)
router.post('/add-product',AddProduct)
router.post('/add-order',AddOrder)
router.put('/update-product/:id',UpdateProduct)
router.delete('/delete-product/:id',DeleteProduct)
router.delete('/delete-category/:id',DeleteCategory)
export default router
