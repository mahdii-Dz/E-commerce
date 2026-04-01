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

pool.getConnection()
  .then((connection) => {
    console.log("Connected to MySQL database successfully!");
    connection.release();
  })
  .catch((err) => {
    console.error("Failed to connect to MySQL:", err);
    process.exit(1);
  });

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing pool...");
  await pool.end();
  process.exit(0);
});

const validateId = (id) => {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
};

const handleDbError = (res, error, context) => {
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ error: "Internal Server Error" });
};

export const AddCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
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
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Category already exists" });
    }
    return handleDbError(res, error, "adding category");
  }
};

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
      offers,
    } = req.body;

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
        thumbnail, discount_percentage, colors, offers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        offers ? JSON.stringify(offers) : null,
      ]
    );

    const productId = productResult.insertId;

    if (categoryIds.length > 0) {
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

export const AddOrder = async (req, res) => {
  let connection;
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

    if (!first_name || !last_name || !phone || !wilaya || !baladiya) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required and cannot be empty" });
    }
    // Validate each item
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.price_per_unit) {
        return res.status(400).json({ error: "Each item must have product_id, quantity, and price_per_unit" });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert order_info
    const [orderInfo] = await connection.query(
      `INSERT INTO order_info
       (first_name, last_name, phone, wilaya, baladiya,
        delivery_type, delivery_Price, wilaya_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name.trim(),
        last_name.trim(),
        phone,
        wilaya,
        baladiya,
        delivery_type,
        delivery_Price || 0,
        wilaya_code
      ]
    );

    // Insert multiple order_items with color info and offer_text
    const orderItemsValues = items.map(item => [
      orderInfo.insertId,
      item.product_id,
      item.quantity,
      item.price_per_unit,
      item.color_name || null,
      item.color_hex || null,
      item.offer_text || null
    ]);

    const [orderItemResult] = await connection.query(
      `INSERT INTO order_items
       (order_id, product_id, quantity, price_per_unit, color_name, color_hex, offer_text)
       VALUES ?`,
      [orderItemsValues]
    );

    if (orderInfo.affectedRows === 1 && orderItemResult.affectedRows === items.length) {
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
      offers,
    } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE products
       SET name = ?, description = ?, price = ?, stock = ?,
           discount_percentage = ?, images = ?, thumbnail = ?,
           type = ?, colors = ?, offers = ?
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
        offers ? JSON.stringify(offers) : null,
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
  let connection;
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid product ID" });

    connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
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
      return res.status(201).json({ message: "Product deleted successfully" });
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

export const DeleteCategory = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid category ID" });

    const [result] = await pool.query(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(201).json({ message: "Category deleted successfully" });
    }
    return res.status(404).json({ error: "Category not found" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ 
        error: "Cannot delete category with existing products" 
      });
    }
    return handleDbError(res, error, "deleting category");
  }
};

export const GetCategories = async (req, res) => {
  try {
    const [row] = await pool.query("SELECT * FROM categories");
    return res.status(200).json(row);
  } catch (error) {
    return handleDbError(res, error, "fetching categories");
  }
};

export const GetProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.discount_percentage,
        p.price,
        p.stock,
        p.image_url,
        p.is_active,
        p.images,
        p.thumbnail,
        p.created_at,
        p.type,
        p.offers,
        c.id AS category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      ORDER BY p.id
    `);

    const productsMap = new Map();

    for (const row of rows) {
      const productId = row.id;

      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          id: row.id,
          name: row.name,
          discount_percentage: row.discount_percentage,
          description: row.description,
          price: row.price,
          stock: row.stock,
          image_url: row.image_url,
          images: row.images,
          thumbnail: row.thumbnail,
          is_active: row.is_active,
          created_at: row.created_at,
          type: row.type,
          offers: row.offers ? (typeof row.offers === 'string' ? JSON.parse(row.offers) : row.offers) : null,
          categories: [],
        });
      }

      if (row.category_id) {
        productsMap.get(productId).categories.push({
          id: row.category_id,
          name: row.category_name,
        });
      }
    }

    const products = Array.from(productsMap.values());

    return res.status(200).json(products);
  } catch (error) {
    return handleDbError(res, error, "fetching products");
  }
};

