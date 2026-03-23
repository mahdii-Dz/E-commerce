import mysql from "mysql2/promise";  
import dotenv from "dotenv";

dotenv.config();


const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,      
  queueLimit: 0,
  enableKeepAlive: true,     
  keepAliveInitialDelay: 0,
});

// ✅ Test connection on startup
pool.getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL database successfully!");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MySQL:", err);
    process.exit(1);
  });

// ✅ Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing pool...");
  await pool.end();
  process.exit(0);
});

// ✅ Helper: Validate ID parameter
const validateId = (id) => {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
};

// ✅ Helper: Handle database errors consistently
const handleDbError = (res, error, context) => {
  console.error(`Error ${context}:`, error);
  // Don't leak SQL errors to client
  return res.status(500).json({ error: "Internal Server Error" });
};

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

export const AddCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    // ✅ Input validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const [result] = await pool.query(
      "INSERT INTO categories (name) VALUES (?)",
      [name.trim()]
    );

    if (result.affectedRows === 1) {
      return res.status(201).json({ 
        message: "Category added successfully",
        categoryId: result.insertId 
      });
    }
    return res.status(400).json({ error: "Failed to add category" });
  } catch (error) {
    // ✅ Handle duplicate entry
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Category already exists" });
    }
    return handleDbError(res, error, "adding category");
  }
};

export const GetCategories = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories ORDER BY name");
    return res.status(200).json(rows);
  } catch (error) {
    return handleDbError(res, error, "fetching categories");
  }
};

export const DeleteCategory = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid category ID" });

    const [result] = await pool.query(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Category deleted successfully" });
    }
    return res.status(404).json({ error: "Category not found" });
  } catch (error) {
    // ✅ Handle foreign key constraint
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ 
        error: "Cannot delete category with existing products" 
      });
    }
    return handleDbError(res, error, "deleting category");
  }
};

// ─────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────

