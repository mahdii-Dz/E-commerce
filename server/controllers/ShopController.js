// controllers/ShopController.js
import { query, execute } from '../db.js';
import axios from 'axios';

// Netlify cache invalidation
const NETLIFY_BUILD_HOOK = process.env.NETLIFY_BUILD_HOOK;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

async function triggerNetlifyRebuild() {
  if (!NETLIFY_BUILD_HOOK) {
    console.warn('⚠️ NETLIFY_BUILD_HOOK not configured, skipping rebuild');
    return;
  }
  try {
    await axios.post(NETLIFY_BUILD_HOOK, {}, { timeout: 10000 });
    console.log('✅ Netlify rebuild triggered');
  } catch (error) {
    console.error('❌ Netlify rebuild failed:', error.message);
  }
}

async function purgeNetlifyCacheTag(tag = 'products') {
  if (!NETLIFY_AUTH_TOKEN || !NETLIFY_SITE_ID) {
    console.warn('⚠️ Netlify cache purge not configured');
    return;
  }
  try {
    await axios.post(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/cache-tags/${tag}/purge`,
      {},
      { headers: { Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}` }, timeout: 10000 }
    );
    console.log(`✅ Netlify cache tag '${tag}' purged`);
  } catch (error) {
    console.error('❌ Netlify cache purge failed:', error.message);
  }
}

async function invalidateNetlifyCache() {
  await Promise.allSettled([
    triggerNetlifyRebuild(),
    purgeNetlifyCacheTag('products'),
    purgeNetlifyCacheTag('categories'),
  ]);
}

// Helper function for safe JSON parsing
const safeJsonParse = (str, defaultValue = null) => {
  if (!str) return defaultValue;
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch (e) {
    console.error('JSON parse error:', e);
    return defaultValue;
  }
};

const normalizeImage = (img) => {
  if (typeof img === 'string') return { url: img, public_id: null };
  if (img && typeof img === 'object') return { url: img.url || '', public_id: img.public_id || img.publicId || null };
  return { url: '', public_id: null };
};

// Helper function to validate ID
const validateId = (id) => {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
};

const handleDbError = (res, error, context) => {
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ error: `Error ${context}: ${error.message}` });
};

// ==================== CATEGORY CONTROLLERS ====================

export const GetCategories = async (req, res) => {
  try {
    const rows = await query("SELECT * FROM categories ORDER BY id");
    
    if (!rows || !Array.isArray(rows)) {
      return res.status(200).json([]);
    }
    
    return res.status(200).json(rows);
  } catch (error) {
    return handleDbError(res, error, 'fetching categories');
  }
};

// Invalidate cache after category changes
async function invalidateCategoryCache() {
  await Promise.allSettled([
    triggerNetlifyRebuild(),
    purgeNetlifyCacheTag('categories'),
    purgeNetlifyCacheTag('products'),
  ]);
}

export const AddCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const result = await execute(
      "INSERT INTO categories (name) VALUES (?)",
      [name.trim()]
    );

    let categoryId = result.insertId;

    if (!categoryId || categoryId === 0) {
      const lastIdResult = await query('SELECT LAST_INSERT_ID() as id');
      categoryId = lastIdResult && lastIdResult[0] ? lastIdResult[0].id : 0;
    }

    if (!categoryId || categoryId === 0) {
      return res.status(500).json({ error: "Failed to retrieve category ID" });
    }

    // Invalidate cache
    await invalidateCategoryCache();

    return res.status(201).json({ 
      message: "Category added successfully",
      categoryId: categoryId 
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Category already exists" });
    }
    return handleDbError(res, error, "adding category");
  }
};

export const DeleteCategory = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid category ID" });

    // Verify exists first
    const check = await query("SELECT id FROM categories WHERE id = ?", [id]);
    if (!check || check.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    await execute(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    // Invalidate cache
    await invalidateCategoryCache();

    return res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ 
        error: "Cannot delete category with existing products" 
      });
    }
    return handleDbError(res, error, "deleting category");
  }
};

