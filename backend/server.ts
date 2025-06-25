import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db";
import multer from 'multer';
import path from 'path';

dotenv.config();

// Build/version marker


const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
  }
});

const upload = multer({ storage: storage });

// API route to upload an image
app.post('/api/upload', upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Please upload a file.' });
  }
  // Construct the URL of the uploaded file
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).send({ 
    message: 'File uploaded successfully.',
    imageUrl: imageUrl
  });
});

// Endpoint to get all customers
app.get("/api/customers", async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    let query = "SELECT * FROM customers ORDER BY name ASC";
    const params: any[] = [];
    if (q && typeof q === "string") {
      query =
        "SELECT * FROM customers WHERE name LIKE ? OR tax_id LIKE ? OR phone LIKE ? ORDER BY name ASC";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const rows = await pool.query(query, params);



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

    const rows = await pool.query("SELECT * FROM customers ORDER BY name ASC");
    res.status(201).json(rows);
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

app.get("/api/products", async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    let query = "SELECT * FROM products ORDER BY name ASC";
    const params: any[] = [];
    if (q && typeof q === "string") {
      query =
        "SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? ORDER BY name ASC";
      params.push(`%${q}%`, `%${q}%`);
    }
    const rows = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// API route to create a new product (with advanced fields and lots)
app.post("/api/products", async (req: Request, res: Response) => {
  let conn;
  try {
    const {
      product_type,
      name,
      unit,
      description,
      feature_img,
      selling_price,
      purchase_price,
      selling_vat_rate,
      purchase_vat_rate,
      status,
      instock,
      has_barcode,
      barcode,
      sales_account,
      purchase_account,
      costing_method,
      calculate_cogs_on_sale,
      cogs_account,
      opening_balance_lots,
    } = req.body;

    // SKU is now generated, so it's removed from required fields and the main insert.
    if (!name || selling_price === undefined) {
      return res
        .status(400)
        .json({ error: "Product name and selling price are required" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Step 1: Insert into the main 'products' table (without SKU)
    const productResult = await conn.query(
      `INSERT INTO products (product_type, name, unit, description, feature_img, selling_price, purchase_price, selling_vat_rate, purchase_vat_rate, status, instock, has_barcode, barcode, sales_account, purchase_account, costing_method, calculate_cogs_on_sale, cogs_account) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_type,
        name,
        unit,
        description,
        feature_img,
        selling_price,
        purchase_price,
        selling_vat_rate,
        purchase_vat_rate,
        status,
        instock,
        has_barcode,
        barcode,
        sales_account,
        purchase_account,
        costing_method,
        calculate_cogs_on_sale,
        cogs_account,
      ]
    );

    const productId = Number((productResult as any).insertId);
    if (!productId) {
      await conn.rollback();
      throw new Error("Failed to create product and get ID.");
    }

    // Step 2: Generate and update the SKU for the new product
    const newSku = "SKU" + String(productId).padStart(5, "0");
    await conn.query("UPDATE products SET sku = ? WHERE id = ?", [
      newSku,
      productId,
    ]);

    // Step 3: Insert into 'product_lots' if there are any opening balance lots
    if (
      opening_balance_lots &&
      Array.isArray(opening_balance_lots) &&
      opening_balance_lots.length > 0
    ) {
      for (const lot of opening_balance_lots) {
        await conn.query(
          "INSERT INTO product_lots (product_id, purchase_date, quantity, purchase_price_per_unit, is_opening_balance) VALUES (?, ?, ?, ?, ?)",
          [
            productId,
            lot.purchaseDate,
            lot.quantity,
            lot.purchasePricePerUnit,
            true,
          ]
        );
      }
    }

    await conn.commit();

    // Fetch the full, updated list of products to return
    const rows = await conn.query("SELECT * FROM products ORDER BY name ASC");
    res.status(201).json(rows);
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Failed to create product:", err);
    if ((err as any).code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "A product with this SKU already exists." });
    }
    res.status(500).json({ error: "Failed to create product" });
  } finally {
    if (conn) conn.release();
  }
});

// API route to update an existing product
app.put("/api/products/:id", async (req: Request, res: Response) => {
  let conn;
  const { id } = req.params;
  try {
    const {
      product_type,
      name,
      unit,
      description,
      feature_img,
      selling_price,
      purchase_price,
      selling_vat_rate,
      purchase_vat_rate,
      status,
      instock,
      has_barcode,
      barcode,
      sales_account,
      purchase_account,
      costing_method,
      calculate_cogs_on_sale,
      cogs_account,
    } = req.body;

    if (!name || selling_price === undefined) {
      return res
        .status(400)
        .json({ error: "Product name and selling price are required" });
    }

    conn = await pool.getConnection();

    await conn.query(
      `UPDATE products SET 
        product_type = ?, 
        name = ?, 
        unit = ?, 
        description = ?, 
        feature_img = ?, 
        selling_price = ?, 
        purchase_price = ?, 
        selling_vat_rate = ?, 
        purchase_vat_rate = ?, 
        status = ?, 
        instock = ?, 
        has_barcode = ?, 
        barcode = ?, 
        sales_account = ?, 
        purchase_account = ?, 
        costing_method = ?, 
        calculate_cogs_on_sale = ?, 
        cogs_account = ?
      WHERE id = ?`,
      [
        product_type,
        name,
        unit,
        description,
        feature_img,
        selling_price,
        purchase_price,
        selling_vat_rate,
        purchase_vat_rate,
        status,
        instock,
        has_barcode,
        barcode,
        sales_account,
        purchase_account,
        costing_method,
        calculate_cogs_on_sale,
        cogs_account,
        id,
      ]
    );

    const [updatedProduct] = await conn.query("SELECT * FROM products WHERE id = ?", [id]);

    res.status(200).json(updatedProduct);

  } catch (err) {
    console.error(`Failed to update product ${id}:`, err);
    res.status(500).json({ error: "Failed to update product" });
  } finally {
    if (conn) conn.release();
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
    const [rows] = await conn.query<any[]>(query);
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
    // Destructure all possible fields from the body
    const {
      customer_id,
      document_type,
      status,
      issue_date,
      notes,
      items,
      // Document-specific fields
      due_date, // For Invoices
      valid_until, // For Quotations
      payment_date, // For Receipts
      payment_method, // For Receipts
      payment_reference, // For Receipts
    } = req.body;

    // Basic validation for common fields
    if (
      !customer_id ||
      !document_type ||
      !status ||
      !issue_date ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Missing required document fields." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Calculations - fetch prices from DB for security
    let subtotal = 0;
    for (const item of items) {
      if (item.product_id) {
        const productRows = await conn.query(
          "SELECT selling_price FROM products WHERE id = ?",
          [item.product_id]
        );
        if (productRows.length === 0) {
          await conn.rollback();
          return res
            .status(400)
            .json({ error: `Product with ID ${item.product_id} not found.` });
        }
        // Use the price from the database, not from the client
        item.unit_price = productRows[0].selling_price;
      }

      // Ensure quantity and unit_price are numbers before calculation
      const quantity = parseFloat(item.quantity) || 0;
      const unit_price = parseFloat(item.unit_price) || 0;

      item.amount = quantity * unit_price;
      subtotal += item.amount;
    }
    const taxRate = 0.07;
    const tax_amount = subtotal * taxRate;
    const total_amount = subtotal + tax_amount;

    // Generate document number
    const now = new Date();
    const docNumTimestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;
    const document_number = `${document_type.substring(0, 3)}-${docNumTimestamp}`;

    // Step 1: Insert into the main 'documents' table
    const docResult = await conn.query(
      "INSERT INTO documents (customer_id, document_number, document_type, status, issue_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        customer_id,
        document_number,
        document_type,
        status,
        issue_date,
        subtotal,
        tax_amount,
        total_amount,
        notes,
      ]
    );

    const documentId = Number((docResult as any).insertId);
    if (!documentId) {
      throw new Error("Failed to create document and get ID.");
    }

    // Step 2: Insert into the correct 'details' table based on document type
    switch (document_type) {
      case "INVOICE":
      case "TAX_INVOICE":
        if (!due_date) {
          await conn.rollback();
          return res
            .status(400)
            .json({ error: "Due date is required for invoices." });
        }
        await conn.query(
          "INSERT INTO invoice_details (document_id, due_date) VALUES (?, ?)",
          [documentId, due_date]
        );
        break;
      case "QUOTATION":
        if (!valid_until) {
          await conn.rollback();
          return res
            .status(400)
            .json({ error: "Valid until date is required for quotations." });
        }
        await conn.query(
          "INSERT INTO quotation_details (document_id, valid_until) VALUES (?, ?)",
          [documentId, valid_until]
        );
        break;
      case "RECEIPT":
        if (!payment_date || !payment_method) {
          await conn.rollback();
          return res.status(400).json({
            error: "Payment date and method are required for receipts.",
          });
        }
        await conn.query(
          "INSERT INTO receipt_details (document_id, payment_date, payment_method, payment_reference) VALUES (?, ?, ?, ?)",
          [documentId, payment_date, payment_method, payment_reference]
        );
        break;
    }

    // Step 3: Insert into 'document_items' table
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
