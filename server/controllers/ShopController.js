import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();
const pool = mysql
  .createPool({
    host: process.env.DB_HOST || "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  .promise();

pool
  .getConnection()
  .then((connection) => {
    console.log("Connected to MySQL database successfully!");
    connection.release();
  })
  .catch((err) => {
    console.error("Failed to connect to MySQL:", err);
    process.exit(1);
  });

export const AddCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const [row] = await pool.query("INSERT INTO categories (name) VALUES (?)", [
      name,
    ]);
    if (row.affectedRows === 1) {
      return res.status(201).json({ message: "Category added successfully" });
    } else {
      return res.status(400).json({ error: "Failed to add category" });
    }
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const AddProduct = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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

    // Validate input
    if (!name || !price || !Array.isArray(categoryIds)) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid input" });
    }

    // 1. Insert product
    const [productResult] = await connection.query(
      `INSERT INTO products (name, description, price, stock,type,images,thumbnail,discount_percentage,colors) 
       VALUES (?, ?, ?, ?,?,?,?,?,?)`,
      [
        name,
        description,
        price,
        stock,
        type,
        JSON.stringify(images),
        thumbnail,
        discount_percentage,
        colors ? JSON.stringify(colors) : null,
      ],
    );
    const productId = productResult.insertId;

    // 2. Insert category links (only if categories provided)
    if (categoryIds.length > 0) {
      // Insert into junction table
      const categoryLinks = categoryIds.map((catId) => [productId, catId]);
      await connection.query(
        "INSERT INTO product_categories (product_id, category_id) VALUES ?",
        [categoryLinks],
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: "Product created successfully",
      productId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating product:", error);
    return res.status(500).json({ error: "Failed to create product" });
  } finally {
    connection.release();
  }
};

export const AddOrder = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
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
    const [order_info_row] = await connection.query(
      "INSERT INTO order_info (first_name,last_name,phone,wilaya,baladiya,delivery_type,delivery_Price,color_name,color_hex) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        first_name,
        last_name,
        phone,
        wilaya,
        baladiya,
        delivery_type,
        delivery_Price,
        color_name,
        color_hex,
      ],
    );
    const [Order_item_row] = await connection.query(
      "INSERT INTO order_items (order_id,product_id,quantity,price_per_unit) VALUES (?,?,?,?)",
      [order_info_row.insertId, product_id, quantity, price_per_unit],
    );
    if (
      order_info_row.affectedRows === 1 ||
      Order_item_row.affectedRows === 1
    ) {
      await connection.commit();
      console.log("Order added successfully");
      return res.status(201).json({ message: "Order created successfully" });
    } else {
      await connection.rollback();
      console.log("Failed to add order");
      return res.status(400).json({ error: "Failed to create order" });
    }
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error adding order:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (connection) connection.release();
  }
};

export const UpdateProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
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
    console.log(colors);
    
    // Update product details
    const [row] = await connection.query(
      `UPDATE products 
       SET name = ?, 
           description = ?, 
           price = ?, 
           stock = ?, 
           discount_percentage = ?, 
           images = ?, 
           thumbnail = ?, 
           type = ? ,
           colors = ?
       WHERE id = ?`,
      [
        name,
        description,
        price,
        stock,
        discount_percentage,
        JSON.stringify(images),
        thumbnail,
        type,
        JSON.stringify(colors),
        id,
      ],
    );

    if (row.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    // Handle categories update if categoryIds provided
    if (categoryIds && Array.isArray(categoryIds)) {
      // Remove existing category relationships
      await connection.query(
        "DELETE FROM product_categories WHERE product_id = ?",
        [id],
      );

      // Insert new category relationships
      if (categoryIds.length > 0) {
        const categoryValues = categoryIds.map((catId) => [id, catId]);
        await connection.query(
          "INSERT INTO product_categories (product_id, category_id) VALUES ?",
          [categoryValues],
        );
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating Product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
};
export const DeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    if (row.affectedRows === 1) {
      return res.status(201).json({ message: "Product deleted successfully" });
    } else {
      return res.status(400).json({ error: "Failed to delete Product" });
    }
  } catch (error) {
    console.error("Error deleting Product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const DeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await pool.query("DELETE FROM categories WHERE id = ?", [id]);
    if (row.affectedRows === 1) {
      return res.status(201).json({ message: "Category deleted successfully" });
    } else {
      return res.status(400).json({ error: "Failed to delete Category" });
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const GetCategories = async (req, res) => {
  try {
    const [row] = await pool.query("SELECT * FROM categories");
    return res.status(200).json(row);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const GetProducts = async (req, res) => {
  try {
    // Query to get products with their categories
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
        c.id AS category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      ORDER BY p.id
    `);

    // Group categories under each product
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
          categories: [],
        });
      }

      // Add category if it exists (handles products with no categories)
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
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const GetProductById = async (req, res) => {
  try {
    const { id } = req.params;
    // Query to get products with their categories
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
        c.id AS category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id = ?
    `,
      [id],
    );

    // Group categories under each product
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
          categories: [],
        });
      }

      // Add category if it exists (handles products with no categories)
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
    // Query to get products with their categories
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
    // Group categories under each product
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
          categories: [],
        });
      }

      // Add category if it exists (handles products with no categories)
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
        c.name as category_name,  -- if you have categories table
        SUM(oi.quantity) as total_quantity_sold
      FROM order_items oi
      JOIN product_categories pc ON oi.product_id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id  -- optional for name
      GROUP BY pc.category_id, c.name`);
    const [wilayaStats] = await pool.query(`
      SELECT wilaya, COUNT(*) AS totalOrders
      FROM order_info
      GROUP BY wilaya
      ORDER BY totalOrders DESC
      limit 10;
    `);

    // Group by day
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
      FROM
        order_info o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'pending'
    `);

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
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

// Get all banners
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
    const connection = await pool.getConnection();

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

        // Validate each banner
        for (const banner of banners) {
            if (banner.position === undefined || banner.position === null || !banner.url) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Each banner must have position and url'
                });
            }
        }

        // Method 1: Using INSERT ... ON DUPLICATE KEY UPDATE (requires UNIQUE on position)
        // This creates new records or updates existing ones
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


// Delete a banner
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