// ==================== PRODUCT CONTROLLERS ====================

// Build WHERE clause for product filtering
function buildProductWhereClause({ category, minPrice, maxPrice, minDiscount }) {
  const conditions = ['p.is_active = true'];
  const values = [];

  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    conditions.push('p.price >= ?');
    values.push(parseFloat(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    conditions.push('p.price <= ?');
    values.push(parseFloat(maxPrice));
  }

  if (minDiscount !== undefined && minDiscount !== null && minDiscount !== '' && parseFloat(minDiscount) > 0) {
    conditions.push('p.discount_percentage >= ?');
    values.push(parseFloat(minDiscount));
  }

  return { where: conditions.join(' AND '), values, category };
}

// Build ORDER BY clause
function buildProductOrderBy(sort) {
  const sortMap = {
    'Newest': 'p.created_at DESC',
    'Oldest': 'p.created_at ASC',
    'PriceLow': 'p.price ASC',
    'PriceHigh': 'p.price DESC',
    'TopSold': 'COALESCE(sales.total_sold, 0) DESC, p.created_at DESC',
  };
  return sortMap[sort] || 'p.created_at DESC';
}

export const GetProducts = async (req, res) => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      minDiscount,
      sort, 
      page = 1, 
      limit = 12 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const { where, values, category: catFilter } = buildProductWhereClause({ category, minPrice, maxPrice, minDiscount });
    const orderBy = buildProductOrderBy(sort);

    // Build category filter for WHERE clause
    let categoryFilter = '';
    let categoryValues = [];
    if (catFilter) {
      categoryFilter = `AND EXISTS (
        SELECT 1 FROM product_categories pc2 
        JOIN categories c2 ON pc2.category_id = c2.id 
        WHERE pc2.product_id = p.id AND c2.name = ?
      )`;
      categoryValues = [catFilter];
    }

    // Sales join for TopSold sorting
    const isTopSold = sort === 'TopSold';
    const salesJoin = isTopSold ? `
      LEFT JOIN (
        SELECT oi.product_id, SUM(oi.quantity) as total_sold
        FROM order_items oi
        GROUP BY oi.product_id
      ) sales ON p.id = sales.product_id
    ` : '';

    // Count total for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      ${salesJoin}
      WHERE ${where} ${categoryFilter}
    `;
    const countResult = await query(countQuery, [...values, ...categoryValues]);
    const total = countResult?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    // Main query - fetch products without categories first
    const productQuery = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.big_description,
        p.discount_percentage,
        p.price,
        p.image_url,
        p.is_active,
        p.images,
        p.thumbnail,
        p.created_at,
        p.type,
        p.offers,
        p.colors
      FROM products p
      ${salesJoin}
      WHERE ${where} ${categoryFilter}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const productValues = [...values, ...categoryValues, limitNum, offset];
    const rows = await query(productQuery, productValues);

    // Fetch categories separately for these products
    const productIds = rows.map(r => r.id);
    let categoriesMap = new Map();
    
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const catQuery = `
        SELECT 
          pc.product_id,
          c.id AS category_id,
          c.name AS category_name
        FROM product_categories pc
        JOIN categories c ON pc.category_id = c.id
        WHERE pc.product_id IN (${placeholders})
      `;
      const catRows = await query(catQuery, productIds);
      
      for (const catRow of catRows) {
        if (!categoriesMap.has(catRow.product_id)) {
          categoriesMap.set(catRow.product_id, []);
        }
        categoriesMap.get(catRow.product_id).push({
          id: catRow.category_id,
          name: catRow.category_name
        });
      }
    }

    if (!rows || !Array.isArray(rows)) {
      return res.status(200).json({ products: [], total, page: pageNum, totalPages });
    }

    const products = rows.map(row => ({
      id: row.id,
      name: row.name,
      discount_percentage: row.discount_percentage || 0,
      description: row.description,
      big_description: row.big_description,
      price: parseFloat(row.price) || 0,
      image_url: row.image_url,
      images: safeJsonParse(row.images, []).map(normalizeImage),
      thumbnail: row.thumbnail,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      type: row.type,
      colors: safeJsonParse(row.colors, null),
      offers: safeJsonParse(row.offers, null),
      categories: categoriesMap.get(row.id) || [],
    }));

    return res.status(200).json({ products, total, page: pageNum, totalPages });
  } catch (error) {
    return handleDbError(res, error, "fetching products");
  }
};

export const GetProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const productIdNum = validateId(id);
    
    if (!productIdNum) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Fetch product first
    const productRows = await query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.big_description,
        p.discount_percentage,
        p.price,
        p.image_url,
        p.thumbnail,
        p.images,
        p.is_active,
        p.created_at,
        p.type,
        p.colors,
        p.offers
      FROM products p
      WHERE p.id = ? AND p.is_active = true
    `, [productIdNum]);

    if (!productRows || productRows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productRows[0];

    // Fetch categories separately
    const catRows = await query(`
      SELECT 
        c.id AS category_id,
        c.name AS category_name
      FROM product_categories pc
      JOIN categories c ON pc.category_id = c.id
      WHERE pc.product_id = ?
    `, [productIdNum]);

    product.categories = catRows.map(catRow => ({
      id: catRow.category_id,
      name: catRow.category_name
    }));

    // Parse JSON fields
    product.images = safeJsonParse(product.images, []).map(normalizeImage);
    product.colors = safeJsonParse(product.colors, null);
    product.offers = safeJsonParse(product.offers, null);
    product.price = parseFloat(product.price) || 0;
    product.discount_percentage = product.discount_percentage || 0;
    product.is_active = product.is_active === 1;

    return res.status(200).json(product);
  } catch (error) {
    return handleDbError(res, error, "fetching product");
  }
};

