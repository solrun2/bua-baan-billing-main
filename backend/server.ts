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
      // คำนวณ withholdingTax แบบ dynamic
      const withholdingTax = items.reduce((sum: number, item: any) => {
        // คำนวณ amount ก่อนหัก ณ ที่จ่าย
        const quantity = Number(item.quantity ?? 1);
        const unitPrice = Number(item.unit_price ?? 0);
        const discount = Number(item.discount ?? 0);
        const discountType = item.discount_type ?? "thb";
        let amountBeforeTax = 0;
        if (discountType === "percentage") {
          amountBeforeTax = quantity * unitPrice * (1 - discount / 100);
        } else {
          amountBeforeTax = quantity * (unitPrice - discount);
        }
        let whtRate = 0;
        if (typeof item.withholding_tax_option === "number") {
          whtRate = item.withholding_tax_option / 100;
        } else if (
          typeof item.withholding_tax_option === "string" &&
          item.withholding_tax_option.endsWith("%")
        ) {
          whtRate = parseFloat(item.withholding_tax_option) / 100;
        } else if (
          item.withholding_tax_option === "ไม่มี" ||
          item.withholding_tax_option === "ไม่ระบุ"
        ) {
          whtRate = 0;
        }
        // รองรับ custom amount
        let whtAmount = 0;
        if (
          item.withholding_tax_option === "กำหนดเอง" &&
          item.customWithholdingTaxAmount
        ) {
          whtAmount = Number(item.customWithholdingTaxAmount);
        } else {
          whtAmount = amountBeforeTax * whtRate;
        }
        return sum + whtAmount;
      }, 0);
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

// === ฟังก์ชันกลางสำหรับคำนวณ summary ของเอกสาร (quotation/invoice/receipt) ===
function calculateDocumentSummary(items: any[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let tax = 0;
  let withholdingTax = 0;
  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
    const discount = Number(item.discount ?? 0);
    const discountType = item.discount_type ?? item.discountType ?? "thb";
    let amountBeforeTax = 0;
    if (discountType === "percentage") {
      amountBeforeTax = quantity * unitPrice * (1 - discount / 100);
      discountTotal += quantity * unitPrice * (discount / 100);
    } else {
      amountBeforeTax = quantity * (unitPrice - discount);
      discountTotal += quantity * discount;
    }
    subtotal += amountBeforeTax;
    // VAT
    const taxRate = Number(item.tax ?? 0);
    const taxAmount = amountBeforeTax * (taxRate / 100);
    tax += taxAmount;
    // หัก ณ ที่จ่าย
    let whtRate = 0;
    if (typeof item.withholding_tax_option === "number") {
      whtRate = item.withholding_tax_option / 100;
    } else if (
      typeof item.withholding_tax_option === "string" &&
      item.withholding_tax_option.endsWith("%")
    ) {
      whtRate = parseFloat(item.withholding_tax_option) / 100;
    } else if (
      item.withholding_tax_option === "ไม่มี" ||
      item.withholding_tax_option === "ไม่ระบุ"
    ) {
      whtRate = 0;
    }
    let whtAmount = 0;
    if (
      item.withholding_tax_option === "กำหนดเอง" &&
      item.customWithholdingTaxAmount
    ) {
      whtAmount = Number(item.customWithholdingTaxAmount);
    } else {
      whtAmount = amountBeforeTax * whtRate;
    }
    withholdingTax += whtAmount;
  }
  const total = subtotal + tax;
  const netTotalAmount = total - withholdingTax;
  return {
    subtotal,
    discount: discountTotal,
    tax,
    total,
    withholdingTax,
    netTotalAmount,
  };
}