export const AddProduct = async (req, res) => {
  let connection;
  try {
    const {
      name,
      description,
      price,
      stock,
      categoryIds,
      type,
      images,
      discount_percentage,
      thumbnail,
      colors,
    } = req.body;

    // ✅ Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ error: "categoryIds must be an array" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [productResult] = await connection.query(
      `INSERT INTO products (
        name, description, price, stock, type, images, 
        thumbnail, discount_percentage, colors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || null,
        price,
        stock || 0,
        type || null,
        JSON.stringify(images || []),
        thumbnail || null,
        discount_percentage || 0,
        colors ? JSON.stringify(colors) : null,
      ]
    );

    const productId = productResult.insertId;

    if (categoryIds.length > 0) {
      // ✅ Validate category IDs exist (optional but recommended)
      const validCategoryIds = categoryIds
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id) && id > 0);

      if (validCategoryIds.length > 0) {
        const categoryLinks = validCategoryIds.map((catId) => [productId, catId]);
        await connection.query(
          "INSERT INTO product_categories (product_id, category_id) VALUES ?",
          [categoryLinks]
        );
      }
    }

    await connection.commit();
    
    return res.status(201).json({
      message: "Product created successfully",
      productId,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return handleDbError(res, error, "creating product");
  } finally {
    if (connection) connection.release();
  }
};

export const GetProducts = async (req, res) => {
  try {
    // ✅ Optimized: Let database do the grouping if possible, 
    // or use separate queries for better performance
    const [products] = await pool.query(`
      SELECT 
        p.id, p.name, p.description, p.discount_percentage,
        p.price, p.stock, p.images, p.thumbnail,
        p.is_active, p.created_at, p.type,
        GROUP_CONCAT(
          JSON_OBJECT('id', c.id, 'name', c.name)
        ) as categories_json
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY p.id
      ORDER BY p.id
    `);

    // ✅ Parse the JSON categories
    const formattedProducts = products.map(p => ({
      ...p,
      categories: p.categories_json 
        ? JSON.parse(`[${p.categories_json}]`).filter(c => c.id !== null)
        : []
    }));

    return res.status(200).json(formattedProducts);
  } catch (error) {
    return handleDbError(res, error, "fetching products");
  }
};

export const GetProductById = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid product ID" });

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,
        GROUP_CONCAT(
          JSON_OBJECT('id', c.id, 'name', c.name)
        ) as categories_json
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id = ?
      GROUP BY p.id
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = {
      ...rows[0],
      categories: rows[0].categories_json
        ? JSON.parse(`[${rows[0].categories_json}]`).filter(c => c.id !== null)
        : [],
      colors: rows[0].colors ? JSON.parse(rows[0].colors) : null
    };
    delete product.categories_json;

    return res.status(200).json(product);
  } catch (error) {
    return handleDbError(res, error, "fetching product");
  }
};

export const GetProductsByCategory = async (req, res) => {
  try {
    const categoryId = validateId(req.params.categoryId);
    if (!categoryId) return res.status(400).json({ error: "Invalid category ID" });

    const [rows] = await pool.query(
      `
      SELECT 
        p.id, p.name, p.description, p.discount_percentage,
        p.price, p.stock, p.images, p.thumbnail,
        p.is_active, p.created_at, p.type
      FROM products p
      INNER JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.category_id = ?
      LIMIT 4
      `,
      [categoryId]
    );

    return res.status(200).json(rows);
  } catch (error) {
    return handleDbError(res, error, "fetching products by category");
  }
};

export const UpdateProduct = async (req, res) => {
  let connection;
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid product ID" });

    const {
      name,
      description,
      price,
      stock,
      discount_percentage,
      images,
      thumbnail,
      type,
      categoryIds,
      colors,
    } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, stock = ?, 
           discount_percentage = ?, images = ?, thumbnail = ?, 
           type = ?, colors = ?
       WHERE id = ?`,
      [
        name?.trim(),
        description || null,
        price,
        stock,
        discount_percentage || 0,
        JSON.stringify(images || []),
        thumbnail || null,
        type || null,
        colors ? JSON.stringify(colors) : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    if (categoryIds && Array.isArray(categoryIds)) {
      await connection.query(
        "DELETE FROM product_categories WHERE product_id = ?",
        [id]
      );

      const validIds = categoryIds
        .map(cid => parseInt(cid, 10))
        .filter(cid => !isNaN(cid) && cid > 0);

      if (validIds.length > 0) {
        const links = validIds.map((cid) => [id, cid]);
        await connection.query(
          "INSERT INTO product_categories (product_id, category_id) VALUES ?",
          [links]
        );
      }
    }

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return handleDbError(res, error, "updating product");
  } finally {
    if (connection) connection.release();
  }
};

export const DeleteProduct = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid product ID" });

    // ✅ Use transaction to ensure cleanup
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete relationships first
      await connection.query(
        "DELETE FROM product_categories WHERE product_id = ?",
        [id]
      );
      
      const [result] = await connection.query(
        "DELETE FROM products WHERE id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Product not found" });
      }

      await connection.commit();
      return res.status(200).json({ message: "Product deleted successfully" });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    return handleDbError(res, error, "deleting product");
  }
};

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────

export const AddOrder = async (req, res) => {
  let connection;
  try {
    const {
      first_name,
      last_name,
      phone,
      wilaya,
      baladiya,
      delivery_type,
      product_id,
      quantity,
      price_per_unit,
      delivery_Price,
      color_name,
      color_hex,
    } = req.body;

    // ✅ Validation
    if (!first_name || !last_name || !phone || !wilaya || !baladiya) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!product_id || !quantity || !price_per_unit) {
      return res.status(400).json({ error: "Product details are required" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orderInfo] = await connection.query(
      `INSERT INTO order_info 
       (first_name, last_name, phone, wilaya, baladiya, 
        delivery_type, delivery_Price, color_name, color_hex) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name.trim(),
        last_name.trim(),
        phone,
        wilaya,
        baladiya,
        delivery_type,
        delivery_Price || 0,
        color_name || null,
        color_hex || null,
      ]
    );

    const [orderItem] = await connection.query(
      `INSERT INTO order_items 
       (order_id, product_id, quantity, price_per_unit) 
       VALUES (?, ?, ?, ?)`,
      [orderInfo.insertId, product_id, quantity, price_per_unit]
    );

    // ✅ FIXED: Use AND (&&) not OR (||)
    if (orderInfo.affectedRows === 1 && orderItem.affectedRows === 1) {
      await connection.commit();
      return res.status(201).json({ 
        message: "Order created successfully",
        orderId: orderInfo.insertId 
      });
    } else {
      await connection.rollback();
      return res.status(400).json({ error: "Failed to create order" });
    }
  } catch (error) {
    if (connection) await connection.rollback();
    return handleDbError(res, error, "creating order");
  } finally {
    if (connection) connection.release();
  }
};

export const GetOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT
        o.id AS order_id,
        CONCAT(o.first_name, ' ', o.last_name) AS fullname,
        o.phone,
        CONCAT(o.baladiya, ',', o.wilaya) AS address,
        o.delivery_type,
        o.delivery_Price,
        oi.quantity,
        o.color_name,
        o.color_hex,
        ROUND(oi.price_per_unit) AS price,
        ROUND((oi.quantity * oi.price_per_unit)) AS fullPrice,
        p.name AS product_name
      FROM order_info o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'pending'
      ORDER BY o.created_at DESC
    `);

    return res.status(200).json(orders);
  } catch (error) {
    return handleDbError(res, error, "fetching orders");
  }
};

export const AcceptOrder = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order ID" });

    const [result] = await pool.query(
      "UPDATE order_info SET status = 'accepted' WHERE id = ? AND status = 'pending'",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Order accepted successfully" });
    }
    return res.status(404).json({ error: "Order not found or already processed" });
  } catch (error) {
    return handleDbError(res, error, "accepting order");
  }
};