export const GetProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const categoryIdNum = validateId(categoryId);
    
    if (!categoryIdNum) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Main query - filter by category using EXISTS to avoid GROUP BY issues
    const productQuery = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.big_description,
        p.discount_percentage,
        p.price,
        p.image_url,
        p.thumbnail,
        p.images,
        p.is_active,
        p.created_at,
        p.type,
        p.offers
      FROM products p
      WHERE p.is_active = true
        AND EXISTS (
          SELECT 1 FROM product_categories pc 
          JOIN categories c ON pc.category_id = c.id 
          WHERE pc.product_id = p.id AND c.id = ?
        )
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query(productQuery, [categoryIdNum, limitNum, offset]);

    // Fetch categories for these products
    const productIds = rows.map(r => r.id);
    let categoriesMap = new Map();
    
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const catQuery = `
        SELECT 
          pc.product_id,
          c.id AS category_id,
          c.name AS category_name
        FROM product_categories pc
        JOIN categories c ON pc.category_id = c.id
        WHERE pc.product_id IN (${placeholders})
      `;
      const catRows = await query(catQuery, productIds);
      
      for (const catRow of catRows) {
        if (!categoriesMap.has(catRow.product_id)) {
          categoriesMap.set(catRow.product_id, []);
        }
        categoriesMap.get(catRow.product_id).push({
          id: catRow.category_id,
          name: catRow.category_name
        });
      }
    }

    // Get total count
    const countResult = await query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      WHERE p.is_active = true
        AND EXISTS (
          SELECT 1 FROM product_categories pc 
          JOIN categories c ON pc.category_id = c.id 
          WHERE pc.product_id = p.id AND c.id = ?
        )
    `, [categoryIdNum]);
    
    const total = countResult?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    if (!rows || !Array.isArray(rows)) {
      return res.status(200).json({ products: [], total, page: pageNum, totalPages });
    }

    const productMap = new Map();

    for (const row of rows) {
      const productId = row.id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: row.id,
          name: row.name,
          discount_percentage: row.discount_percentage || 0,
          description: row.description,
          big_description: row.big_description,
          price: parseFloat(row.price) || 0,
          image_url: row.image_url,
          thumbnail: row.thumbnail,
          images: safeJsonParse(row.images, []).map(normalizeImage),
          is_active: row.is_active === 1,
          created_at: row.created_at,
          type: row.type,
          offers: safeJsonParse(row.offers, null),
          categories: categoriesMap.get(productId) || [],
        });
      }
    }

    const products = Array.from(productMap.values());
    return res.status(200).json({ products, total, page: pageNum, totalPages });
  } catch (error) {
    return handleDbError(res, error, "fetching products by category");
  }
};

export const AddProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      big_description,
      price,
      categoryIds,
      type,
      images,
      discount_percentage,
      thumbnail,
      colors,
      offers,
    } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ error: "categoryIds must be an array" });
    }

    // Insert product
    const productResult = await execute(
      `INSERT INTO products (
        name, description, big_description, price, type, images,
        thumbnail, discount_percentage, colors, offers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || null,
        big_description || null,
        price,
        type || null,
        JSON.stringify((images || []).map(normalizeImage)),
        thumbnail || null,
        discount_percentage || 0,
        colors ? JSON.stringify(colors) : null,
        offers ? JSON.stringify(offers) : null,
      ]
    );

    let productId = productResult.insertId;

    // If insertId is 0 or missing, fetch it using LAST_INSERT_ID()
    if (!productId || productId === 0) {
      const lastIdResult = await query('SELECT LAST_INSERT_ID() as id');
      productId = lastIdResult && lastIdResult[0] ? lastIdResult[0].id : 0;
    }
    
    if (!productId || productId === 0) {
      return res.status(500).json({ error: "Failed to retrieve product ID" });
    }

    // Insert category relationships
    if (categoryIds.length > 0) {
      const validCategoryIds = categoryIds
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id) && id > 0);

      if (validCategoryIds.length > 0) {
        for (const catId of validCategoryIds) {
          await execute(
            "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
            [productId, catId]
          );
        }
      }
    }

    // Invalidate Netlify cache
    await invalidateNetlifyCache();

    return res.status(201).json({
      message: "Product created successfully",
      productId: productId,
    });
  } catch (error) {
    return handleDbError(res, error, "creating product");
  }
};
export const UpdateProduct = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid product ID" });

    const {
      name,
      description,
      big_description,
      price,
      discount_percentage,
      images,
      thumbnail,
      type,
      categoryIds,
      colors,
      offers,
    } = req.body;

    // Verify product exists first
    const productCheck = await query(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );
    
    if (!productCheck || productCheck.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update product — if no error, it succeeded
    await execute(
      `UPDATE products
       SET name = ?, description = ?, big_description = ?, price = ?,
           discount_percentage = ?, images = ?, thumbnail = ?,
           type = ?, colors = ?, offers = ?
       WHERE id = ?`,
      [
        name?.trim(),
        description || null,
        big_description || null,
        price,
        discount_percentage || 0,
        JSON.stringify((images || []).map(normalizeImage)),
        thumbnail || null,
        type || null,
        colors ? JSON.stringify(colors) : null,
        offers ? JSON.stringify(offers) : null,
        id,
      ]
    );

    // Update categories if provided
    if (categoryIds && Array.isArray(categoryIds)) {
      // Delete existing categories
      await execute(
        "DELETE FROM product_categories WHERE product_id = ?",
        [id]
      );

      const validIds = categoryIds
        .map(cid => parseInt(cid, 10))
        .filter(cid => !isNaN(cid) && cid > 0);

      if (validIds.length > 0) {
        for (const catId of validIds) {
          await execute(
            "INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)",
            [id, catId]
          );
        }
      }
    }

    // Invalidate Netlify cache
    await invalidateNetlifyCache();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    return handleDbError(res, error, "updating product");
  }
};

