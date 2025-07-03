import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, "uploads");
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
  },
});

const upload = multer({ storage: storage });

// API route to upload an image
app.post(
  "/api/upload",
  upload.single("image"),
  (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).send({ message: "Please upload a file." });
    }
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).send({
      message: "File uploaded successfully.",
      imageUrl: imageUrl,
    });
  }
);

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

// Endpoint to create a customer
app.post("/api/customers", async (req: Request, res: Response) => {
  let { name, address, tax_id, phone, email } = req.body;
  address = address || null;
  phone = phone || null;
  email = email || null;

  if (!name || !tax_id) {
    return res
      .status(400)
      .json({ error: "Customer name and tax ID are required" });
  }

  try {
    const queryResult = await pool.query(
      "INSERT INTO customers (name, address, tax_id, phone, email) VALUES (?, ?, ?, ?, ?)",
      [name, address, tax_id, phone, email]
    );
    const result = (queryResult as any)[0];
    if (!result || !result.insertId) {
      throw new Error("Failed to get new customer ID after insert.");
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

// Endpoint to get all products
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

// Endpoint to create a product
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

    if (!name || selling_price === undefined) {
      return res
        .status(400)
        .json({ error: "Product name and selling price are required" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

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

    const newSku = "SKU" + String(productId).padStart(5, "0");
    await conn.query("UPDATE products SET sku = ? WHERE id = ?", [
      newSku,
      productId,
    ]);

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

// Endpoint to update a product
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
        product_type = ?, name = ?, unit = ?, description = ?, feature_img = ?, 
        selling_price = ?, purchase_price = ?, selling_vat_rate = ?, purchase_vat_rate = ?, 
        status = ?, instock = ?, has_barcode = ?, barcode = ?, sales_account = ?, 
        purchase_account = ?, costing_method = ?, calculate_cogs_on_sale = ?, cogs_account = ?
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

    const [updatedProduct] = await conn.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );
    res.status(200).json(updatedProduct[0]);
  } catch (err) {
    console.error(`Failed to update product ${id}:`, err);
    res.status(500).json({ error: "Failed to update product" });
  } finally {
    if (conn) conn.release();
  }
});

// Endpoint to get all documents
app.get("/api/documents", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        d.*,
        qd.valid_until,
        id.due_date,
        rd.payment_date, 
        rd.payment_method
      FROM documents d
      LEFT JOIN quotation_details qd ON d.id = qd.document_id
      LEFT JOIN invoice_details id ON d.id = id.document_id
      LEFT JOIN receipt_details rd ON d.id = rd.document_id
      ORDER BY d.issue_date DESC, d.id DESC
    `;
    const rows = await pool.query(query);
    // ดึง items ของแต่ละ document
    const docIds = Array.isArray(rows) ? rows.map((doc: any) => doc.id) : [];
    let itemsByDoc: Record<number, any[]> = {};
    if (docIds.length > 0) {
      const itemsRows = await pool.query(
        `SELECT * FROM document_items WHERE document_id IN (${docIds.map(() => "?").join(",")})`,
        docIds
      );
      // group by document_id
      itemsByDoc = itemsRows.reduce((acc: Record<number, any[]>, item: any) => {
        if (!acc[item.document_id]) acc[item.document_id] = [];
        acc[item.document_id].push(item);
        return acc;
      }, {});
    }
    // แนบ items และ summary ให้แต่ละ document
    const docsWithItems = rows.map((doc: any) => {
      const items = itemsByDoc[doc.id] || [];
      const withholdingTax = items.reduce(
        (sum, item) => sum + (item.withholding_tax_amount || 0),
        0
      );
      return {
        ...doc,
        items,
        summary: {
          subtotal: doc.subtotal,
          tax: doc.tax_amount,
          total: doc.total_amount,
          withholdingTax,
        },
      };
    });
    res.json(docsWithItems);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

const generateDocumentNumber = async (
  conn: any,
  type: string,
  issueDate: string
): Promise<string> => {
  const date = new Date(issueDate);
  const year = date.getFullYear();
  let prefix = "";
  switch (type.toUpperCase()) {
    case "QUOTATION":
      prefix = "QT";
      break;
    case "INVOICE":
      prefix = "IV";
      break;
    case "RECEIPT":
      prefix = "RE";
      break;
    default:
      prefix = "DOC";
      break;
  }

  const searchPattern = `${prefix}-${year}-%`;
  const rows = await conn.query(
    "SELECT document_number FROM documents WHERE document_number LIKE ? ORDER BY document_number DESC LIMIT 1",
    [searchPattern]
  );

  let nextNumber = 1;
  if (Array.isArray(rows) && rows.length > 0 && rows[0].document_number) {
    const lastNumber = rows[0].document_number;
    const parts = lastNumber.split("-");
    if (parts.length >= 3) {
      const lastRunningPart = parts[2]; // Get the last part after splitting by '-'
      const lastNumber = parseInt(lastRunningPart, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }

  const runningNumber = String(nextNumber).padStart(4, "0");
  return `${prefix}-${year}-${runningNumber}`;
};

// API route to get the next document number
app.get("/api/documents/next-number", async (req, res) => {
  const { type } = req.query;
  if (!type || typeof type !== "string") {
    return res.status(400).json({ message: "Document type is required." });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const issueDate = new Date().toISOString().slice(0, 10); // Use current date
    const docNumber = await generateDocumentNumber(conn, type, issueDate);
    res.json({ documentNumber: docNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate document number" });
  } finally {
    if (conn) conn.release();
  }
});

// API route to create a new document
app.post("/api/documents", async (req: Request, res: Response) => {
  console.log("Received document data:", req.body);
  let conn;
  try {
    const {
      customer, // { id, name, ... }
      document_type,
      status,
      issue_date,
      notes,
      items, // [{ product_id, product_name, ... }]
      summary,
      payment_date, // For receipts
      payment_method, // For receipts
      payment_reference, // For receipts
    } = req.body;

    // Log items from frontend
    console.log("[POST /api/documents] items from frontend:", items);

    // Handle camelCase from frontend for document-specific dates
    const due_date = req.body.due_date || req.body.dueDate;
    const valid_until = req.body.valid_until || req.body.validUntil;

    // 1. Validation
    if (
      !summary ||
      summary.subtotal === undefined ||
      summary.tax === undefined ||
      summary.total === undefined
    ) {
      return res
        .status(400)
        .json({ error: "Missing or invalid summary object." });
    }
    const { subtotal, tax: tax_amount, total: total_amount } = summary;

    if (
      !customer ||
      !customer.id ||
      !customer.name ||
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

    // 2. Generate Document Number
    const document_number = await generateDocumentNumber(
      conn,
      document_type,
      issue_date
    );

    // 3. Insert into main 'documents' table
    const docResult = await conn.query(
      `INSERT INTO documents (
        customer_id, customer_name, document_number, document_type, status, issue_date,
        subtotal, tax_amount, total_amount, notes,
        customer_address, customer_phone, customer_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        document_number,
        document_type,
        status,
        issue_date,
        subtotal,
        tax_amount,
        total_amount,
        notes,
        customer.address || "",
        customer.phone || "",
        customer.email || "",
      ]
    );

    const documentId = Number((docResult as any).insertId);
    if (!documentId) {
      await conn.rollback();
      return res
        .status(500)
        .json({ error: "Failed to create document and get ID." });
    }

    // 4. Insert into document-specific details table
    if (document_type.toLowerCase() === "quotation" && valid_until) {
      await conn.query(
        "INSERT INTO quotation_details (document_id, valid_until) VALUES (?, ?)",
        [documentId, valid_until]
      );
    } else if (document_type.toLowerCase() === "invoice" && due_date) {
      await conn.query(
        "INSERT INTO invoice_details (document_id, due_date) VALUES (?, ?)",
        [documentId, due_date]
      );
    } else if (
      document_type.toLowerCase() === "receipt" &&
      payment_date &&
      payment_method
    ) {
      await conn.query(
        "INSERT INTO receipt_details (document_id, payment_date, payment_method, payment_reference) VALUES (?, ?, ?, ?)",
        [documentId, payment_date, payment_method, payment_reference]
      );
    }

    console.log(
      "items to save:",
      items.map((item) => ({
        ...item,
        withholding_tax_amount:
          item.withholding_tax_amount ?? item.withholdingTaxAmount ?? 0,
      }))
    );

    for (const item of items) {
      const params = [
        documentId, // document_id
        item.product_id ?? null, // product_id
        item.productTitle ?? item.product_name ?? "", // product_name
        item.unit ?? "", // unit
        item.quantity ?? 1, // quantity
        item.unit_price ?? 0, // unit_price
        item.amount ?? 0, // amount
        item.description ?? "", // description
        item.withholding_tax_amount ?? 0, // withholding_tax_amount
        item.withholding_tax_option ?? -1, // withholding_tax_option (ใหม่)
        item.amount_before_tax ?? 0, // amount_before_tax
        item.discount ?? 0, // discount
        item.discount_type ?? item.discountType ?? "thb", // discount_type
        item.tax ?? 0, // tax
        item.tax_amount ?? 0, // tax_amount
      ];
      console.log(
        "Params for document_items:",
        params,
        "length:",
        params.length
      );
      await conn.query(
        `INSERT INTO document_items (
          document_id, product_id, product_name, unit, quantity, unit_price, amount, description, withholding_tax_amount, withholding_tax_option, amount_before_tax, discount, discount_type, tax, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
    }

    await conn.commit();

    const newDocumentRows = await conn.query(
      "SELECT * FROM documents WHERE id = ?",
      [documentId]
    );

    if (Array.isArray(newDocumentRows) && newDocumentRows.length > 0) {
      res.status(201).json(newDocumentRows[0]);
    } else {
      res
        .status(404)
        .json({ error: "Failed to retrieve the document after creation." });
    }
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Failed to create document:", err);
    res.status(500).json({
      error: "Failed to create document",
      details: (err as Error).message,
    });
  } finally {
    if (conn) conn.release();
  }
});

// API route to delete a document
app.delete("/api/documents/:id", async (req: Request, res: Response) => {
  let conn;
  const { id } = req.params;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // The database schema is set up with ON DELETE CASCADE,
    // so this single delete is sufficient.
    const deleteResult = await conn.query(
      "DELETE FROM documents WHERE id = ?",
      [id]
    );

    if (deleteResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Document not found." });
    }

    await conn.commit();
    res.status(200).json({ message: "Document deleted successfully." });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(`Failed to delete document ${id}:`, err);
    res.status(500).json({ error: "Failed to delete document" });
  } finally {
    if (conn) conn.release();
  }
});

// เพิ่ม route สำหรับดึงเอกสารตาม id
app.get("/api/documents/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // ดึงข้อมูลเอกสารหลัก
    const docRows = await pool.query("SELECT * FROM documents WHERE id = ?", [
      id,
    ]);
    const doc = Array.isArray(docRows) ? docRows[0] : null;
    if (!doc || (Array.isArray(doc) && doc.length === 0)) {
      return res.status(404).json({ error: "Document not found" });
    }
    // ดึง items ของเอกสารนี้
    let items = await pool.query(
      "SELECT * FROM document_items WHERE document_id = ?",
      [id]
    );
    // map withholding_tax_option ให้เป็น -1 ถ้า null
    if (Array.isArray(items)) {
      items = items.map((item) => ({
        ...item,
        withholding_tax_option: item.withholding_tax_option ?? "-1",
      }));
    }
    // แนบ items เข้าไปใน doc
    const documentWithItems = { ...(Array.isArray(doc) ? doc[0] : doc), items };
    res.json(documentWithItems);
  } catch (err) {
    console.error("Failed to fetch document by id:", err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

app.put("/api/documents/:id", async (req: Request, res: Response) => {
  let conn;
  const { id } = req.params;
  try {
    const {
      customer,
      document_type,
      status,
      issue_date,
      notes,
      items,
      summary,
      due_date,
      valid_until,
      payment_date,
      payment_method,
      payment_reference,
    } = req.body;

    if (
      !customer ||
      !customer.id ||
      !customer.name ||
      !document_type ||
      !status ||
      !issue_date ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !summary
    ) {
      return res
        .status(400)
        .json({ error: "Missing required document fields." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Update main document
    await conn.query(
      `UPDATE documents SET
        customer_id = ?, customer_name = ?, document_type = ?, status = ?, issue_date = ?,
        subtotal = ?, tax_amount = ?, total_amount = ?, notes = ?,
        customer_address = ?, customer_phone = ?, customer_email = ?
      WHERE id = ?`,
      [
        customer.id,
        customer.name,
        document_type,
        status,
        issue_date,
        summary.subtotal,
        summary.tax,
        summary.total,
        notes,
        customer.address || "",
        customer.phone || "",
        customer.email || "",
        id,
      ]
    );

    // 2. Update document-specific details
    if (document_type.toLowerCase() === "quotation" && valid_until) {
      await conn.query(
        "UPDATE quotation_details SET valid_until = ? WHERE document_id = ?",
        [valid_until, id]
      );
    } else if (document_type.toLowerCase() === "invoice" && due_date) {
      await conn.query(
        "UPDATE invoice_details SET due_date = ? WHERE document_id = ?",
        [due_date, id]
      );
    } else if (
      document_type.toLowerCase() === "receipt" &&
      payment_date &&
      payment_method
    ) {
      await conn.query(
        "UPDATE receipt_details SET payment_date = ?, payment_method = ?, payment_reference = ? WHERE document_id = ?",
        [payment_date, payment_method, payment_reference, id]
      );
    }

    // 3. ลบ items เดิม แล้ว insert ใหม่
    await conn.query("DELETE FROM document_items WHERE document_id = ?", [id]);
    for (const item of items) {
      const params = [
        id,
        item.product_id ?? null,
        item.product_name ?? "",
        item.unit ?? "",
        item.quantity ?? 1,
        item.unit_price ?? 0,
        item.amount ?? 0,
        item.description ?? "",
        item.withholding_tax_amount ?? 0,
        item.withholding_tax_option ?? -1,
        item.amount_before_tax ?? 0,
        item.discount ?? 0,
        item.discount_type ?? "thb",
        item.tax ?? 0,
        item.tax_amount ?? 0,
      ];
      await conn.query(
        `INSERT INTO document_items (
          document_id, product_id, product_name, unit, quantity, unit_price, amount, description, withholding_tax_amount, withholding_tax_option, amount_before_tax, discount, discount_type, tax, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
    }

    await conn.commit();
    res.status(200).json({ message: "Document updated successfully." });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Failed to update document:", err);
    res.status(500).json({ error: "Failed to update document" });
  } finally {
    if (conn) conn.release();
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
