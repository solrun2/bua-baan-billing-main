import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API route to get all documents
// Endpoint to get all customers
app.get("/api/customers", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM customers ORDER BY name ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch customers:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

app.post("/api/customers", async (req: Request, res: Response) => {
  const { name, address, tax_id, phone, email } = req.body;

  if (!name || !tax_id) {
    return res
      .status(400)
      .json({ error: "Customer name and tax ID are required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO customers (name, address, tax_id, phone, email) VALUES (?, ?, ?, ?, ?)",
      [name, address, tax_id, phone, email]
    );

    const insertId = (result as any).insertId;
    if (!insertId) {
      throw new Error("Failed to get new customer ID");
    }

    const [rows] = await pool.query("SELECT * FROM customers WHERE id = ?", [
      insertId,
    ]);

    const newCustomer = (rows as any)[0];
    if (!newCustomer) {
      return res
        .status(404)
        .json({ error: "Could not find newly created customer" });
    }

    res.status(201).json(newCustomer);
  } catch (err) {
    console.error("Failed to create customer:", err);
    if ((err as any).code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "A customer with this Tax ID or Name might already exist.",
      });
    }
    res.status(500).json({ error: "Failed to create customer" });
  }
});

app.get("/api/documents", async (req: Request, res: Response) => {
  let conn;
  try {
    conn = await pool.getConnection();
    // Query to join documents with customers to get customer name
    const query = `
      SELECT d.*, c.name as customer_name 
      FROM documents d
      JOIN customers c ON d.customer_id = c.id
      ORDER BY d.issue_date DESC, d.id DESC
    `;
    const rows = await conn.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  } finally {
    if (conn) conn.release(); // Release the connection back to the pool
  }
});

// API route to create a new document
app.post("/api/documents", async (req: Request, res: Response) => {
  let conn;
  try {
    const {
      customer_id,
      document_type,
      status,
      issue_date,
      due_date,
      notes,
      items,
    } = req.body;

    // Basic validation
    if (
      !customer_id ||
      !document_type ||
      !status ||
      !issue_date ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({ error: "Missing required document fields." });
      return;
    }

    // Calculations
    let subtotal = 0;
    for (const item of items) {
      item.amount = item.quantity * item.unit_price;
      subtotal += item.amount;
    }
    const taxRate = 0.07; // 7% VAT
    const tax_amount = subtotal * taxRate;
    const total_amount = subtotal + tax_amount;

    // Generate a simple unique document number
    const now = new Date();
    const docNumTimestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;
    const document_number = `${document_type.substring(0, 3)}-${docNumTimestamp}`;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Insert into documents table
    const docResult = await conn.query(
      "INSERT INTO documents (customer_id, document_number, document_type, status, issue_date, due_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        customer_id,
        document_number,
        document_type,
        status,
        issue_date,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        notes,
      ]
    );

    const documentId = Number(docResult.insertId);

    // Insert into document_items table
    for (const item of items) {
      await conn.query(
        "INSERT INTO document_items (document_id, description, quantity, unit_price, amount, product_id) VALUES (?, ?, ?, ?, ?, ?)",
        [
          documentId,
          item.description,
          item.quantity,
          item.unit_price,
          item.amount,
          item.product_id || null,
        ]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: "Document created successfully",
      documentId: documentId,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Failed to create document:", err);
    res.status(500).json({ error: "Failed to create document" });
  } finally {
    if (conn) conn.release();
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