export const DeleteProduct = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid product ID" });

    // Verify product exists first
    const check = await query("SELECT id FROM products WHERE id = ?", [id]);
    if (!check || check.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete category relationships first
    await execute(
      "DELETE FROM product_categories WHERE product_id = ?",
      [id]
    );
    
    // Delete product — if no error, it succeeded
    await execute(
      "DELETE FROM products WHERE id = ?",
      [id]
    );

    // Invalidate Netlify cache
    await invalidateNetlifyCache();

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    return handleDbError(res, error, "deleting product");
  }
};

// ==================== ORDER CONTROLLERS ====================

export const AddOrder = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      wilaya,
      wilaya_code,
      baladiya,
      delivery_type,
      delivery_Price,
      items,
    } = req.body;

    if (!first_name || !phone || !wilaya || !baladiya) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required and cannot be empty" });
    }
    
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.price_per_unit) {
        return res.status(400).json({ error: "Each item must have product_id, quantity, and price_per_unit" });
      }
    }

    const orderInfo = await execute(
      `INSERT INTO order_info
       (first_name, last_name, phone, wilaya, baladiya,
        delivery_type, delivery_Price, wilaya_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name.trim(),
        last_name ? last_name.trim() : null,
        phone,
        wilaya,
        baladiya,
        delivery_type,
        delivery_Price || 0,
        wilaya_code
      ]
    );

    let orderId = orderInfo.insertId;
    
    if (!orderId || orderId === 0) {
      const lastIdResult = await query('SELECT LAST_INSERT_ID() as id');
      orderId = lastIdResult && lastIdResult[0] ? lastIdResult[0].id : 0;
    }
    
    if (!orderId || orderId === 0) {
      return res.status(500).json({ error: "Failed to retrieve order ID" });
    }

    for (const item of items) {
      await execute(
        `INSERT INTO order_items
         (order_id, product_id, quantity, price_per_unit, color_name, color_hex, offer_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.price_per_unit,
          item.color_name || null,
          item.color_hex || null,
          item.offer_text || null
        ]
      );
    }

    return res.status(201).json({
      message: "Order created successfully",
      orderId: orderId
    });
  } catch (error) {
    return handleDbError(res, error, "creating order");
  }
};

