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

    const { name, description, price, stock, categoryIds } = req.body;

    // Validate input
    if (!name || !price || !Array.isArray(categoryIds)) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid input" });
    }

    // 1. Insert product
    const [productResult] = await connection.query(
      `INSERT INTO products (name, description, price, stock) 
       VALUES (?, ?, ?, ?)`,
      [name, description, price, stock],
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
    } = req.body;
    const [order_info_row] = await connection.query(
      "INSERT INTO order_info (first_name,last_name,phone,wilaya,baladiya,delivery_type) VALUES (?,?,?,?,?,?)",
      [first_name, last_name, phone, wilaya, baladiya, delivery_type],
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
  try {
    const { id } = req.params;
    const { name, description, price, stock, discount_percentage, image_url } =
      req.body;
    if (image_url) {
      const [row] = await pool.query(
        "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, discount_percentage = ?, image_url = ? WHERE id = ?",
        [name, description, price, stock, discount_percentage, image_url, id],
      );
      if (row.affectedRows === 1) {
        return res
          .status(201)
          .json({ message: "Product updated successfully" });
      } else {
        return res.status(400).json({ error: "Failed to update Product" });
      }
    } else {
      const [row] = await pool.query(
        "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, discount_percentage = ? WHERE id = ?",
        [name, description, price, stock, discount_percentage, id],
      );
      if (row.affectedRows === 1) {
        return res
          .status(201)
          .json({ message: "Product updated successfully" });
      } else {
        return res.status(400).json({ error: "Failed to update Product" });
      }
    }
  } catch (error) {
    console.error("Error updating Product:", error);
    res.status(500).json({ error: "Internal Server Error" });
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
        p.created_at,
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
          is_active: row.is_active,
          created_at: row.created_at,
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
