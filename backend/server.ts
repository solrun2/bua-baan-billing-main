import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getAllDocumentNumberSettings,
  getDocumentNumberSettingByType,
  updateDocumentNumberSettingWithDate,
} from "./db";

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
        rd.payment_method,
        rd.payment_channels,
        rd.fees,
        rd.offset_docs,
        rd.net_total_receipt
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

      // สร้าง receipt_details สำหรับใบเสร็จ
      let receipt_details = null;
      if (doc.document_type === "receipt" && doc.payment_date) {
        receipt_details = {
          payment_date: doc.payment_date,
          payment_method: doc.payment_method,
          payment_reference: doc.payment_reference || "",
          payment_channels: doc.payment_channels
            ? JSON.parse(doc.payment_channels)
            : [],
          fees: doc.fees ? JSON.parse(doc.fees) : [],
          offset_docs: doc.offset_docs ? JSON.parse(doc.offset_docs) : [],
          net_total_receipt: doc.net_total_receipt || 0,
        };
      }

      return {
        ...doc,
        items,
        summary,
        receipt_details,
      };
    });
    res.json(docsWithItems);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
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

    // ใช้ระบบ Document Numbering ใหม่แทน generateDocumentNumber
    const setting = await getDocumentNumberSettingByType(document_type);
    if (!setting) {
      await conn.rollback();
      throw new Error("ไม่พบการตั้งค่าเลขรันเอกสาร");
    }

    const today = new Date(issue_date || new Date());
    let reset = false;
    let lastRunDate = setting.last_run_date
      ? new Date(setting.last_run_date)
      : null;

    if (setting.pattern.includes("DD")) {
      if (
        !lastRunDate ||
        lastRunDate.getFullYear() !== today.getFullYear() ||
        lastRunDate.getMonth() !== today.getMonth() ||
        lastRunDate.getDate() !== today.getDate()
      ) {
        reset = true;
      }
    } else if (setting.pattern.includes("MM")) {
      if (
        !lastRunDate ||
        lastRunDate.getFullYear() !== today.getFullYear() ||
        lastRunDate.getMonth() !== today.getMonth()
      ) {
        reset = true;
      }
    } else if (setting.pattern.includes("YYYY")) {
      if (!lastRunDate || lastRunDate.getFullYear() !== today.getFullYear()) {
        reset = true;
      }
    }

    let nextNumber = reset ? 1 : Number(setting.current_number) + 1;
    const yyyy = today.getFullYear();
    const yy = String(yyyy).slice(-2);
    const MM = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    let document_number = setting.pattern;
    document_number = document_number.replace(/YYYY/g, String(yyyy));
    document_number = document_number.replace(/YY/g, yy);
    document_number = document_number.replace(/MM/g, MM);
    document_number = document_number.replace(/DD/g, dd);
    document_number = document_number.replace(/X+/g, (m: string) =>
      String(nextNumber).padStart(m.length, "0")
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
    } else if (document_type.toLowerCase() === "receipt") {
      // บันทึกข้อมูล receipt_details พร้อมข้อมูลเพิ่มเติม
      const payment_channels_json = data.payment_channels
        ? JSON.stringify(data.payment_channels)
        : null;
      const fees_json = data.fees ? JSON.stringify(data.fees) : null;
      const offset_docs_json = data.offset_docs
        ? JSON.stringify(data.offset_docs)
        : null;

      await conn.query(
        `INSERT INTO receipt_details (
          document_id, payment_date, payment_method, payment_reference, 
          payment_channels, fees, offset_docs, net_total_receipt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          payment_date || new Date().toISOString().slice(0, 10),
          payment_method || "เงินสด",
          payment_reference || "",
          payment_channels_json,
          fees_json,
          offset_docs_json,
          data.net_total_receipt || 0,
        ]
      );
    }
    // ALWAYS insert document_items for every document type
    console.log("[DEBUG] Items ที่จะ insert ลง document_items:");
    for (const item of items as any[]) {
      // Fallback logic สำหรับ field สำคัญ
      const product_id = item.product_id ?? item.productId ?? null;
      const product_name =
        item.product_name && item.product_name !== "-"
          ? item.product_name
          : (item.productTitle ?? "-");
      const unit = item.unit ?? item.unitName ?? "";
      const description = item.description ?? item.productDescription ?? "";
      const qty = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
      const amount = qty * unitPrice;

      console.log("[DEBUG] Item:", {
        product_id,
        product_name,
        productTitle: item.productTitle,
        unit,
        quantity: qty,
        unit_price: unitPrice,
        amount,
        description,
      });

      const params = [
        documentId,
        product_id,
        product_name,
        unit,
        qty,
        unitPrice,
        amount, // ใช้ค่าที่คำนวณเอง
        description,
        item.withholding_tax_amount ?? 0,
        item.withholding_tax_option ?? -1,
        item.amount_before_tax ?? 0,
        item.discount ?? 0,
        item.discount_type ?? "thb",
        Number(item.tax ?? 0),
        item.tax_amount ?? 0,
      ];
      console.log("[DEBUG] Params ที่จะ insert:", params);

      await conn.query(
        `INSERT INTO document_items (
          document_id, product_id, product_name, unit, quantity, unit_price, amount, description, withholding_tax_amount, withholding_tax_option, amount_before_tax, discount, discount_type, tax, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
    }
    // อัปเดต current_number และ last_run_date
    await updateDocumentNumberSettingWithDate(
      document_type,
      setting.pattern,
      nextNumber,
      today
    );

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

  // Debug log สำหรับ receipt
  if (req.body.document_type === "receipt") {
    console.log("[DEBUG] Receipt fields ที่รับมาจาก frontend:");
    console.log("- payment_date:", req.body.payment_date);
    console.log("- payment_method:", req.body.payment_method);
    console.log("- payment_channels:", req.body.payment_channels);
    console.log(
      "- payment_channels detail:",
      JSON.stringify(req.body.payment_channels, null, 2)
    );
    console.log("- fees:", req.body.fees);
    console.log("- offset_docs:", req.body.offset_docs);
    console.log("- net_total_receipt:", req.body.net_total_receipt);
  }
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
      due_date,
      valid_until,
      payment_date,
      payment_method,
      payment_reference,
      related_document_id,
      summary = {},
      // เพิ่ม fields สำหรับ receipt
      payment_channels,
      fees,
      offset_docs,
      net_total_receipt,
    } = req.body;

    // เพิ่ม validation สำหรับ priceType
    const allowedPriceTypes = ["EXCLUDE_VAT", "INCLUDE_VAT", "NO_VAT"];
    if (!allowedPriceTypes.includes(priceType)) {
      return res.status(400).json({ error: "Invalid priceType" });
    }

    // ใช้ค่าจาก destructuring ด้านบนแล้ว

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

    // --- generate document number ตาม pattern+current_number ---
    const setting = await getDocumentNumberSettingByType(document_type);
    if (!setting) {
      await conn.rollback();
      return res.status(400).json({ error: "ไม่พบการตั้งค่าเลขรันเอกสาร" });
    }
    const today = new Date(issue_date || new Date());
    let reset = false;
    let lastRunDate = setting.last_run_date
      ? new Date(setting.last_run_date)
      : null;
    if (setting.pattern.includes("DD")) {
      if (
        !lastRunDate ||
        lastRunDate.getFullYear() !== today.getFullYear() ||
        lastRunDate.getMonth() !== today.getMonth() ||
        lastRunDate.getDate() !== today.getDate()
      )
        reset = true;
    } else if (setting.pattern.includes("MM")) {
      if (
        !lastRunDate ||
        lastRunDate.getFullYear() !== today.getFullYear() ||
        lastRunDate.getMonth() !== today.getMonth()
      )
        reset = true;
    } else if (setting.pattern.includes("YYYY")) {
      if (!lastRunDate || lastRunDate.getFullYear() !== today.getFullYear())
        reset = true;
    }
    let nextNumber = reset ? 1 : Number(setting.current_number) + 1;
    const yyyy = today.getFullYear();
    const yy = String(yyyy).slice(-2);
    const MM = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    let docNumber = setting.pattern;
    docNumber = docNumber.replace(/YYYY/g, String(yyyy));
    docNumber = docNumber.replace(/YY/g, yy);
    docNumber = docNumber.replace(/MM/g, MM);
    docNumber = docNumber.replace(/DD/g, dd);
    docNumber = docNumber.replace(/X+/g, (m: string) =>
      String(nextNumber).padStart(m.length, "0")
    );
    // ... insert document ...
    const docResult = await conn.query(
      `INSERT INTO documents (
        customer_id, customer_name, document_number, document_type, status, price_type, issue_date,
        subtotal, tax_amount, total_amount, notes,
        customer_address, customer_phone, customer_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        docNumber,
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
    // --- update current_number และ last_run_date ---
    await updateDocumentNumberSettingWithDate(
      document_type,
      setting.pattern,
      nextNumber,
      today
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
    } else if (document_type.toLowerCase() === "receipt") {
      // หา bank_account_id จาก payment_channels
      let bankAccountId = null;
      if (
        payment_channels &&
        Array.isArray(payment_channels) &&
        payment_channels.length > 0
      ) {
        const firstChannel = payment_channels[0];
        if (firstChannel.bankAccountId) {
          bankAccountId = firstChannel.bankAccountId;
        }
      }

      console.log(
        "[DEBUG] กำลังบันทึก receipt_details ด้วย bankAccountId:",
        bankAccountId
      );
      await conn.query(
        `INSERT INTO receipt_details (document_id, payment_date, payment_method, payment_reference, payment_channels, fees, offset_docs, net_total_receipt, bank_account_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          payment_date || issue_date, // ใช้วันที่เอกสารถ้าไม่มีวันที่ชำระ
          payment_method || "เงินสด", // ใช้เงินสดเป็นค่าเริ่มต้น
          payment_reference || "",
          JSON.stringify(payment_channels || []),
          JSON.stringify(fees || []),
          JSON.stringify(offset_docs || []),
          net_total_receipt || total_amount, // ใช้ยอดรวมถ้าไม่มี net_total_receipt
          bankAccountId,
        ]
      );

      // สร้างรายการในกระแสเงินสด
      console.log(
        "[DEBUG] กำลังสร้างรายการกระแสเงินสดสำหรับเอกสารใหม่:",
        docNumber
      );
      if (payment_channels && Array.isArray(payment_channels)) {
        for (const channel of payment_channels) {
          if (channel.enabled && channel.amount > 0) {
            console.log(
              "[DEBUG] เพิ่มรายการรายได้:",
              channel.method,
              "จำนวน:",
              channel.amount,
              "บัญชี:",
              channel.bankAccountId
            );
            // เพิ่มรายการรายได้
            await conn.query(
              `INSERT INTO cash_flow (type, amount, description, date, bank_account_id, document_id, category)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                "income",
                channel.amount,
                `รับชำระ ${channel.method} - ${docNumber}`,
                payment_date || issue_date,
                channel.bankAccountId || null,
                documentId,
                "รายได้จากการขาย",
              ]
            );

            // อัปเดตยอดบัญชีธนาคาร
            if (channel.bankAccountId) {
              const currentBalance = await conn.query(
                "SELECT current_balance FROM bank_accounts WHERE id = ?",
                [channel.bankAccountId]
              );
              if (Array.isArray(currentBalance) && currentBalance.length > 0) {
                const balance = currentBalance[0].current_balance;
                const newBalance = balance + Number(channel.amount);

                await conn.query(
                  "UPDATE bank_accounts SET current_balance = ? WHERE id = ?",
                  [newBalance, channel.bankAccountId]
                );
              }
            }
          }
        }
      }

      // เพิ่มรายการค่าธรรมเนียม (ถ้ามี)
      if (fees && Array.isArray(fees)) {
        for (const fee of fees) {
          if (fee.enabled && fee.amount > 0) {
            await conn.query(
              `INSERT INTO cash_flow (type, amount, description, date, bank_account_id, document_id, category)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                "expense",
                fee.amount,
                `ค่าธรรมเนียม ${fee.type} - ${docNumber}`,
                payment_date,
                bankAccountId,
                documentId,
                fee.account || "ค่าธรรมเนียมอื่นๆ",
              ]
            );
          }
        }
      }
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
          Number(item.tax ?? 0),
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
  console.log("[DEBUG] GET /api/documents/:id - Requested ID:", id);
  try {
    // JOIN ตาราง quotation_details ด้วย เพื่อให้ได้ valid_until
    const docRows = await pool.query(
      `
      SELECT d.*, qd.valid_until
      FROM documents d
      LEFT JOIN quotation_details qd ON d.id = qd.document_id
      WHERE d.id = ?
    `,
      [id]
    );
    const doc = Array.isArray(docRows) ? docRows[0] : null;
    if (!doc || (Array.isArray(doc) && doc.length === 0)) {
      return res.status(404).json({ error: "Document not found" });
    }

    console.log("[DEBUG] Document found:", {
      id: doc.id,
      document_number: doc.document_number,
      document_type: doc.document_type,
    });

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
      console.log("[DEBUG] Searching receipt_details for document_id:", id);
      const receiptRows = await pool.query(
        "SELECT * FROM receipt_details WHERE document_id = ?",
        [id]
      );
      console.log("[DEBUG] receipt_details query result:", receiptRows);
      if (Array.isArray(receiptRows) && receiptRows.length > 0) {
        receipt_details = receiptRows[0];
        if (receipt_details.payment_channels) {
          console.log(
            "🔍 [Backend] payment_channels type:",
            typeof receipt_details.payment_channels
          );
          console.log(
            "🔍 [Backend] payment_channels value:",
            receipt_details.payment_channels
          );

          let parsedChannels;

          // ถ้าเป็น string ให้ parse JSON
          if (typeof receipt_details.payment_channels === "string") {
            try {
              parsedChannels = JSON.parse(receipt_details.payment_channels);
            } catch (e) {
              console.error(
                "❌ [Backend] Error parsing payment_channels JSON:",
                e
              );
              parsedChannels = [];
            }
          }
          // ถ้าเป็น object/array อยู่แล้ว ให้ใช้เลย
          else if (Array.isArray(receipt_details.payment_channels)) {
            parsedChannels = receipt_details.payment_channels;
          }
          // กรณีอื่นๆ
          else {
            console.log(
              "⚠️ [Backend] Unknown payment_channels type, using empty array"
            );
            parsedChannels = [];
          }

          console.log("🔍 [Backend] Parsed channels:", parsedChannels);

          // แปลงข้อมูลให้ตรงกับ format ที่ frontend ต้องการ
          receipt_details.payment_channels = Array.isArray(parsedChannels)
            ? parsedChannels.map((ch: any) => ({
                enabled: true,
                method: ch.channel || ch.method || "",
                amount: Number(ch.amount) || 0,
                note: ch.note || "",
                bankAccountId: ch.bankAccountId || null,
              }))
            : [];
          console.log(
            "✅ [Backend] Converted payment_channels:",
            receipt_details.payment_channels
          );
        } else {
          console.log(
            "⚠️ [Backend] No payment_channels found in receipt_details"
          );
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

    // Debug log เพื่อตรวจสอบข้อมูลที่ส่งกลับ
    console.log("[DEBUG] GET /api/documents/:id - documentWithItems:", {
      id: documentWithItems.id,
      document_number: documentWithItems.document_number,
      document_type: documentWithItems.document_type,
      customer: documentWithItems.customer,
      receipt_details: documentWithItems.receipt_details,
    });

    res.json(documentWithItems);
  } catch (err) {
    console.error("Failed to fetch document by id:", err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

app.put("/api/documents/:id", async (req: Request, res: Response) => {
  let conn;
  const { id } = req.params;

  // Debug log สำหรับ receipt
  if (req.body.document_type === "receipt") {
    console.log("[DEBUG] PUT Receipt fields ที่รับมาจาก frontend:");
    console.log("- payment_date:", req.body.payment_date);
    console.log("- payment_method:", req.body.payment_method);
    console.log("- payment_channels:", req.body.payment_channels);
    console.log("- fees:", req.body.fees);
    console.log("- offset_docs:", req.body.offset_docs);
    console.log("- net_total_receipt:", req.body.net_total_receipt);
  }

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
      // เพิ่ม fields สำหรับ receipt
      payment_channels,
      fees,
      offset_docs,
      net_total_receipt,
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

    let docRows = await conn.query("SELECT * FROM documents WHERE id = ?", [
      id,
    ]);
    if (Array.isArray(docRows) && Array.isArray(docRows[0])) {
      // mysql2: [rows, fields]
      docRows = docRows[0];
    }
    if (!docRows || docRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "ไม่พบเอกสารนี้ในระบบ" });
    }
    const docData = docRows[0];

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
    } else if (document_type.toLowerCase() === "receipt") {
      // หา bank_account_id จาก payment_channels
      let bankAccountId = null;
      if (
        payment_channels &&
        Array.isArray(payment_channels) &&
        payment_channels.length > 0
      ) {
        const firstChannel = payment_channels[0];
        if (firstChannel.bankAccountId) {
          bankAccountId = firstChannel.bankAccountId;
        }
      }

      // ลบรายการกระแสเงินสดเก่าและหักยอดบัญชีธนาคาร
      const [oldCashFlowRows] = await conn.query(
        "SELECT * FROM cash_flow WHERE document_id = ?",
        [id]
      );
      await conn.query("DELETE FROM cash_flow WHERE document_id = ?", [id]);

      // หักยอดบัญชีธนาคารจากรายการเก่า
      if (Array.isArray(oldCashFlowRows)) {
        for (const oldEntry of oldCashFlowRows) {
          if (oldEntry.bank_account_id && oldEntry.amount > 0) {
            const currentBalance = await conn.query(
              "SELECT current_balance FROM bank_accounts WHERE id = ?",
              [oldEntry.bank_account_id]
            );
            if (Array.isArray(currentBalance) && currentBalance.length > 0) {
              const balance = currentBalance[0].current_balance;
              const newBalance = balance - Number(oldEntry.amount);

              await conn.query(
                "UPDATE bank_accounts SET current_balance = ? WHERE id = ?",
                [newBalance, oldEntry.bank_account_id]
              );
            }
          }
        }
      }

      // อัปเดต receipt_details
      await conn.query(
        `UPDATE receipt_details SET payment_date = ?, payment_method = ?, payment_reference = ?, payment_channels = ?, fees = ?, offset_docs = ?, net_total_receipt = ?, bank_account_id = ? WHERE document_id = ?`,
        [
          payment_date || issue_date,
          payment_method || "เงินสด",
          payment_reference || "",
          JSON.stringify(payment_channels || []),
          JSON.stringify(fees || []),
          JSON.stringify(offset_docs || []),
          net_total_receipt || total_amount,
          bankAccountId,
          id,
        ]
      );

      // สร้างรายการในกระแสเงินสดใหม่
      if (!docData || !docData.document_number) {
        throw new Error("ไม่พบข้อมูลเอกสาร หรือ document_number เป็น null");
      }
      console.log(
        "[DEBUG] กำลังสร้างรายการกระแสเงินสดใหม่สำหรับเอกสาร:",
        docData.document_number
      );
      if (payment_channels && Array.isArray(payment_channels)) {
        for (const channel of payment_channels) {
          if (channel.enabled && channel.amount > 0) {
            console.log(
              "[DEBUG] เพิ่มรายการรายได้:",
              channel.method,
              "จำนวน:",
              channel.amount,
              "บัญชี:",
              channel.bankAccountId
            );
            // เพิ่มรายการรายได้
            await conn.query(
              `INSERT INTO cash_flow (type, amount, description, date, bank_account_id, document_id, category)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                "income",
                channel.amount,
                `รับชำระ ${channel.method} - ${docData.document_number}`,
                payment_date,
                channel.bankAccountId || null,
                id,
                "รายได้จากการขาย",
              ]
            );

            // อัปเดตยอดบัญชีธนาคาร
            if (channel.bankAccountId) {
              const currentBalance = await conn.query(
                "SELECT current_balance FROM bank_accounts WHERE id = ?",
                [channel.bankAccountId]
              );
              if (Array.isArray(currentBalance) && currentBalance.length > 0) {
                const balance = currentBalance[0].current_balance;
                const newBalance = balance + Number(channel.amount);

                await conn.query(
                  "UPDATE bank_accounts SET current_balance = ? WHERE id = ?",
                  [newBalance, channel.bankAccountId]
                );
              }
            }
          }
        }
      }

      // เพิ่มรายการค่าธรรมเนียม (ถ้ามี)
      if (fees && Array.isArray(fees)) {
        for (const fee of fees) {
          if (fee.enabled && fee.amount > 0) {
            await conn.query(
              `INSERT INTO cash_flow (type, amount, description, date, bank_account_id, document_id, category)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                "expense",
                fee.amount,
                `ค่าธรรมเนียม ${fee.type} - ${docData.document_number}`,
                payment_date,
                bankAccountId,
                id,
                fee.account || "ค่าธรรมเนียมอื่นๆ",
              ]
            );
          }
        }
      }
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
        document_type: "invoice",
        status: "ร่าง",
        priceType: quotationDoc.price_type,
        issue_date: new Date().toISOString().slice(0, 10),
        notes: quotationDoc.notes || "",
        items: quotationItems.map((item: any) => ({
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
        document_type: "receipt",
        status: "ร่าง",
        priceType: invoiceDoc.price_type,
        issue_date: new Date().toISOString().slice(0, 10),
        notes: invoiceDoc.notes || "",
        items: invoiceItems.map((item: any) => ({
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

// API: ดึงข้อมูลการตั้งค่าเลขรันเอกสารทั้งหมด
app.get(
  "/api/document-number-settings",
  async (req: Request, res: Response) => {
    try {
      const rows = await getAllDocumentNumberSettings();
      res.json(rows);
    } catch (err) {
      console.error("Failed to fetch document number settings:", err);
      res
        .status(500)
        .json({ error: "Failed to fetch document number settings" });
    }
  }
);

// API: อัปเดต pattern และเลขรันปัจจุบัน
app.put(
  "/api/document-number-settings/:document_type",
  async (req: Request, res: Response) => {
    const { document_type } = req.params;
    const { pattern, current_number } = req.body;
    if (!pattern || current_number === undefined) {
      return res
        .status(400)
        .json({ error: "pattern และ current_number ห้ามว่าง" });
    }
    try {
      await updateDocumentNumberSettingWithDate(
        document_type,
        pattern,
        Number(current_number),
        new Date() // เพิ่ม argument นี้
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update document number setting:", err);
      res
        .status(500)
        .json({ error: "Failed to update document number setting" });
    }
  }
);

// API: คืนเลขเอกสารใหม่ (next document number) ตาม pattern+current_number (แค่ preview, ไม่จองเลข)
app.get(
  "/api/document-number-settings/:document_type/next-number",
  async (req: Request, res: Response) => {
    const { document_type } = req.params;
    try {
      const setting = await getDocumentNumberSettingByType(document_type);
      if (!setting)
        return res.status(404).json({ error: "ไม่พบประเภทเอกสารนี้" });
      const today = new Date();
      let reset = false;
      let lastRunDate = setting.last_run_date
        ? new Date(setting.last_run_date)
        : null;
      // ตรวจสอบ pattern เพื่อรีเซ็ตเลขรัน
      if (setting.pattern.includes("DD")) {
        if (
          !lastRunDate ||
          lastRunDate.getFullYear() !== today.getFullYear() ||
          lastRunDate.getMonth() !== today.getMonth() ||
          lastRunDate.getDate() !== today.getDate()
        )
          reset = true;
      } else if (setting.pattern.includes("MM")) {
        if (
          !lastRunDate ||
          lastRunDate.getFullYear() !== today.getFullYear() ||
          lastRunDate.getMonth() !== today.getMonth()
        )
          reset = true;
      } else if (setting.pattern.includes("YYYY")) {
        if (!lastRunDate || lastRunDate.getFullYear() !== today.getFullYear())
          reset = true;
      }
      let nextNumber = reset ? 1 : Number(setting.current_number) + 1;
      const yyyy = today.getFullYear();
      const yy = String(yyyy).slice(-2);
      const MM = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      let docNumber = setting.pattern;
      docNumber = docNumber.replace(/YYYY/g, String(yyyy));
      docNumber = docNumber.replace(/YY/g, yy);
      docNumber = docNumber.replace(/MM/g, MM);
      docNumber = docNumber.replace(/DD/g, dd);
      docNumber = docNumber.replace(/X+/g, (m: string) =>
        String(nextNumber).padStart(m.length, "0")
      );
      // ไม่ต้องอัปเดต current_number ที่นี่
      res.json({ documentNumber: docNumber });
    } catch (err) {
      console.error("Failed to get next document number:", err);
      res.status(500).json({ error: "Failed to get next document number" });
    }
  }
);

// ===== API สำหรับบัญชีธนาคาร =====

// GET: ดึงข้อมูลบัญชีธนาคารทั้งหมด
app.get("/api/bank-accounts", async (req: Request, res: Response) => {
  try {
    const rows = await pool.query(`
      SELECT 
        ba.id, 
        ba.bank_name, 
        ba.account_type, 
        ba.account_number, 
        ba.currency, 
        ba.is_active, 
        ba.created_at, 
        ba.updated_at,
        COALESCE(SUM(
          CASE 
            WHEN cf.type = 'income' THEN cf.amount 
            WHEN cf.type = 'expense' THEN -cf.amount 
            ELSE 0 
          END
        ), 0) as current_balance
      FROM bank_accounts ba
      LEFT JOIN cash_flow cf ON ba.id = cf.bank_account_id
      WHERE ba.is_active = 1
      GROUP BY ba.id, ba.bank_name, ba.account_type, ba.account_number, ba.currency, ba.is_active, ba.created_at, ba.updated_at
      ORDER BY ba.bank_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch bank accounts:", err);
    res.status(500).json({ error: "Failed to fetch bank accounts" });
  }
});

// GET: ดึงข้อมูลบัญชีธนาคารตาม ID
app.get("/api/bank-accounts/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const rows = await pool.query(
      "SELECT * FROM bank_accounts WHERE id = ? AND is_active = 1",
      [id]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: "Bank account not found" });
    }
  } catch (err) {
    console.error("Failed to fetch bank account:", err);
    res.status(500).json({ error: "Failed to fetch bank account" });
  }
});

// POST: สร้างบัญชีธนาคารใหม่
app.post("/api/bank-accounts", async (req: Request, res: Response) => {
  const { bank_name, account_type, account_number, current_balance } = req.body;

  if (!bank_name || !account_type || !account_number) {
    return res.status(400).json({
      error: "Bank name, account type, and account number are required",
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO bank_accounts (bank_name, account_type, account_number, current_balance) VALUES (?, ?, ?, ?)",
      [bank_name, account_type, account_number, current_balance || 0]
    );
    res.json({
      success: true,
      id: (result as any)[0].insertId,
    });
  } catch (err) {
    console.error("Failed to create bank account:", err);
    res.status(500).json({ error: "Failed to create bank account" });
  }
});

// PUT: อัปเดตยอดบัญชีธนาคาร
app.put(
  "/api/bank-accounts/:id/balance",
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined) {
      return res.status(400).json({ error: "Amount is required" });
    }

    try {
      await pool.query(
        "UPDATE bank_accounts SET current_balance = ? WHERE id = ?",
        [amount, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update bank account balance:", err);
      res.status(500).json({ error: "Failed to update bank account balance" });
    }
  }
);

// ===== API สำหรับกระแสเงินสด =====

// GET: ดึงข้อมูลกระแสเงินสด
app.get("/api/cashflow", async (req: Request, res: Response) => {
  const { month, year, type } = req.query;
  try {
    let query = `
      SELECT cf.*, ba.bank_name, ba.account_number 
      FROM cash_flow cf 
      LEFT JOIN bank_accounts ba ON cf.bank_account_id = ba.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (month && year) {
      query += " AND YEAR(cf.date) = ? AND MONTH(cf.date) = ?";
      params.push(year, month);
    }

    if (type) {
      query += " AND cf.type = ?";
      params.push(type);
    }

    query += " ORDER BY cf.date DESC";

    const rows = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch cash flow:", err);
    res.status(500).json({ error: "Failed to fetch cash flow" });
  }
});

// GET: ดึงข้อมูลกระแสเงินสดตามบัญชีธนาคาร
app.get("/api/cashflow/account/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT cf.*, ba.bank_name, ba.account_number 
      FROM cash_flow cf 
      LEFT JOIN bank_accounts ba ON cf.bank_account_id = ba.id 
      WHERE cf.bank_account_id = ?
      ORDER BY cf.date DESC
    `;
    const rows = await pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch cash flow by account:", err);
    res.status(500).json({ error: "Failed to fetch cash flow by account" });
  }
});

// POST: เพิ่มรายการกระแสเงินสด
app.post("/api/cashflow", async (req: Request, res: Response) => {
  const {
    type,
    amount,
    description,
    date,
    bank_account_id,
    document_id,
    category,
  } = req.body;

  if (!type || !amount || !description || !date) {
    return res.status(400).json({
      error: "Type, amount, description, and date are required",
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO cash_flow (type, amount, description, date, bank_account_id, document_id, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        type,
        amount,
        description,
        date,
        bank_account_id || null,
        document_id || null,
        category || null,
      ]
    );

    // อัปเดตยอดบัญชีธนาคารถ้ามี
    if (bank_account_id) {
      const currentBalance = await pool.query(
        "SELECT current_balance FROM bank_accounts WHERE id = ?",
        [bank_account_id]
      );
      const balance = (currentBalance as any)[0].current_balance;
      const newBalance =
        type === "income" ? balance + Number(amount) : balance - Number(amount);

      await pool.query(
        "UPDATE bank_accounts SET current_balance = ? WHERE id = ?",
        [newBalance, bank_account_id]
      );
    }

    res.json({
      success: true,
      id: (result as any)[0].insertId,
    });
  } catch (err) {
    console.error("Failed to create cash flow entry:", err);
    res.status(500).json({ error: "Failed to create cash flow entry" });
  }
});

// GET: สรุปกระแสเงินสดรายเดือน
app.get("/api/cashflow/summary", async (req: Request, res: Response) => {
  const { year } = req.query;
  const currentYear = year || new Date().getFullYear();

  try {
    const rows = await pool.query(
      `
      SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_flow
      FROM cash_flow 
      WHERE YEAR(date) = ?
      GROUP BY YEAR(date), MONTH(date)
      ORDER BY month ASC
    `,
      [currentYear]
    );

    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch cash flow summary:", err);
    res.status(500).json({ error: "Failed to fetch cash flow summary" });
  }
});

// สร้างข้อมูล cash_flow จากใบเสร็จเก่า
app.post(
  "/api/bank-accounts/create-cashflow-from-receipts",
  async (req: Request, res: Response) => {
    try {
      // ลบข้อมูล cash_flow เก่าทั้งหมดก่อน
      await pool.query("DELETE FROM cash_flow");

      // สร้างข้อมูล cash_flow จากใบเสร็จที่มีการชำระเงิน
      const result = await pool.query(`
          INSERT INTO cash_flow (type, amount, description, date, bank_account_id, document_id, category)
          SELECT 
            'income' as type,
            rd.net_total_receipt as amount,
            CONCAT('รับชำระ ', COALESCE(rd.payment_method, 'เงินสด'), ' - ', d.document_number) as description,
            COALESCE(rd.payment_date, d.issue_date) as date,
            rd.bank_account_id,
            d.id as document_id,
            'รายได้จากการขาย' as category
          FROM documents d
          INNER JOIN receipt_details rd ON d.id = rd.document_id
          WHERE d.document_type = 'RECEIPT'
            AND rd.net_total_receipt > 0
            AND d.status IN ('ชำระแล้ว', 'ชำระบางส่วน')
        `);

      // คำนวณยอดบัญชีธนาคารใหม่
      await pool.query(`
          UPDATE bank_accounts ba 
          SET current_balance = (
            SELECT COALESCE(SUM(
              CASE 
                WHEN cf.type = 'income' THEN cf.amount 
                WHEN cf.type = 'expense' THEN -cf.amount 
                ELSE 0 
              END
            ), 0)
            FROM cash_flow cf 
            WHERE cf.bank_account_id = ba.id
          )
          WHERE ba.id IN (SELECT DISTINCT bank_account_id FROM cash_flow WHERE bank_account_id IS NOT NULL)
        `);

      await pool.query(`
          UPDATE bank_accounts ba 
          SET current_balance = 0.00
          WHERE ba.id NOT IN (SELECT DISTINCT bank_account_id FROM cash_flow WHERE bank_account_id IS NOT NULL)
        `);

      const updatedAccounts = await pool.query(
        "SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY bank_name ASC"
      );

      res.json({
        success: true,
        message: "สร้างข้อมูล cash_flow จากใบเสร็จเก่าเรียบร้อยแล้ว",
        accounts: updatedAccounts,
      });
    } catch (err) {
      console.error("Failed to create cash flow from receipts:", err);
      res
        .status(500)
        .json({ error: "Failed to create cash flow from receipts" });
    }
  }
);

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
