-- TiDB Database Indexes for E-commerce Query Optimization
-- Run this script on your TiDB database to add composite indexes
-- These indexes will significantly reduce RU consumption for filtered queries

-- Note: The schema uses a product_categories pivot table, not a category_id column on products.

-- Composite index for product_categories pivot table (most common JOIN path)
CREATE INDEX IF NOT EXISTS idx_product_categories_product 
ON product_categories(product_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_category 
ON product_categories(category_id);

-- Composite index for price + is_active filtering (most common product query)
CREATE INDEX IF NOT EXISTS idx_products_price_active 
ON products(price, is_active);

-- Composite index for created_at + is_active (newest/oldest sorting)
CREATE INDEX IF NOT EXISTS idx_products_created_active 
ON products(created_at, is_active);

-- Index for discount_percentage + is_active (Promotions route)
CREATE INDEX IF NOT EXISTS idx_products_discount_active 
ON products(discount_percentage, is_active);

-- Index for category name lookups
CREATE INDEX IF NOT EXISTS idx_categories_name 
ON categories(name);

-- Composite index for product search with stock status
CREATE INDEX IF NOT EXISTS idx_products_active_stock 
ON products(is_active, stock);

-- Index for order_info status lookups (Orders page)
CREATE INDEX IF NOT EXISTS idx_order_info_status 
ON order_info(status);

-- Index for order_items lookup by order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order 
ON order_items(order_id);

-- Index for order_items lookup by product_id
CREATE INDEX IF NOT EXISTS idx_order_items_product 
ON order_items(product_id);

-- Index for reviews lookup by product_id
CREATE INDEX IF NOT EXISTS idx_reviews_product 
ON reviews(product_id);

-- Verify indexes were created
SHOW INDEX FROM products;
SHOW INDEX FROM product_categories;
SHOW INDEX FROM categories;
SHOW INDEX FROM order_info;
SHOW INDEX FROM order_items;
SHOW INDEX FROM reviews;
