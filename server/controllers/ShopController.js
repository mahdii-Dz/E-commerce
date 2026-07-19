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
  if (typeof img === 'string') return { url: img, public_id: null, is_active: true };
  if (img && typeof img === 'object') return {
    url: img.url || '',
    public_id: img.public_id || img.publicId || null,
    is_active: img.is_active !== false,
  };
  return { url: '', public_id: null, is_active: true };
};

const filterActive = (items) => {
  if (!items || !Array.isArray(items)) return items;
  return items.filter(item => item.is_active !== false);
};

// Helper function to validate ID
const validateId = (id) => {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
};

function generateOrderNumber() {
  const p1 = Math.random().toString(16).substring(2, 10).toUpperCase();
  const p2 = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `${p1}-${p2}`;
}

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
        p.compare_price,
        p.image_url,
        p.is_active,
        p.images,
        p.landing_page_image,
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
      compare_price: parseFloat(row.compare_price) || 0,
      image_url: row.image_url,
      images: filterActive(safeJsonParse(row.images, []).map(normalizeImage)),
      landing_page_image: row.landing_page_image,
      thumbnail: row.thumbnail,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      type: row.type,
      colors: filterActive(safeJsonParse(row.colors, null)),
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
    const isAdmin = req.query.admin === 'true';

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
        p.compare_price,
        p.image_url,
        p.thumbnail,
        p.images,
        p.landing_page_image,
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
    product.landing_page_image = product.landing_page_image || null;
    product.price = parseFloat(product.price) || 0;
    product.compare_price = parseFloat(product.compare_price) || 0;
    product.discount_percentage = product.discount_percentage || 0;
    product.is_active = product.is_active === 1;

    // For public requests, filter out inactive images and colors
    if (!isAdmin) {
      product.images = filterActive(product.images);
      if (product.colors) {
        product.colors = filterActive(product.colors);
      }
    }

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
        p.compare_price,
        p.image_url,
        p.thumbnail,
        p.images,
        p.is_active,
        p.created_at,
        p.type,
        p.colors,
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
          compare_price: parseFloat(row.compare_price) || 0,
          image_url: row.image_url,
          thumbnail: row.thumbnail,
          images: filterActive(safeJsonParse(row.images, []).map(normalizeImage)),
          is_active: row.is_active === 1,
          created_at: row.created_at,
          type: row.type,
          colors: filterActive(safeJsonParse(row.colors, null)),
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
      landing_page_image,
      discount_percentage,
      thumbnail,
      colors,
      offers,
      compare_price,
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
        name, description, big_description, price, compare_price, type, images,
        landing_page_image, thumbnail, discount_percentage, colors, offers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || null,
        big_description || null,
        price,
        compare_price || 0,
        type || null,
        JSON.stringify((images || []).map(normalizeImage)),
        landing_page_image || null,
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
      landing_page_image,
      thumbnail,
      type,
      categoryIds,
      colors,
      offers,
      compare_price,
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
           compare_price = ?, discount_percentage = ?, images = ?,
           landing_page_image = ?, thumbnail = ?,
           type = ?, colors = ?, offers = ?
       WHERE id = ?`,
      [
        name?.trim(),
        description || null,
        big_description || null,
        price,
        compare_price || 0,
        discount_percentage || 0,
        JSON.stringify((images || []).map(normalizeImage)),
        landing_page_image !== undefined ? landing_page_image : null,
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
  let orderId = null;
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
      free_delivery,
      current_status,
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

    const orderNumber = generateOrderNumber();

    const orderInfo = await execute(
      `INSERT INTO order_info
       (first_name, last_name, phone, wilaya, baladiya,
        delivery_type, delivery_Price, free_delivery, wilaya_code, current_status, order_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name.trim(),
        last_name ? last_name.trim() : null,
        phone,
        wilaya,
        baladiya,
        delivery_type,
        delivery_Price || 0,
        free_delivery ? 1 : 0,
        wilaya_code,
        current_status || 'new',
        orderNumber
      ]
    );

    orderId = orderInfo.insertId;
    
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

    // Delete all lefted orders with this phone number
    try {
      await execute('DELETE FROM lefted_orders WHERE phone = ?', [phone]);
    } catch (_) {}

    return res.status(201).json({
      message: "Order created successfully",
      orderId: orderId,
      orderNumber: orderNumber
    });
  } catch (error) {
    if (orderId) {
      try { await execute('DELETE FROM order_info WHERE id = ?', [orderId]); } catch (_) {}
    }
    return handleDbError(res, error, "creating order");
  }
};