export const GetProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.discount_percentage,
        p.price,
        p.stock,
        p.image_url,
        p.thumbnail,
        p.images,
        p.is_active,
        p.created_at,
        p.type,
        p.colors,
        p.offers,
        c.id AS category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id = ?
    `,
      [id],
    );

    const productMap = new Map();

    for (const row of rows) {
      const productId = row.id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: row.id,
          name: row.name,
          discount_percentage: row.discount_percentage,
          description: row.description,
          price: row.price,
          stock: row.stock,
          image_url: row.image_url,
          thumbnail: row.thumbnail,
          images: row.images,
          is_active: row.is_active,
          created_at: row.created_at,
          type: row.type,
          colors: row.colors,
          offers: row.offers ? (typeof row.offers === 'string' ? JSON.parse(row.offers) : row.offers) : null,
          categories: [],
        });
      }

      if (row.category_id) {
        productMap.get(productId).categories.push({
          id: row.category_id,
          name: row.category_name,
        });
      }
    }

    const [product] = Array.from(productMap.values());

    return res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const GetProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.discount_percentage,
        p.price,
        p.stock,
        p.image_url,
        p.thumbnail,
        p.images,
        p.is_active,
        p.created_at,
        p.type,
        p.offers,
        c.id AS category_id,
        c.name AS category_name
        FROM products p
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE c.id = ?
        LIMIT 4
    `,
      [categoryId],
    );

    const productMap = new Map();

    for (const row of rows) {
      const productId = row.id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: row.id,
          name: row.name,
          discount_percentage: row.discount_percentage,
          description: row.description,
          price: row.price,
          stock: row.stock,
          image_url: row.image_url,
          thumbnail: row.thumbnail,
          images: row.images,
          is_active: row.is_active,
          created_at: row.created_at,
          type: row.type,
          offers: row.offers ? (typeof row.offers === 'string' ? JSON.parse(row.offers) : row.offers) : null,
          categories: [],
        });
      }

      if (row.category_id) {
        productMap.get(productId).categories.push({
          id: row.category_id,
          name: row.category_name,
        });
      }
    }

    const products = Array.from(productMap.values());

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const GetDashboardStats = async (req, res) => {
  try {
    const [totalProductsRow] = await pool.query(
      "SELECT COUNT(*) AS total_products FROM products",
    );
    const [totalOrdersRow] = await pool.query(
      "SELECT COUNT(*) AS total_orders FROM order_info",
    );
    const [totalSoldProductsRow] =
      await pool.query(`SELECT SUM(oi.quantity) AS total_sold_products
      FROM order_items oi
      JOIN order_info o ON oi.order_id = o.id
      WHERE o.status = 'completed'`);
    const [BarChart] = await pool.query(`
      SELECT created_at , quantity
      FROM order_info
      JOIN order_items ON order_info.id = order_items.order_id
      WHERE order_info.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);
    const [CategoryStats] = await pool.query(`
      SELECT 
        pc.category_id,
        c.name as category_name,
        SUM(oi.quantity) as total_quantity_sold
      FROM order_items oi
      JOIN product_categories pc ON oi.product_id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY pc.category_id, c.name`);
    const [wilayaStats] = await pool.query(`
      SELECT wilaya, COUNT(*) AS totalOrders
      FROM order_info
      GROUP BY wilaya
      ORDER BY totalOrders DESC
      limit 10;
    `);

    const dailyTotals = Object.entries(
      BarChart.reduce((acc, order) => {
        const day = new Date(order.created_at).toISOString().split("T")[0];
        acc[day] = (acc[day] || 0) + order.quantity;
        return acc;
      }, {}),
    ).map(([day, total]) => ({ day, total }));
    const totalProducts = totalProductsRow[0].total_products;
    const totalOrders = totalOrdersRow[0].total_orders;
    const totalSoldProducts = totalSoldProductsRow[0].total_sold_products || 0;

    return res.status(200).json({
      totalProducts,
      totalOrders,
      totalSoldProducts,
      dailyTotals,
      CategoryStats,
      wilayaStats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const GetOrders = async (req, res) => {
  try {
    // Fetch raw order items with product details and colors from order_items
    const [rows] = await pool.query(`
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
      ORDER BY o.id ASC
    `);

    // Group rows by order_id, then by product_id + offer_text
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
          delivery_Price: row.delivery_Price,
          items: [],
          totalPrice: 0
        });
      }

      const order = ordersMap.get(orderId);
      const groupKey = `${row.product_id}|${row.offer_text || ''}`;

      // Find or create grouped item
      let item = order.items.find(i => i.product_id === row.product_id && i.offer_text === (row.offer_text || ''));
      if (!item) {
        item = {
          product_id: row.product_id,
          product_name: row.product_name,
          quantity: 0,
          price_per_unit: row.price,
          fullPrice: 0,
          offer_text: row.offer_text || null,
          colors: []
        };
        order.items.push(item);
      }

      // Accumulate quantity and fullPrice
      item.quantity += row.quantity;
      item.fullPrice += row.fullPrice;

      // Add color entry
      item.colors.push({
        color_name: row.color_name,
        color_hex: row.color_hex,
        quantity: row.quantity
      });
    }

    // Add delivery price to total for each order
    for (const order of ordersMap.values()) {
      order.totalPrice = order.items.reduce((sum, item) => sum + item.fullPrice, 0) + (Number(order.delivery_Price) || 0);
    }

    const groupedOrders = Array.from(ordersMap.values());

    return res.status(200).json(groupedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const UpdateOrder = async (req, res) => {
  try {
    const { id } = req.params;
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

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Optional: Validate that order exists and is pending
    const [orderCheck] = await pool.query(
      "SELECT status FROM order_info WHERE id = ?",
      [id]
    );
    if (orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    // Only allow editing pending orders
    if (orderCheck[0].status !== 'pending') {
      return res.status(403).json({ error: "Only pending orders can be edited" });
    }

    const allowedFields = [
      'first_name', 'last_name', 'phone', 'wilaya',
      'baladiya', 'delivery_type', 'delivery_Price', 'wilaya_code'
    ];

    const updates = [];
    const values = [];

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

    values.push(id);

    const [result] = await pool.query(
      `UPDATE order_info SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const AcceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await pool.query(
      "UPDATE order_info SET status = 'accepted' WHERE id = ?",
      [id],
    );
    if (row.affectedRows === 1) {
      return res.status(200).json({ message: "Order accepted successfully" });
    } else {
      return res.status(400).json({ error: "Failed to accept order" });
    }
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const RejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await pool.query(
      "UPDATE order_info SET status = 'rejected' WHERE id = ?",
      [id],
    );
    if (row.affectedRows === 1) {
      return res.status(200).json({ message: "Order rejected successfully" });
    } else {
      return res.status(400).json({ error: "Failed to reject order" });
    }
  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getBanners = async (req, res) => {
    try {
        const [banners] = await pool.query(
            'SELECT * FROM banners ORDER BY position ASC'
        );

        return res.status(200).json({
            success: true,
            banners: banners || []
        });
    } catch (error) {
        console.error('Error fetching banners:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch banners'
        });
    }
};

export const updateBanners = async (req, res) => {
    let connection;
    try {
        await connection.beginTransaction();

        const { banners } = req.body;

        if (!banners || !Array.isArray(banners)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Banners array is required'
            });
        }

        for (const banner of banners) {
            if (banner.position === undefined || banner.position === null || !banner.url) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Each banner must have position and url'
                });
            }
        }

        for (const banner of banners) {
            await connection.query(
                `INSERT INTO banners (position, url, public_id) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 url = VALUES(url),
                 public_id = VALUES(public_id)`,
                [banner.position, banner.url, banner.publicId || null]
            );
        }

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Banners saved successfully',
            banners: banners
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating banners:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update banners'
        });
    } finally {
        connection.release();
    }
};

export const deleteBanner = async (req, res) => {
    try {
        const { position } = req.params;

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
        console.error('Error deleting banner:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete banner'
        });
    }
};