export const RejectOrder = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order ID" });

    const [result] = await pool.query(
      "UPDATE order_info SET status = 'rejected' WHERE id = ? AND status = 'pending'",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Order rejected successfully" });
    }
    return res.status(404).json({ error: "Order not found or already processed" });
  } catch (error) {
    return handleDbError(res, error, "rejecting order");
  }
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

export const GetDashboardStats = async (req, res) => {
  try {
    // ✅ Run independent queries in parallel for better performance
    const [
      [totalProductsRow],
      [totalOrdersRow],
      [totalSoldRow],
      [barChartData],
      [categoryStats],
      [wilayaStats]
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM products"),
      pool.query("SELECT COUNT(*) AS total FROM order_info"),
      pool.query(`
        SELECT COALESCE(SUM(oi.quantity), 0) AS total 
        FROM order_items oi
        JOIN order_info o ON oi.order_id = o.id
        WHERE o.status = 'completed'
      `),
      pool.query(`
        SELECT DATE(o.created_at) as day, SUM(oi.quantity) as total
        FROM order_info o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(o.created_at)
        ORDER BY day
      `),
      pool.query(`
        SELECT 
          pc.category_id,
          c.name as category_name,
          SUM(oi.quantity) as total_sold
        FROM order_items oi
        JOIN product_categories pc ON oi.product_id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        GROUP BY pc.category_id, c.name
      `),
      pool.query(`
        SELECT wilaya, COUNT(*) AS totalOrders
        FROM order_info
        GROUP BY wilaya
        ORDER BY totalOrders DESC
        LIMIT 10
      `)
    ]);

    return res.status(200).json({
      totalProducts: totalProductsRow[0].total,
      totalOrders: totalOrdersRow[0].total,
      totalSoldProducts: totalSoldRow[0].total,
      dailyTotals: barChartData,
      CategoryStats: categoryStats,
      wilayaStats: wilayaStats,
    });
  } catch (error) {
    return handleDbError(res, error, "fetching dashboard stats");
  }
};

// ─────────────────────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────────────────────

export const getBanners = async (req, res) => {
  try {
    const [banners] = await pool.query(
      'SELECT * FROM banners ORDER BY position ASC'
    );
    return res.status(200).json({ success: true, banners });
  } catch (error) {
    return handleDbError(res, error, "fetching banners");
  }
};

export const updateBanners = async (req, res) => {
  let connection;
  try {
    const { banners } = req.body;

    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Banners array is required' 
      });
    }

    // ✅ Validate each banner
    for (const banner of banners) {
      if (typeof banner.position !== 'number' || !banner.url?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Each banner must have numeric position and URL'
        });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const banner of banners) {
      await connection.query(
        `INSERT INTO banners (position, url, public_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         url = VALUES(url),
         public_id = VALUES(public_id)`,
        [banner.position, banner.url.trim(), banner.publicId || null]
      );
    }

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: 'Banners saved successfully',
      count: banners.length
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return handleDbError(res, error, "updating banners");
  } finally {
    if (connection) connection.release();
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const position = parseInt(req.params.position, 10);
    if (isNaN(position)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid position' 
      });
    }

    const [result] = await pool.query(
      'DELETE FROM banners WHERE position = ?',
      [position]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Banner not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    return handleDbError(res, error, "deleting banner");
  }
};

export default pool;