export const GetOrders = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        o.id AS order_id,
        o.order_number,
        o.first_name,
        o.last_name,
        o.phone,
        CONCAT(o.baladiya, ',', o.wilaya) AS address,
        o.baladiya,
        o.wilaya,
        o.wilaya_code,
        o.delivery_type,
        o.delivery_Price,
        o.free_delivery,
        o.current_status,
        o.delivery_sent,
        DATE_FORMAT(DATE_ADD(o.created_at, INTERVAL 1 HOUR), '%Y-%m-%dT%H:%i:%s+01:00') AS created_at,
        oi.id AS item_id,
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
          order_number: row.order_number,
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone,
          address: row.address,
          baladiya: row.baladiya,
          wilaya: row.wilaya,
          wilaya_code: row.wilaya_code,
          delivery_type: row.delivery_type,
          delivery_Price: Number(row.delivery_Price) || 0,
          free_delivery: row.free_delivery === 1 || row.free_delivery === true,
          current_status: row.current_status || 'new',
          delivery_sent: row.delivery_sent === 1 || row.delivery_sent === true,
          created_at: row.created_at,
          items: [],
          totalPrice: 0
        });
      }

      const order = ordersMap.get(orderId);
      
      // Find or create item
      let item = order.items.find(i => i.product_id === row.product_id && i.offer_text === (row.offer_text || ''));
      if (!item) {
        item = {
          item_id: row.item_id,
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
      order.totalPrice = subtotal + (order.free_delivery ? 0 : Number(order.delivery_Price || 0));
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
      free_delivery,
      wilaya_code,
      current_status,
      items
    } = req.body;

    // Check if order exists
    const orderCheck = await query(
      "SELECT id FROM order_info WHERE id = ?",
      [orderId]
    );

    if (!orderCheck || orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    const allowedFields = [
      'first_name', 'last_name', 'phone', 'wilaya',
      'baladiya', 'delivery_type', 'delivery_Price',
      'free_delivery', 'wilaya_code', 'current_status'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        const value = req.body[field];
        values.push(typeof value === 'string' ? value.trim() : value);
      }
    });

    if (updates.length > 0) {
      values.push(orderId);
      await execute(
        `UPDATE order_info SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Delete and re-insert order items if provided
    if (Array.isArray(items) && items.length > 0) {
      await execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);

      for (const item of items) {
        const rows = (item.colors && item.colors.length > 0) ? item.colors : [{
          color_name: item.color_name || null,
          color_hex: item.color_hex || null,
          quantity: item.quantity
        }];

        for (const row of rows) {
          await execute(
            `INSERT INTO order_items (order_id, product_id, quantity, price_per_unit, color_name, color_hex, offer_text)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.product_id,
              row.quantity,
              item.price_per_unit,
              row.color_name || null,
              row.color_hex || null,
              item.offer_text || null
            ]
          );
        }
      }
    }

    return res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    return handleDbError(res, error, "updating order");
  }
};

export const MarkOrderDeliverySent = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = validateId(id);
    if (!orderId) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    await execute(
      "UPDATE order_info SET delivery_sent = 1 WHERE id = ?",
      [orderId]
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleDbError(res, error, "marking order delivery sent");
  }
};

