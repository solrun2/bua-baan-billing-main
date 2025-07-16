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
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
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
    const docIds = Array.isArray(rows) ? rows.map((doc: any) => doc.id) : [];
    let itemsByDoc: Record<number, any[]> = {};
    if (docIds.length > 0) {
      const itemsRows = await pool.query(
        `SELECT * FROM document_items WHERE document_id IN (${docIds.map(() => "?").join(",")})`,
        docIds
      );
      itemsByDoc = itemsRows.reduce((acc: Record<number, any[]>, item: any) => {
        if (!acc[item.document_id]) acc[item.document_id] = [];
        acc[item.document_id].push(item);
        return acc;
      }, {});
    }

    const docsWithItems = rows.map((doc: any) => {
      const items = itemsByDoc[doc.id] || [];
      // คำนวณ summary ด้วย calculateDocumentSummary (เหมือน /api/documents/:id)
      const summary = calculateDocumentSummary(items, doc.price_type);
      return {
        ...doc,
        items,
        summary,
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
      const lastRunningPart = parts[2];
      const lastNumberInt = parseInt(lastRunningPart, 10);
      if (!isNaN(lastNumberInt)) {
        nextNumber = lastNumberInt + 1;
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

function calculateDocumentSummary(
  items: any[],
  priceType = "EXCLUDE_VAT" // "INCLUDE_VAT", "EXCLUDE_VAT", "NO_VAT"
) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let withholdingTaxTotal = 0;

  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
    const taxRate = Number(item.tax ?? 0) / 100;
    const discount = Number(item.discount ?? 0);
    const discountType = item.discount_type ?? item.discountType ?? "thb";

    // 1. คำนวณส่วนลด
    let discountAmount;
    if (discountType === "percentage") {
      discountAmount = unitPrice * quantity * (discount / 100);
    } else {
      discountAmount = discount * quantity;
    }

    let amountBeforeTax, taxAmount, amount;

    if (priceType === "INCLUDE_VAT" && taxRate > 0) {
      // กรณีราคารวม VAT
      amount = unitPrice * quantity - discountAmount;
      amountBeforeTax = amount / (1 + taxRate);
      taxAmount = amount - amountBeforeTax;
    } else if (priceType === "EXCLUDE_VAT" && taxRate > 0) {
      // กรณีราคาไม่รวม VAT
      amountBeforeTax = unitPrice * quantity - discountAmount;
      taxAmount = amountBeforeTax * taxRate;
      amount = amountBeforeTax + taxAmount;
    } else {
      // ไม่มี VAT
      amountBeforeTax = unitPrice * quantity - discountAmount;
      taxAmount = 0;
      amount = amountBeforeTax;
    }

    // หัก ณ ที่จ่าย (ถ้ามี)
    let whtRate = 0;
    if (typeof item.withholding_tax_option === "number") {
      whtRate = item.withholding_tax_option / 100;
    } else if (
      typeof item.withholding_tax_option === "string" &&
      item.withholding_tax_option.endsWith("%")
    ) {
      whtRate = parseFloat(item.withholding_tax_option) / 100;
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

    subtotal += amountBeforeTax;
    discountTotal += discountAmount;
    taxTotal += taxAmount;
    withholdingTaxTotal += whtAmount;
  }

  const total = subtotal + taxTotal;
  const netTotalAmount = total - withholdingTaxTotal;

  return {
    subtotal,
    discount: discountTotal,
    tax: taxTotal,
    total,
    withholdingTax: withholdingTaxTotal,
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
      priceType,
      issue_date,
      notes,
      items,
      payment_date,
      payment_method,
      payment_reference,
      due_date,
      valid_until,
      related_document_id,
    } = data;

    const summaryCalc = calculateDocumentSummary(items, priceType);
    const subtotal = summaryCalc.subtotal;
    const tax_amount = summaryCalc.tax;
    const total_amount = summaryCalc.total;

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
    const document_number = await generateDocumentNumber(
      conn,
      document_type,
      issue_date
    );
    const docResult = await conn.query(
      `INSERT INTO documents (
        customer_id, customer_name, document_number, document_type, status, price_type, issue_date,
        subtotal, tax_amount, total_amount, notes,
        customer_address, customer_phone, customer_email,
        related_document_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        document_number,
        document_type,
        status,
        priceType,
        issue_date,
        subtotal,
        tax_amount,
        total_amount,
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

app.post("/api/documents", async (req: Request, res: Response) => {
  console.log("Received document data:", req.body);
  console.log("[DEBUG] summary ที่รับมาจาก frontend:", req.body.summary);
  console.log("[DEBUG] priceType ที่รับมาจาก frontend:", req.body.priceType);
  let conn: any; // ประกาศก่อน validation
  try {
    const {
      customer,
      document_type,
      status,
      priceType,
      issue_date,
      notes,
      items,
      payment_date,
      payment_method,
      payment_reference,
      related_document_id,
      summary = {},
    } = req.body;

    // เพิ่ม validation สำหรับ priceType
    const allowedPriceTypes = ["EXCLUDE_VAT", "INCLUDE_VAT", "NO_VAT"];
    if (!allowedPriceTypes.includes(priceType)) {
      return res.status(400).json({ error: "Invalid priceType" });
    }

    const due_date = req.body.due_date || req.body.dueDate;
    const valid_until = req.body.valid_until || req.body.validUntil;

    // ใช้ค่าจาก frontend โดยตรง
    const subtotal = summary.subtotal ?? 0;
    const tax_amount = summary.tax ?? 0;
    const total_amount = summary.total ?? 0;

    // Validation เฉพาะ field ที่บังคับ (NOT NULL) ตาม schema
    const missingFields = [];
    if (!customer || !customer.id) missingFields.push("customer.id");
    if (!customer || !customer.name) missingFields.push("customer.name");
    if (!document_type) missingFields.push("document_type");
    if (!status) missingFields.push("status");
    if (!priceType) missingFields.push("priceType");
    if (!issue_date) missingFields.push("issue_date");
    if (!items || !Array.isArray(items) || items.length === 0)
      missingFields.push("items");
    // ตรวจสอบ field ที่บังคับในแต่ละ item
    if (Array.isArray(items)) {
      items.forEach((item, idx) => {
        if (!item.product_name)
          missingFields.push(`items[${idx}].product_name`);
        if (item.quantity === undefined || item.quantity === null)
          missingFields.push(`items[${idx}].quantity`);
        if (item.unit_price === undefined || item.unit_price === null)
          missingFields.push(`items[${idx}].unit_price`);
      });
    }
    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({ error: "Missing required fields", missing: missingFields });
    }

    conn = await pool.getConnection();

    if (
      related_document_id &&
      document_type &&
      document_type.toLowerCase() === "invoice"
    ) {
      const [existing] = await conn.query(
        `SELECT id FROM documents WHERE related_document_id = ? AND document_type = 'INVOICE'`,
        [related_document_id]
      );
      if (Array.isArray(existing) && existing.length > 0) {
        await conn.rollback();
        return res
          .status(400)
          .json({ error: "มี Invoice ที่อ้างอิง Quotation นี้อยู่แล้ว" });
      }
    }

    const document_number = await generateDocumentNumber(
      conn,
      document_type,
      issue_date
    );

    const docResult = await conn.query(
      `INSERT INTO documents (
        customer_id, customer_name, document_number, document_type, status, price_type, issue_date,
        subtotal, tax_amount, total_amount, notes,
        customer_address, customer_phone, customer_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        document_number,
        document_type,
        status,
        priceType,
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

    if (
      !related_document_id ||
      (document_type.toLowerCase() !== "invoice" &&
        document_type.toLowerCase() !== "receipt")
    ) {
      for (const item of items) {
        const qty = Number(item.quantity ?? 1);
        const unitPrice = Number(item.unit_price ?? 0);
        const taxRate = Number(item.tax ?? 0) / 100;
        let amount = unitPrice * qty;
        let amount_before_tax = amount;
        if (priceType === "INCLUDE_VAT" && taxRate > 0) {
          amount_before_tax = amount / (1 + taxRate);
        } else if (priceType === "EXCLUDE_VAT" || priceType === "NO_VAT") {
          amount_before_tax = amount;
        }
        const params = [
          documentId,
          item.product_id ?? null,
          item.productTitle ?? item.product_name ?? "",
          item.unit ?? "",
          qty,
          unitPrice,
          amount,
          item.description ?? "",
          item.withholding_tax_amount ?? 0,
          item.withholding_tax_option ?? -1,
          amount_before_tax,
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

app.get("/api/documents/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const docRows = await pool.query("SELECT * FROM documents WHERE id = ?", [
      id,
    ]);
    const doc = Array.isArray(docRows) ? docRows[0] : null;
    if (!doc || (Array.isArray(doc) && doc.length === 0)) {
      return res.status(404).json({ error: "Document not found" });
    }

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

    let receipt_details = null;
    if (doc.document_type && doc.document_type.toLowerCase() === "receipt") {
      const receiptRows = await pool.query(
        "SELECT * FROM receipt_details WHERE document_id = ?",
        [id]
      );
      if (Array.isArray(receiptRows) && receiptRows.length > 0) {
        receipt_details = receiptRows[0];
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

    let items = await pool.query(
      "SELECT * FROM document_items WHERE document_id = ?",
      [id]
    );
    if (Array.isArray(items)) {
      items = items.map((item) => ({
        ...item,
        withholding_tax_option: item.withholding_tax_option ?? "-1",
      }));
    }

    // สรุป summary จาก document_items ของตัวเองเท่านั้น
    const summary = calculateDocumentSummary(items, doc.price_type);

    const documentWithItems = {
      ...(Array.isArray(doc) ? doc[0] : doc),
      items,
      summary,
      ...(invoice_details ? { invoice_details } : {}),
      ...(receipt_details ? { receipt_details } : {}),
    };

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
      priceType,
      issue_date,
      notes,
      items,
      due_date,
      valid_until,
      payment_date,
      payment_method,
      payment_reference,
      summary = {},
    } = req.body;

    // เพิ่ม validation สำหรับ priceType
    const allowedPriceTypes = ["EXCLUDE_VAT", "INCLUDE_VAT", "NO_VAT"];
    if (!allowedPriceTypes.includes(priceType)) {
      return res.status(400).json({ error: "Invalid priceType" });
    }

    // ใช้ค่าจาก frontend โดยตรง
    const subtotal = summary.subtotal ?? 0;
    const tax_amount = summary.tax ?? 0;
    const total_amount = summary.total ?? 0;

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

    const [docRows] = await conn.query("SELECT * FROM documents WHERE id = ?", [
      id,
    ]);
    const docData = docRows && docRows[0] ? docRows[0] : null;
    if (
      docData &&
      docData.document_type &&
      docData.document_type.toLowerCase() === "quotation"
    ) {
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

    await conn.query(
      `UPDATE documents SET
        customer_id = ?, customer_name = ?, document_type = ?, status = ?, price_type = ?, issue_date = ?,
        subtotal = ?, tax_amount = ?, total_amount = ?, notes = ?,
        customer_address = ?, customer_phone = ?, customer_email = ?
      WHERE id = ?`,
      [
        customer.id,
        customer.name,
        document_type,
        status,
        priceType,
        issue_date,
        subtotal,
        tax_amount,
        total_amount,
        notes,
        customer.address || "",
        customer.phone || "",
        customer.email || "",
        id,
      ]
    );

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

    await conn.query("DELETE FROM document_items WHERE document_id = ?", [id]);
    for (const item of items) {
      const params = [
        id,
        item.product_id ?? null,
        item.product_name ?? "",
        item.unit ?? "",
        Number(item.quantity ?? 1),
        Number(item.unit_price ?? 0),
        Number(item.amount ?? 0),
        item.description ?? "",
        Number(item.withholding_tax_amount ?? 0),
        item.withholding_tax_option ?? "ไม่ระบุ",
        Number(item.amount_before_tax ?? 0),
        Number(item.discount ?? 0),
        item.discount_type ?? "thb",
        Number(item.tax ?? 0),
        Number(item.tax_amount ?? 0),
      ];
      await conn.query(
        `INSERT INTO document_items (
          document_id, product_id, product_name, unit, quantity, unit_price, amount, description, withholding_tax_amount, withholding_tax_option, amount_before_tax, discount, discount_type, tax, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
    }

    await conn.commit();

    if (
      document_type.toLowerCase() === "quotation" &&
      (status === "ตอบรับแล้ว" || status === "accepted")
    ) {
      const [quotationDoc] = await pool.query(
        "SELECT * FROM documents WHERE id = ?",
        [id]
      );
      const quotationItems = await pool.query(
        "SELECT * FROM document_items WHERE document_id = ?",
        [id]
      );
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
        priceType: quotationDoc.price_type,
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
        related_document_id: quotationDoc.id,
        due_date: null,
      };

      try {
        await createDocumentFromServer(invoiceData, pool);
      } catch (err) {
        console.error("[Auto-create] Failed to create INVOICE:", err);
      }
    }

    if (
      document_type.toLowerCase() === "invoice" &&
      (status === "ชำระแล้ว" || status === "paid")
    ) {
      const [invoiceDoc] = await pool.query(
        "SELECT * FROM documents WHERE id = ?",
        [id]
      );
      const invoiceItems = await pool.query(
        "SELECT * FROM document_items WHERE document_id = ?",
        [id]
      );

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
        priceType: invoiceDoc.price_type,
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
        related_document_id: invoiceDoc.id,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: null,
        payment_reference: null,
      };

      try {
        await createDocumentFromServer(receiptData, pool);
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