export const GetOrders = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        o.id AS order_id,
        o.first_name,
        o.last_name,
        o.phone,
        CONCAT(o.baladiya, ',', o.wilaya) AS address,
        o.baladiya,
        o.wilaya,
        o.wilaya_code,
        o.delivery_type,
        o.delivery_Price,
        o.status,
        oi.quantity,
        oi.color_name,
        oi.color_hex,
        ROUND(oi.price_per_unit) AS price,
        ROUND(oi.quantity * oi.price_per_unit) AS fullPrice,
        p.name AS product_name,
        p.id AS product_id,
        oi.offer_text
      FROM
        order_info o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id 
        WHERE o.status = 'pending'
      ORDER BY o.id DESC
    `);

    if (!rows || !Array.isArray(rows)) {
      return res.status(200).json([]);
    }

    const ordersMap = new Map();

    for (const row of rows) {
      const orderId = row.order_id;

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          order_id: orderId,
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone,
          address: row.address,
          baladiya: row.baladiya,
          wilaya: row.wilaya,
          wilaya_code: row.wilaya_code,
          delivery_type: row.delivery_type,
          delivery_Price: Number(row.delivery_Price) || 0,
          status: row.status,
          items: [],
          totalPrice: 0
        });
      }

      const order = ordersMap.get(orderId);
      
      // Find or create item
      let item = order.items.find(i => i.product_id === row.product_id && i.offer_text === (row.offer_text || ''));
      if (!item) {
        item = {
          product_id: row.product_id,
          product_name: row.product_name,
          quantity: 0,
          price_per_unit: Number(row.price) || 0,
          fullPrice: 0,
          offer_text: row.offer_text || null,
          colors: []
        };
        order.items.push(item);
      }

      const qty = Number(row.quantity) || 0;
      const fullPrice = Number(row.fullPrice) || 0;
      item.quantity += qty;
      item.fullPrice += fullPrice;

      item.colors.push({
        color_name: row.color_name,
        color_hex: row.color_hex,
        quantity: qty
      });
    }

    // Calculate total price for each order
    for (const order of ordersMap.values()) {
      const subtotal = order.items.reduce((sum, item) => sum + Number(item.fullPrice), 0);
      order.totalPrice = subtotal + Number(order.delivery_Price || 0);
    }

    const groupedOrders = Array.from(ordersMap.values());
    return res.status(200).json(groupedOrders);
  } catch (error) {
    return handleDbError(res, error, "fetching orders");
  }
};

export const UpdateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = validateId(id);

    if (!orderId) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const {
      first_name,
      last_name,
      phone,
      wilaya,
      baladiya,
      delivery_type,
      delivery_Price,
      wilaya_code
    } = req.body;

    // Check if order exists and is pending
    const orderCheck = await query(
      "SELECT status FROM order_info WHERE id = ?",
      [orderId]
    );

    if (!orderCheck || orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (orderCheck[0].status !== 'pending') {
      return res.status(403).json({ error: "Only pending orders can be edited" });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    const allowedFields = [
      'first_name', 'last_name', 'phone', 'wilaya',
      'baladiya', 'delivery_type', 'delivery_Price', 'wilaya_code'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        const value = req.body[field];
        values.push(typeof value === 'string' ? value.trim() : value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(orderId);

    // Execute update — if no error, it succeeded
    await execute(
      `UPDATE order_info SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    return handleDbError(res, error, "updating order");
  }
};