export const AcceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = validateId(id);

    if (!orderId) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Verify order exists
    const orderCheck = await query(
      "SELECT id FROM order_info WHERE id = ?",
      [orderId]
    );

    if (!orderCheck || orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    await execute(
      "UPDATE order_info SET current_status = 'confirmed' WHERE id = ?",
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
      "SELECT id FROM order_info WHERE id = ?",
      [orderId]
    );

    if (!orderCheck || orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    await execute(
      "UPDATE order_info SET current_status = 'ملغي من المتجر' WHERE id = ?",
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
      "SELECT COUNT(*) AS total_orders FROM order_info WHERE order_number IS NOT NULL"
    );
    
    // Get total sold products
    const totalSoldProductsResult = await query(
      `SELECT SUM(oi.quantity) AS total_sold_products
       FROM order_items oi
       JOIN order_info o ON oi.order_id = o.id
       WHERE o.current_status = 'تم التوصيل'`
    );
    
    // Get bar chart data — count distinct orders per day (no JOIN to avoid item-level inflation)
    const barChartData = await query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS total
      FROM order_info
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day
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
      WHERE order_number IS NOT NULL
      GROUP BY wilaya
      ORDER BY totalOrders DESC
      LIMIT 10
    `);

    // Process daily totals — SQL already returns { day, total }, just map to keep format
    const dailyTotals = (barChartData || []).map(row => ({ day: row.day, total: row.total }));
    
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

// ==================== LEFTED ORDERS CONTROLLERS ====================

export const AddLeftedOrder = async (req, res) => {
  try {
    const { phone, first_name, last_name, wilaya, wilaya_code, baladiya, delivery_type, product_id, product_name, price_per_unit, product_price, quantity, color_name, color_hex, colors, offer_text, delivery_price } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const colorsArr = colors && Array.isArray(colors) && colors.length > 0
      ? colors
      : (color_name ? [{ name: color_name, hex: color_hex || '', quantity: quantity || 1 }] : null);

    const colorsJson = colorsArr ? JSON.stringify(colorsArr) : null;
    const finalColorName = colorsArr ? colorsArr.map(c => c.name).filter(Boolean).join(', ') : (color_name || '');
    const finalColorHex = colorsArr ? colorsArr.map(c => c.hex).filter(Boolean).join(',') : (color_hex || '');
    const finalQuantity = colorsArr ? colorsArr.reduce((s, c) => s + (Number(c.quantity) || 0), 0) : (quantity || 1);
    const finalDeliveryPrice = Number(delivery_price) || 0;

    const existing = await query(
      "SELECT id FROM lefted_orders WHERE phone = ? AND created_at > NOW() - INTERVAL 1 DAY",
      [phone]
    );

    if (existing && existing.length > 0) {
      await execute(
        `UPDATE lefted_orders SET
         first_name = ?, last_name = ?, wilaya = ?, wilaya_code = ?, baladiya = ?,
         delivery_type = ?, product_id = ?, product_name = ?, product_price = ?,
         quantity = ?, color_name = ?, color_hex = ?, colors = ?, delivery_price = ?, offer_text = ?,
         created_at = CURRENT_TIMESTAMP
         WHERE phone = ?`,
        [
          first_name || '', last_name || '', wilaya || '', wilaya_code || '', baladiya || '',
          delivery_type || 'domicile', product_id || null, product_name || '',
          price_per_unit || product_price || 0, finalQuantity,
          finalColorName, finalColorHex, colorsJson, finalDeliveryPrice, offer_text || '', phone
        ]
      );
      return res.status(200).json({ message: "Lefted order updated", id: existing[0].id });
    }

    const result = await execute(
      `INSERT INTO lefted_orders
       (phone, first_name, last_name, wilaya, wilaya_code, baladiya, delivery_type,
        product_id, product_name, product_price, quantity, color_name, color_hex, colors,
        delivery_price, offer_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        phone,
        first_name || '',
        last_name || '',
        wilaya || '',
        wilaya_code || '',
        baladiya || '',
        delivery_type || 'domicile',
        product_id || null,
        product_name || '',
        price_per_unit || product_price || 0,
        finalQuantity,
        finalColorName,
        finalColorHex,
        colorsJson,
        finalDeliveryPrice,
        offer_text || '',
      ]
    );

    return res.status(201).json({ message: "Lefted order saved", id: result.insertId });
  } catch (error) {
    return handleDbError(res, error, "saving lefted order");
  }
};

export const GetLeftedOrders = async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM lefted_orders WHERE created_at <= NOW() - INTERVAL 5 MINUTE ORDER BY created_at DESC"
    );

    const parsed = (rows || []).map(row => ({
      ...row,
      colors: row.colors ? (() => { try { return JSON.parse(row.colors); } catch { return null; } })() : null,
    }));

    return res.status(200).json(parsed || []);
  } catch (error) {
    return handleDbError(res, error, "fetching lefted orders");
  }
};

