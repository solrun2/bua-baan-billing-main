import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API route to get all documents
app.get('/api/documents', async (req, res) => {
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
    console.error('Failed to fetch documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  } finally {
    if (conn) conn.release(); // Release the connection back to the pool
  }
});

// API route to create a new document
app.post('/api/documents', async (req, res) => {
  let conn;
  try {
    const { customer_id, document_type, status, issue_date, due_date, notes, items } = req.body;

    // Basic validation
    if (!customer_id || !document_type || !status || !issue_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required document fields.' });
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
    const docNumTimestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const document_number = `${document_type.substring(0, 3)}-${docNumTimestamp}`;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Insert into documents table
    const docResult = await conn.query(
      'INSERT INTO documents (customer_id, document_number, document_type, status, issue_date, due_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [customer_id, document_number, document_type, status, issue_date, due_date, subtotal, tax_amount, total_amount, notes]
    );

    const documentId = Number(docResult.insertId);

    // Insert into document_items table
    for (const item of items) {
      await conn.query(
        'INSERT INTO document_items (document_id, description, quantity, unit_price, amount, product_id) VALUES (?, ?, ?, ?, ?, ?)',
        [documentId, item.description, item.quantity, item.unit_price, item.amount, item.product_id || null]
      );
    }

    await conn.commit();

    res.status(201).json({ message: 'Document created successfully', documentId: documentId });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Failed to create document:', err);
    res.status(500).json({ error: 'Failed to create document' });
  } finally {
    if (conn) conn.release();
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