export const AcceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = validateId(id);

    if (!orderId) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Verify order exists and get current status
    const orderCheck = await query(
      "SELECT id, status FROM order_info WHERE id = ?",
      [orderId]
    );

    if (!orderCheck || orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Prevent re-accepting already accepted orders
    if (orderCheck[0].status === 'accepted') {
      return res.status(409).json({ error: "Order is already accepted" });
    }

    await execute(
      "UPDATE order_info SET status = 'accepted' WHERE id = ?",
      [orderId]
    );

    return res.status(200).json({ message: "Order accepted successfully" });
  } catch (error) {
    return handleDbError(res, error, "accepting order");
  }
};

export const RejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = validateId(id);

    if (!orderId) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Verify order exists first
    const orderCheck = await query(
      "SELECT id, status FROM order_info WHERE id = ?",
      [orderId]
    );

    if (!orderCheck || orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const currentStatus = orderCheck[0].status;
    
    // Prevent rejecting already rejected orders
    if (currentStatus === 'rejected') {
      return res.status(409).json({ error: "Order is already rejected" });
    }

    await execute(
      "UPDATE order_info SET status = 'rejected' WHERE id = ?",
      [orderId]
    );

    return res.status(200).json({ message: "Order rejected successfully" });
  } catch (error) {
    return handleDbError(res, error, "rejecting order");
  }
};

// ==================== BANNER CONTROLLERS ====================

export const getBanners = async (req, res) => {
  try {
    const banners = await query('SELECT * FROM banners ORDER BY position ASC');
    
    return res.status(200).json({
      success: true,
      banners: banners || []
    });
  } catch (error) {
    return handleDbError(res, error, 'fetching banners');
  }
};

// Invalidate cache after banner changes
async function invalidateBannerCache() {
  await Promise.allSettled([
    triggerNetlifyRebuild(),
    purgeNetlifyCacheTag('banners'),
  ]);
}

