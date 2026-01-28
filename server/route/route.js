import express from 'express';
import { AddCategory, AddProduct, AddOrder,UpdateProduct,DeleteProduct,DeleteCategory } from '../controllers/ShopController.js';

const router = express.Router()

router.post('/add-category',AddCategory)
router.post('/add-product',AddProduct)
router.post('/add-order',AddOrder)
router.put('/update-product/:id',UpdateProduct)
router.delete('/delete-product/:id',DeleteProduct)
router.delete('/delete-category/:id',DeleteCategory)
export default router
