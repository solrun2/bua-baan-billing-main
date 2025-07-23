const mysql = require("mysql2/promise");

async function debugReceiptData() {
  const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "bua_baan_billing",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    console.log("=== ตรวจสอบข้อมูล receipt_details ===");

    // ดูข้อมูลทั้งหมดใน receipt_details
    const [receiptRows] = await pool.query(
      "SELECT * FROM receipt_details LIMIT 5"
    );
    console.log(
      "receipt_details ทั้งหมด:",
      JSON.stringify(receiptRows, null, 2)
    );

    // ดูข้อมูล payment_channels ที่ไม่เป็น null
    const [paymentChannelsRows] = await pool.query(
      'SELECT document_id, payment_channels FROM receipt_details WHERE payment_channels IS NOT NULL AND payment_channels != "[]" LIMIT 5'
    );
    console.log("\n=== payment_channels ที่ไม่เป็น null ===");
    console.log(JSON.stringify(paymentChannelsRows, null, 2));

    // ดูข้อมูล documents ที่เป็น receipt
    const [receiptDocs] = await pool.query(
      'SELECT id, document_number, document_type, status FROM documents WHERE document_type = "RECEIPT" LIMIT 5'
    );
    console.log("\n=== เอกสาร RECEIPT ===");
    console.log(JSON.stringify(receiptDocs, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

debugReceiptData();