export const updateBanners = async (req, res) => {
  try {
    const { banners } = req.body;

    if (!banners || !Array.isArray(banners)) {
      return res.status(400).json({
        success: false,
        error: 'Banners array is required'
      });
    }

    for (const banner of banners) {
      if (banner.position === undefined || banner.position === null || !banner.url) {
        return res.status(400).json({
          success: false,
          error: 'Each banner must have position and url'
        });
      }
    }

    for (const banner of banners) {
      await execute(
        `INSERT INTO banners (position, url, public_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         url = VALUES(url),
         public_id = VALUES(public_id)`,
        [banner.position, banner.url, banner.publicId || null]
      );
    }

    // Invalidate cache
    await invalidateBannerCache();

    return res.status(200).json({
      success: true,
      message: 'Banners saved successfully',
      banners: banners
    });
  } catch (error) {
    return handleDbError(res, error, 'updating banners');
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { position } = req.params;

    // Verify banner exists first
    const check = await query("SELECT position FROM banners WHERE position = ?", [position]);
    if (!check || check.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Banner not found'
      });
    }

    await execute(
      'DELETE FROM banners WHERE position = ?',
      [position]
    );

    // Invalidate cache
    await invalidateBannerCache();

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    return handleDbError(res, error, 'deleting banner');
  }
};

// ==================== REVIEWS CONTROLLERS ====================

export const GetProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const productIdNum = validateId(id);
    
    if (!productIdNum) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const rows = await query(
      `SELECT id, product_id, customer_name, review_text, stars, image_url, is_admin, created_at
       FROM reviews
       WHERE product_id = ?
       ORDER BY created_at DESC`,
      [productIdNum]
    );

    const reviews = (rows || []).map(review => ({
      ...review,
      created_at: review.created_at,
      is_admin: Boolean(review.is_admin)
    }));

    return res.status(200).json({
      success: true,
      reviews,
      total: reviews.length
    });
  } catch (error) {
    return handleDbError(res, error, "fetching reviews");
  }
};

export const AddUserReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, review_text, stars } = req.body;

    const productIdNum = validateId(id);
    if (!productIdNum) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length === 0) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    if (!review_text || typeof review_text !== "string" || review_text.trim().length === 0) {
      return res.status(400).json({ error: "Review text is required" });
    }

    const starsNum = parseInt(stars, 10);
    if (!starsNum || starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: "Stars must be between 1 and 5" });
    }

    // Verify product exists
    const productCheck = await query(
      "SELECT id FROM products WHERE id = ?",
      [productIdNum]
    );
    
    if (!productCheck || productCheck.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const result = await execute(
      `INSERT INTO reviews (product_id, customer_name, review_text, stars, image_url, is_admin)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productIdNum,
        customer_name.trim(),
        review_text.trim(),
        starsNum,
        null,
        false
      ]
    );

    let reviewId = result.insertId;

    // Fallback for TiDB Serverless
    if (!reviewId || reviewId === 0) {
      const lastIdResult = await query('SELECT LAST_INSERT_ID() as id');
      reviewId = lastIdResult && lastIdResult[0] ? lastIdResult[0].id : 0;
    }

    if (!reviewId || reviewId === 0) {
      return res.status(500).json({ error: "Failed to retrieve review ID" });
    }

    const newReviewRows = await query(
      "SELECT * FROM reviews WHERE id = ?",
      [reviewId]
    );
    const newReview = newReviewRows[0];

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: newReview
    });
  } catch (error) {
    return handleDbError(res, error, "adding user review");
  }
};

export const AddAdminReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, review_text, stars, image_url } = req.body;

    const productIdNum = validateId(id);
    if (!productIdNum) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length === 0) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    if (!review_text || typeof review_text !== "string" || review_text.trim().length === 0) {
      return res.status(400).json({ error: "Review text is required" });
    }

    const starsNum = parseInt(stars, 10);
    if (!starsNum || starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: "Stars must be between 1 and 5" });
    }

    // Verify product exists
    const productCheck = await query(
      "SELECT id FROM products WHERE id = ?",
      [productIdNum]
    );
    
    if (!productCheck || productCheck.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const result = await execute(
      `INSERT INTO reviews (product_id, customer_name, review_text, stars, image_url, is_admin)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productIdNum,
        customer_name.trim(),
        review_text.trim(),
        starsNum,
        image_url || null,
        true
      ]
    );

    let reviewId = result.insertId;

    // Fallback for TiDB Serverless
    if (!reviewId || reviewId === 0) {
      const lastIdResult = await query('SELECT LAST_INSERT_ID() as id');
      reviewId = lastIdResult && lastIdResult[0] ? lastIdResult[0].id : 0;
    }

    if (!reviewId || reviewId === 0) {
      return res.status(500).json({ error: "Failed to retrieve review ID" });
    }

    const newReviewRows = await query(
      "SELECT * FROM reviews WHERE id = ?",
      [reviewId]
    );
    const newReview = newReviewRows[0];

    return res.status(201).json({
      success: true,
      message: "Admin review added successfully",
      review: newReview
    });
  } catch (error) {
    return handleDbError(res, error, "adding admin review");
  }
};

