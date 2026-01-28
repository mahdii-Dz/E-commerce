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
  try {
    const { name, description, price, stock } = req.body;
    const [row] = await pool.query(
      "INSERT INTO products (name,description,price,stock) VALUES (?,?,?,?)",
      [name, description, price, stock],
    );
    if (row.affectedRows === 1) {
      return res.status(201).json({ message: "Product added successfully" });
    } else {
      return res.status(400).json({ error: "Failed to add product" });
    }
  } catch (error) {
    console.error("Error adding Product:", error);
    res.status(500).json({ error: "Internal Server Error" });
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
    const { name, description, price, stock } = req.body;
    const [row] = await pool.query(
      "UPDATE products SET name = ?, description = ?, price = ?, stock = ? WHERE id = ?",
      [name, description, price, stock, id],
    );
    if (row.affectedRows === 1) {
      return res.status(201).json({ message: "Product updated successfully" });
    } else {
      return res.status(400).json({ error: "Failed to update Product" });
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