export const UpdateLeftedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, wilaya, baladiya, delivery_type, product_name, price_per_unit, product_price, quantity, color_name, color_hex, colors, offer_text, delivery_price } = req.body;

    const colorsArr = colors && Array.isArray(colors) && colors.length > 0
      ? colors
      : (color_name ? [{ name: color_name, hex: color_hex || '', quantity: quantity || 1 }] : null);

    const colorsJson = colorsArr ? JSON.stringify(colorsArr) : null;
    const finalColorName = colorsArr ? colorsArr.map(c => c.name).filter(Boolean).join(', ') : (color_name || '');
    const finalColorHex = colorsArr ? colorsArr.map(c => c.hex).filter(Boolean).join(',') : (color_hex || '');
    const finalQuantity = colorsArr ? colorsArr.reduce((s, c) => s + (Number(c.quantity) || 0), 0) : (quantity || 1);
    const finalDeliveryPrice = Number(delivery_price) || 0;

    await execute(
      `UPDATE lefted_orders SET
       first_name = ?, last_name = ?, phone = ?, wilaya = ?, baladiya = ?,
       delivery_type = ?, product_name = ?, product_price = ?, quantity = ?,
       color_name = ?, color_hex = ?, colors = ?, delivery_price = ?, offer_text = ?
       WHERE id = ?`,
      [
        first_name || '', last_name || '', phone || '', wilaya || '', baladiya || '',
        delivery_type || 'domicile', product_name || '',
        price_per_unit || product_price || 0, finalQuantity,
        finalColorName, finalColorHex, colorsJson, finalDeliveryPrice, offer_text || '', id
      ]
    );

    return res.status(200).json({ message: "Lefted order updated" });
  } catch (error) {
    return handleDbError(res, error, "updating lefted order");
  }
};

export const DeleteLeftedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM lefted_orders WHERE id = ?', [id]);
    return res.status(200).json({ message: "Lefted order dismissed" });
  } catch (error) {
    return handleDbError(res, error, "deleting lefted order");
  }
};

export const DeleteLeftedOrderPublic = async (req, res) => {
  try {
    const { id, phone } = req.body;

    if (phone && !id) {
      await execute('DELETE FROM lefted_orders WHERE phone = ?', [phone]);
      return res.status(200).json({ message: "All lefted orders deleted for this phone" });
    }

    if (!id || !phone) {
      return res.status(400).json({ error: "ID and phone are required" });
    }
    const rows = await query('SELECT * FROM lefted_orders WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    if (rows[0].phone !== phone) {
      return res.status(403).json({ error: "Phone mismatch" });
    }
    await execute('DELETE FROM lefted_orders WHERE id = ?', [id]);
    return res.status(200).json({ message: "Lefted order deleted" });
  } catch (error) {
    return handleDbError(res, error, "deleting lefted order publicly");
  }
};