export const DeleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewIdNum = validateId(id);

    if (!reviewIdNum) {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    // Check if review exists
    const existing = await query(
      "SELECT id FROM reviews WHERE id = ?",
      [reviewIdNum]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Delete — if no error, it succeeded
    await execute(
      "DELETE FROM reviews WHERE id = ?",
      [reviewIdNum]
    );

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    return handleDbError(res, error, "deleting review");
  }
};

// ==================== DASHBOARD CONTROLLERS ====================

export const GetDashboardStats = async (req, res) => {
  try {
    // Get total products
    const totalProductsResult = await query(
      "SELECT COUNT(*) AS total_products FROM products"
    );
    
    // Get total orders
    const totalOrdersResult = await query(
      "SELECT COUNT(*) AS total_orders FROM order_info"
    );
    
    // Get total sold products
    const totalSoldProductsResult = await query(
      `SELECT SUM(oi.quantity) AS total_sold_products
       FROM order_items oi
       JOIN order_info o ON oi.order_id = o.id
       WHERE o.status = 'completed'`
    );
    
    // Get bar chart data
    const barChartData = await query(`
      SELECT created_at, quantity
      FROM order_info
      JOIN order_items ON order_info.id = order_items.order_id
      WHERE order_info.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);
    
    // Get category stats
    const categoryStats = await query(`
      SELECT 
        pc.category_id,
        c.name as category_name,
        SUM(oi.quantity) as total_quantity_sold
      FROM order_items oi
      JOIN product_categories pc ON oi.product_id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY pc.category_id, c.name
    `);
    
    // Get wilaya stats
    const wilayaStats = await query(`
      SELECT wilaya, COUNT(*) AS totalOrders
      FROM order_info
      GROUP BY wilaya
      ORDER BY totalOrders DESC
      LIMIT 10
    `);

    // Process daily totals
    const dailyTotals = Object.entries(
      (barChartData || []).reduce((acc, order) => {
        const day = new Date(order.created_at).toISOString().split("T")[0];
        acc[day] = (acc[day] || 0) + (order.quantity || 0);
        return acc;
      }, {})
    ).map(([day, total]) => ({ day, total }));
    
    const totalProducts = totalProductsResult?.[0]?.total_products || 0;
    const totalOrders = totalOrdersResult?.[0]?.total_orders || 0;
    const totalSoldProducts = totalSoldProductsResult?.[0]?.total_sold_products || 0;

    return res.status(200).json({
      totalProducts,
      totalOrders,
      totalSoldProducts,
      dailyTotals,
      CategoryStats: categoryStats || [],
      wilayaStats: wilayaStats || [],
    });
  } catch (error) {
    return handleDbError(res, error, "fetching dashboard stats");
  }
};