// ฟังก์ชัน reusable สำหรับสร้างเอกสารใหม่ใน backend (ใช้ใน auto-create invoice/receipt)
async function createDocumentFromServer(data: any, pool: any) {
  let conn;
  try {
    const {
      customer,
      document_type,
      status,
      issue_date,
      notes,
      items,
      summary,
      payment_date,
      payment_method,
      payment_reference,
      due_date,
      valid_until,
      related_document_id,
    } = data;
    if (
      !summary ||
      summary.subtotal === undefined ||
      summary.tax === undefined ||
      summary.total === undefined
    ) {
      throw new Error("Missing or invalid summary object.");
    }
    const summaryCalc = calculateDocumentSummary(items);
    const subtotal = summaryCalc.subtotal;
    const tax_amount = summaryCalc.tax;
    const total_amount = summaryCalc.netTotalAmount; // ใช้ยอดสุทธิหลังหัก ณ ที่จ่าย
    const withholdingTax = summaryCalc.withholdingTax;
    const netTotalAmount = summaryCalc.netTotalAmount;
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
      throw new Error("Missing required document fields.");
    }
    conn = await pool.getConnection();
    await conn.beginTransaction();
    // Generate Document Number
    const document_number = await generateDocumentNumber(
      conn,
      document_type,
      issue_date
    );
    // Insert into main 'documents' table
    const docResult = await conn.query(
      `INSERT INTO documents (
        customer_id, customer_name, document_number, document_type, status, issue_date,
        subtotal, tax_amount, total_amount, notes,
        customer_address, customer_phone, customer_email,
        related_document_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        document_number,
        document_type,
        status,
        issue_date,
        subtotal,
        tax_amount,
        total_amount, // ใช้ยอดสุทธิหลังหัก ณ ที่จ่าย
        notes,
        customer.address || "",
        customer.phone || "",
        customer.email || "",
        related_document_id || null,
      ]
    );
    const documentId = Number((docResult as any).insertId);
    if (!documentId) {
      await conn.rollback();
      throw new Error("Failed to create document and get ID.");
    }
    // Insert into document-specific details table
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
    // ถ้าเป็นเอกสารลูก (มี related_document_id และไม่ใช่ QUOTATION) จะไม่ insert document_items ใหม่
    if (!related_document_id || document_type.toLowerCase() === "quotation") {
      for (const item of items as any[]) {
        const params = [
          documentId,
          item.product_id ?? null,
          item.productTitle ?? item.product_name ?? "",
          item.unit ?? "",
          item.quantity ?? 1,
          item.unit_price ?? 0,
          item.amount ?? 0,
          item.description ?? "",
          item.withholding_tax_amount ?? 0,
          item.withholding_tax_option ?? -1,
          item.amount_before_tax ?? 0,
          item.discount ?? 0,
          item.discount_type ?? item.discountType ?? "thb",
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
    }
    await conn.commit();
    return documentId;
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Failed to create document (from server):", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

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
      related_document_id, // <-- เพิ่มบรรทัดนี้
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
    const summaryCalc = calculateDocumentSummary(items);
    const subtotal = summaryCalc.subtotal;
    const tax_amount = summaryCalc.tax;
    const total_amount = summaryCalc.netTotalAmount; // ใช้ยอดสุทธิหลังหัก ณ ที่จ่าย
    const withholdingTax = summaryCalc.withholdingTax;
    const netTotalAmount = summaryCalc.netTotalAmount;

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

    // --- LOG ก่อนเช็คซ้ำ ---
    console.log(
      "DEBUG: related_document_id =",
      related_document_id,
      "document_type =",
      document_type
    );
    if (
      related_document_id &&
      document_type &&
      document_type.toLowerCase() === "invoice"
    ) {
      const [existing] = await conn.query(
        `SELECT id FROM documents WHERE related_document_id = ? AND document_type = 'INVOICE'`,
        [related_document_id]
      );
      console.log("DEBUG: existing invoices found =", existing);
      if (Array.isArray(existing) && existing.length > 0) {
        await conn.rollback();
        console.error(
          "BLOCKED: Duplicate invoice for related_document_id =",
          related_document_id
        );
        return res
          .status(400)
          .json({ error: "มี Invoice ที่อ้างอิง Quotation นี้อยู่แล้ว" });
      }
    }

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
        customer_address, customer_phone, customer_email, price_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        document_number,
        document_type,
        status,
        issue_date,
        subtotal,
        tax_amount,
        total_amount, // ใช้ยอดสุทธิหลังหัก ณ ที่จ่าย
        notes,
        customer.address || "",
        customer.phone || "",
        customer.email || "",
        req.body.price_type || "EXCLUDE_VAT",
      ]
    );

    const documentId = Number((docResult as any).insertId);
    console.log("DEBUG: Created documentId =", documentId);
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
        `INSERT INTO receipt_details (document_id, payment_date, payment_method, payment_reference, payment_channels, fees, offset_docs, net_total_receipt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          payment_date,
          payment_method,
          payment_reference,
          JSON.stringify(req.body.payment_channels || []),
          JSON.stringify(req.body.fees || []),
          JSON.stringify(req.body.offset_docs || []),
          req.body.net_total_receipt || 0,
        ]
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

    // ถ้าเป็นเอกสารลูก (มี related_document_id และ document_type เป็น INVOICE หรือ RECEIPT) ไม่ต้อง insert document_items ใหม่
    if (
      !related_document_id ||
      (document_type.toLowerCase() !== "invoice" &&
        document_type.toLowerCase() !== "receipt")
    ) {
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
          item.withholding_tax_option ?? -1, // withholding_tax_option
          item.amount_before_tax ?? 0, // amount_before_tax
          item.discount ?? 0, // discount
          item.discount_type ?? item.discountType ?? "thb", // discount_type
          item.tax ?? 0, // tax
          item.tax_amount ?? 0, // tax_amount
        ];
        await conn.query(
          `INSERT INTO document_items (
            document_id, product_id, product_name, unit, quantity, unit_price, amount, description, withholding_tax_amount, withholding_tax_option, amount_before_tax, discount, discount_type, tax, tax_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params
        );
      }
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

// === Helper: ดึง document_items แบบ recursive ===
async function getDocumentItemsRecursive(documentId: string) {
  console.log("[getDocumentItemsRecursive] START documentId =", documentId);
  const [docRows] = await pool.query("SELECT * FROM documents WHERE id = ?", [
    documentId,
  ]);
  console.log("[getDocumentItemsRecursive] docRows =", docRows);
  const doc = Array.isArray(docRows) ? docRows[0] : docRows;
  console.log("[getDocumentItemsRecursive] doc =", doc);
  if (!doc) {
    console.log(
      "[getDocumentItemsRecursive] Document not found for id",
      documentId
    );
    console.log("[getDocumentItemsRecursive] RETURN []");
    return [];
  }
  if (doc.related_document_id) {
    console.log(
      "[getDocumentItemsRecursive] documentId",
      documentId,
      "has related_document_id =",
      doc.related_document_id,
      "→ go recursive"
    );
    return getDocumentItemsRecursive(String(doc.related_document_id));
  }
  const items = await pool.query(
    "SELECT * FROM document_items WHERE document_id = ?",
    [documentId]
  );
  console.log(
    "[getDocumentItemsRecursive] Items found for documentId",
    documentId,
    ":",
    items
  );
  if (Array.isArray(items)) {
    const mapped = items.map((item) => ({
      ...item,
      withholding_tax_option: item.withholding_tax_option ?? "-1",
    }));
    console.log("[getDocumentItemsRecursive] RETURN mapped items =", mapped);
    return mapped;
  }
  console.log("[getDocumentItemsRecursive] RETURN items =", items);
  return items;
}

// เพิ่ม route สำหรับดึงเอกสารตาม id
app.get("/api/documents/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log("[GET /api/documents/:id] id param:", id);
    // ดึงข้อมูลเอกสารหลัก
    const docRows = await pool.query("SELECT * FROM documents WHERE id = ?", [
      id,
    ]);
    console.log("[GET /api/documents/:id] docRows:", docRows);
    const doc = Array.isArray(docRows) ? docRows[0] : null;
    if (!doc || (Array.isArray(doc) && doc.length === 0)) {
      console.log("[GET /api/documents/:id] Document not found for id:", id);
      return res.status(404).json({ error: "Document not found" });
    }
    // ดึง invoice_details ถ้าเป็น INVOICE
    let invoice_details = null;
    if (doc.document_type && doc.document_type.toLowerCase() === "invoice") {
      const invoiceRows = await pool.query(
        "SELECT * FROM invoice_details WHERE document_id = ?",
        [id]
      );
      if (Array.isArray(invoiceRows) && invoiceRows.length > 0) {
        invoice_details = invoiceRows[0];
      }
    }
    // ดึง receipt_details ถ้าเป็น RECEIPT
    let receipt_details = null;
    if (doc.document_type && doc.document_type.toLowerCase() === "receipt") {
      const receiptRows = await pool.query(
        "SELECT * FROM receipt_details WHERE document_id = ?",
        [id]
      );
      if (Array.isArray(receiptRows) && receiptRows.length > 0) {
        receipt_details = receiptRows[0];
        // แปลง JSON field กลับเป็น object
        if (receipt_details.payment_channels) {
          try {
            receipt_details.payment_channels = JSON.parse(
              receipt_details.payment_channels
            );
          } catch {}
        }
        if (receipt_details.fees) {
          try {
            receipt_details.fees = JSON.parse(receipt_details.fees);
          } catch {}
        }
        if (receipt_details.offset_docs) {
          try {
            receipt_details.offset_docs = JSON.parse(
              receipt_details.offset_docs
            );
          } catch {}
        }
      }
    }
    // ดึง items ของเอกสารนี้
    let items = await pool.query(
      "SELECT * FROM document_items WHERE document_id = ?",
      [id]
    );
    console.log("[GET /api/documents/:id] items =", items);
    // map withholding_tax_option ให้เป็น -1 ถ้า null
    if (Array.isArray(items)) {
      items = items.map((item) => ({
        ...item,
        withholding_tax_option: item.withholding_tax_option ?? "-1",
      }));
    }
    // === ดึง items ของต้นทางสุดท้ายแบบ recursive ===
    const items_recursive = await getDocumentItemsRecursive(id);
    console.log("[GET /api/documents/:id] items_recursive =", items_recursive);
    // ใช้ items_recursive ในการคำนวณ summary เสมอ
    const summary = calculateDocumentSummary(items_recursive);
    // แนบ items (ที่เลือกแล้ว), items_recursive และ summary เข้าไปใน doc
    const documentWithItems = {
      ...(Array.isArray(doc) ? doc[0] : doc),
      items: Array.isArray(items) && items.length > 0 ? items : items_recursive,
      items_recursive,
      summary, // summary สดจาก items_recursive
      ...(invoice_details ? { invoice_details } : {}),
      ...(receipt_details ? { receipt_details } : {}),
    };
    // แนบ due_date ใน root object ด้วย ถ้ามี invoice_details
    if (invoice_details && invoice_details.due_date) {
      documentWithItems.due_date = invoice_details.due_date;
    }
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

    // --- เพิ่ม logic ตรวจสอบก่อนอัปเดตเอกสารต้นทาง (PUT) ---
    // ดึงข้อมูลเอกสารต้นทาง
    const [docRows] = await conn.query("SELECT * FROM documents WHERE id = ?", [
      id,
    ]);
    const docData = docRows && docRows[0] ? docRows[0] : null;
    if (
      docData &&
      docData.document_type &&
      docData.document_type.toLowerCase() === "quotation"
    ) {
      // เช็คว่ามี Invoice ที่อ้างอิง Quotation นี้อยู่แล้วหรือไม่
      const [existing] = await conn.query(
        `SELECT id FROM documents WHERE related_document_id = ? AND document_type = 'INVOICE'`,
        [id]
      );
      if (Array.isArray(existing) && existing.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          error:
            "ไม่สามารถแก้ไข Quotation ที่ถูกอ้างอิงไปสร้าง Invoice แล้วได้",
        });
      }
    }

    // 1. Update main document
    const summaryCalc = calculateDocumentSummary(items);
    const subtotal = summaryCalc.subtotal;
    const tax_amount = summaryCalc.tax;
    const total_amount = summaryCalc.netTotalAmount; // จะเป็นยอดสุทธิหลังหัก ณ ที่จ่าย
    const withholdingTax = summaryCalc.withholdingTax;
    const netTotalAmount = summaryCalc.netTotalAmount;
    await conn.query(
      `UPDATE documents SET
        customer_id = ?, customer_name = ?, document_type = ?, status = ?, issue_date = ?,
        subtotal = ?, tax_amount = ?, total_amount = ?, notes = ?,
        customer_address = ?, customer_phone = ?, customer_email = ?, price_type = ?
      WHERE id = ?`,
      [
        customer.id,
        customer.name,
        document_type,
        status,
        issue_date,
        subtotal,
        tax_amount,
        total_amount, // จะเป็น summary.total - summary.withholdingTax
        notes,
        customer.address || "",
        customer.phone || "",
        customer.email || "",
        req.body.price_type || "EXCLUDE_VAT",
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
      const result = await conn.query(
        "UPDATE invoice_details SET due_date = ? WHERE document_id = ?",
        [due_date, id]
      );
      if (result.affectedRows === 0) {
        await conn.query(
          "INSERT INTO invoice_details (document_id, due_date) VALUES (?, ?)",
          [id, due_date]
        );
      }
    } else if (
      document_type.toLowerCase() === "receipt" &&
      payment_date &&
      payment_method
    ) {
      await conn.query(
        `UPDATE receipt_details SET payment_date = ?, payment_method = ?, payment_reference = ?, payment_channels = ?, fees = ?, offset_docs = ?, net_total_receipt = ? WHERE document_id = ?`,
        [
          payment_date,
          payment_method,
          payment_reference,
          JSON.stringify(req.body.payment_channels || []),
          JSON.stringify(req.body.fees || []),
          JSON.stringify(req.body.offset_docs || []),
          req.body.net_total_receipt || 0,
          id,
        ]
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

    // === Auto-create Invoice or Receipt ===
    console.log(
      "[Auto-create] document_type:",
      document_type,
      "status:",
      status
    );
    // 1. ถ้าเป็นใบเสนอราคาและสถานะใหม่คือ "ตอบรับแล้ว" ให้สร้างใบแจ้งหนี้
    if (
      document_type.toLowerCase() === "quotation" &&
      (status === "ตอบรับแล้ว" || status === "accepted")
    ) {
      // ดึงข้อมูลใบเสนอราคานี้ใหม่ (พร้อม items)
      const [quotationDoc] = await pool.query(
        "SELECT * FROM documents WHERE id = ?",
        [id]
      );
      const quotationItems = await pool.query(
        "SELECT * FROM document_items WHERE document_id = ?",
        [id]
      );
      // เตรียมข้อมูลสำหรับสร้างใบแจ้งหนี้ (ใช้ยอด subtotal, tax_amount, total_amount เดิม)
      const invoiceData = {
        customer: {
          id: quotationDoc.customer_id,
          name: quotationDoc.customer_name,
          address: quotationDoc.customer_address,
          phone: quotationDoc.customer_phone,
          email: quotationDoc.customer_email,
        },
        document_type: "INVOICE",
        status: "รอชำระ",
        issue_date: new Date().toISOString().slice(0, 10),
        notes: quotationDoc.notes || "",
        items: quotationItems.map((item: any) => ({
          ...item,
          product_id: item.product_id,
          product_name: item.product_name,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          description: item.description,
          withholding_tax_amount: item.withholding_tax_amount,
          withholding_tax_option: item.withholding_tax_option,
          amount_before_tax: item.amount_before_tax,
          discount: item.discount,
          discount_type: item.discount_type,
          tax: item.tax,
          tax_amount: item.tax_amount,
        })),
        summary: {
          subtotal: quotationDoc.subtotal,
          tax: quotationDoc.tax_amount,
          total: quotationDoc.total_amount,
        },
        related_document_id: quotationDoc.id,
        due_date: null,
        forceTotalAmount: quotationDoc.total_amount, // ส่งยอดสุทธิเดิมไปด้วย
      };
      console.log(
        "[Auto-create] Creating INVOICE from QUOTATION:",
        invoiceData
      );
      try {
        await createDocumentFromServer(invoiceData, pool);
        console.log("[Auto-create] INVOICE created successfully");
      } catch (err) {
        console.error("[Auto-create] Failed to create INVOICE:", err);
      }
    }
    // 2. ถ้าเป็นใบแจ้งหนี้และสถานะใหม่คือ "ชำระแล้ว" ให้สร้างใบเสร็จ
    if (
      document_type.toLowerCase() === "invoice" &&
      (status === "ชำระแล้ว" || status === "paid")
    ) {
      // ดึงข้อมูลใบแจ้งหนี้นี้ใหม่ (พร้อม items)
      const [invoiceDoc] = await pool.query(
        "SELECT * FROM documents WHERE id = ?",
        [id]
      );
      const invoiceItems = await pool.query(
        "SELECT * FROM document_items WHERE document_id = ?",
        [id]
      );
      // เตรียมข้อมูลสำหรับสร้างใบเสร็จ
      // คำนวณยอดสุทธิหลังหัก ณ ที่จ่าย (ถ้ามี)
      let netTotal = Number(invoiceDoc.total_amount ?? 0);
      if (typeof invoiceDoc.withholdingTax !== "undefined") {
        netTotal = netTotal - Number(invoiceDoc.withholdingTax ?? 0);
      }
      const receiptData = {
        customer: {
          id: invoiceDoc.customer_id,
          name: invoiceDoc.customer_name,
          address: invoiceDoc.customer_address,
          phone: invoiceDoc.customer_phone,
          email: invoiceDoc.customer_email,
        },
        document_type: "RECEIPT",
        status: "ชำระแล้ว",
        issue_date: new Date().toISOString().slice(0, 10),
        notes: invoiceDoc.notes || "",
        items: invoiceItems.map((item: any) => ({
          ...item,
          product_id: item.product_id,
          product_name: item.product_name,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          description: item.description,
          withholding_tax_amount: item.withholding_tax_amount,
          withholding_tax_option: item.withholding_tax_option,
          amount_before_tax: item.amount_before_tax,
          discount: item.discount,
          discount_type: item.discount_type,
          tax: item.tax,
          tax_amount: item.tax_amount,
        })),
        summary: {
          subtotal: invoiceDoc.subtotal,
          tax: invoiceDoc.tax_amount,
          total: netTotal,
        },
        related_document_id: invoiceDoc.id,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: null,
        payment_reference: null,
      };
      console.log("[Auto-create] Creating RECEIPT from INVOICE:", receiptData);
      try {
        await createDocumentFromServer(receiptData, pool);
        console.log("[Auto-create] RECEIPT created successfully");
      } catch (err) {
        console.error("[Auto-create] Failed to create RECEIPT:", err);
      }
    }

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