export const ConvertLeftedOrder = async (req, res) => {
  let orderId = null;
  try {
    const { id } = req.params;
    const leftedRows = await query('SELECT * FROM lefted_orders WHERE id = ?', [id]);
    if (!leftedRows || leftedRows.length === 0) {
      return res.status(404).json({ error: "Lefted order not found" });
    }
    const lo = leftedRows[0];

    const orderNumber = generateOrderNumber();
    const deliveryPrice = Number(lo.delivery_price) || 0;
    const insertParams = [
      lo.first_name || 'غير محدد',
      lo.last_name || '',
      lo.phone || '',
      lo.wilaya || '',
      lo.baladiya || '',
      lo.delivery_type || 'domicile',
      deliveryPrice,
      deliveryPrice === 0 ? 1 : 0,
      lo.wilaya_code || 0,
      orderNumber,
    ];
    console.log('[ConvertLeftedOrder] insertParams:', JSON.stringify(insertParams));

    const orderInfo = await execute(
      `INSERT INTO order_info
       (first_name, last_name, phone, wilaya, baladiya,
        delivery_type, delivery_Price, free_delivery, wilaya_code, current_status, order_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
      insertParams
    );

    orderId = orderInfo.insertId;
    if (!orderId || orderId === 0) {
      return res.status(500).json({ error: "Failed to create order" });
    }

    if (lo.wilaya_code != null && lo.wilaya_code !== '') {
      try {
        await execute('UPDATE order_info SET wilaya_code = ? WHERE id = ?', [String(lo.wilaya_code), orderId]);
      } catch (_) {}
    }

    let colorsArr = null;
    try { colorsArr = lo.colors ? JSON.parse(lo.colors) : null; } catch { colorsArr = null; }
    if (!colorsArr || !Array.isArray(colorsArr) || colorsArr.length === 0) {
      colorsArr = lo.color_name
        ? [{ name: lo.color_name, hex: lo.color_hex || '', quantity: lo.quantity || 1 }]
        : null;
    }

    if (colorsArr && colorsArr.length > 0) {
      for (const c of colorsArr) {
        await execute(
          `INSERT INTO order_items
           (order_id, product_id, quantity, price_per_unit, color_name, color_hex, offer_text)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            lo.product_id,
            Number(c.quantity) || 1,
            lo.price_per_unit || lo.product_price || 0,
            c.name || null,
            c.hex || null,
            lo.offer_text || null
          ]
        );
      }
    } else {
      await execute(
        `INSERT INTO order_items
         (order_id, product_id, quantity, price_per_unit, color_name, color_hex, offer_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          lo.product_id,
          lo.quantity || 1,
          lo.price_per_unit || lo.product_price || 0,
          lo.color_name || null,
          lo.color_hex || null,
          lo.offer_text || null
        ]
      );
    }

    await execute('DELETE FROM lefted_orders WHERE id = ?', [id]);

    return res.status(200).json({
      message: "Order created from lefted order",
      orderId,
      orderNumber
    });
  } catch (error) {
    if (orderId) {
      try { await execute('DELETE FROM order_info WHERE id = ?', [orderId]); } catch (_) {}
    }
    return handleDbError(res, error, "converting lefted order");
  }
};

// ==================== DELIVERY / WILAYA CONTROLLERS ====================

export const GetDeliveryWilayas = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        w.code,
        w.name,
        w.home_delivery_price,
        w.stopdesk_delivery_price,
        w.free_delivery,
        w.is_active,
        (SELECT COUNT(*) FROM baladiyas b WHERE b.wilaya_code = w.code) AS total_baladiyas,
        (SELECT COUNT(*) FROM baladiyas b WHERE b.wilaya_code = w.code AND b.has_stopdesk = 1) AS stopdesk_baladiyas
      FROM wilayas w
      ORDER BY CAST(w.code AS UNSIGNED) ASC
    `);

    return res.status(200).json(rows || []);
  } catch (error) {
    return handleDbError(res, error, 'fetching delivery wilayas');
  }
};

export const UpdateDeliveryWilayas = async (req, res) => {
  try {
    const { wilayas } = req.body;

    if (!wilayas || !Array.isArray(wilayas) || wilayas.length === 0) {
      return res.status(400).json({ error: 'wilayas array is required' });
    }

    const codes = [];
    for (const w of wilayas) {
      if (!w.code) continue;
      codes.push(w.code);
    }

    if (codes.length === 0) {
      return res.status(400).json({ error: 'no valid wilayas to update' });
    }

    const whenHome = codes.map(() => "WHEN ? THEN ?").join(' ');
    const whenStop = codes.map(() => "WHEN ? THEN ?").join(' ');
    const whenFree = codes.map(() => "WHEN ? THEN ?").join(' ');
    const whenActive = codes.map(() => "WHEN ? THEN ?").join(' ');
    const inPlaceholders = codes.map(() => '?').join(', ');

    const sql = `
      UPDATE wilayas SET
        home_delivery_price = CASE code ${whenHome} END,
        stopdesk_delivery_price = CASE code ${whenStop} END,
        free_delivery = CASE code ${whenFree} END,
        is_active = CASE code ${whenActive} END
      WHERE code IN (${inPlaceholders})
    `;

    const params = [];
    for (const w of wilayas) {
      if (!w.code) continue;
      params.push(w.code, w.home_delivery_price ?? 0);
    }
    for (const w of wilayas) {
      if (!w.code) continue;
      params.push(w.code, w.stopdesk_delivery_price ?? 0);
    }
    for (const w of wilayas) {
      if (!w.code) continue;
      params.push(w.code, w.free_delivery ? 1 : 0);
    }
    for (const w of wilayas) {
      if (!w.code) continue;
      params.push(w.code, w.is_active ? 1 : 0);
    }
    for (const c of codes) {
      params.push(c);
    }

    await execute(sql, params);

    return res.status(200).json({ success: true, message: 'Wilayas updated successfully' });
  } catch (error) {
    return handleDbError(res, error, 'updating delivery wilayas');
  }
};

export const GetWilayaBaladiyas = async (req, res) => {
  try {
    const { code } = req.params;

    const wilayaRows = await query('SELECT * FROM wilayas WHERE code = ?', [code]);
    if (!wilayaRows || wilayaRows.length === 0) {
      return res.status(404).json({ error: 'Wilaya not found' });
    }

    const baladiyas = await query(
      'SELECT id, name, has_stopdesk FROM baladiyas WHERE wilaya_code = ? ORDER BY name ASC',
      [code]
    );

    return res.status(200).json({
      wilaya: wilayaRows[0],
      baladiyas: baladiyas || []
    });
  } catch (error) {
    return handleDbError(res, error, 'fetching wilaya baladiyas');
  }
};

export const UpdateWilayaStopDesk = async (req, res) => {
  try {
    const { code } = req.params;
    const { stopdesk_ids } = req.body;

    if (!Array.isArray(stopdesk_ids)) {
      return res.status(400).json({ error: 'stopdesk_ids array is required' });
    }

    // Reset all to 0
    await execute('UPDATE baladiyas SET has_stopdesk = 0 WHERE wilaya_code = ?', [code]);

    // Set selected to 1
    if (stopdesk_ids.length > 0) {
      const placeholders = stopdesk_ids.map(() => '?').join(',');
      await execute(
        `UPDATE baladiyas SET has_stopdesk = 1 WHERE wilaya_code = ? AND id IN (${placeholders})`,
        [code, ...stopdesk_ids]
      );
    }

    return res.status(200).json({ success: true, message: 'Stopdesk baladiyas updated' });
  } catch (error) {
    return handleDbError(res, error, 'updating stopdesk baladiyas');
  }
};

export const GetDeliveryStats = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
      FROM wilayas
    `);

    const row = result?.[0] || {};
    return res.status(200).json({
      total: Number(row.total) || 0,
      active: Number(row.active) || 0,
      inactive: Number(row.inactive) || 0
    });
  } catch (error) {
    return handleDbError(res, error, 'fetching delivery stats');
  }
};

export const GetPublicWilayas = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        w.code,
        w.name,
        w.home_delivery_price,
        w.stopdesk_delivery_price,
        w.free_delivery,
        w.is_active,
        (SELECT COUNT(*) FROM baladiyas b WHERE b.wilaya_code = w.code AND b.has_stopdesk = 1) > 0 AS has_stopdesk
      FROM wilayas w
      WHERE w.is_active = 1
      ORDER BY CAST(w.code AS UNSIGNED) ASC
    `);

    const allBaladiyas = await query(`
      SELECT wilaya_code, name, has_stopdesk
      FROM baladiyas
      ORDER BY wilaya_code ASC, name ASC
    `);

    const baladiyasByCode = {};
    for (const b of allBaladiyas || []) {
      if (!baladiyasByCode[b.wilaya_code]) baladiyasByCode[b.wilaya_code] = [];
      baladiyasByCode[b.wilaya_code].push({
        name: b.name,
        has_stopdesk: Boolean(b.has_stopdesk)
      });
    }

    const result = (rows || []).map(w => ({
      ...w,
      home_delivery_price: Number(w.home_delivery_price) || 0,
      stopdesk_delivery_price: Number(w.stopdesk_delivery_price) || 0,
      free_delivery: Boolean(w.free_delivery),
      is_active: Boolean(w.is_active),
      has_stopdesk: Boolean(w.has_stopdesk),
      municipalities: baladiyasByCode[w.code] || []
    }));

    return res.status(200).json(result);
  } catch (error) {
    return handleDbError(res, error, 'fetching public wilayas');
  }
};