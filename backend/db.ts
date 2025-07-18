import mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

export default pool;

// ตัวอย่างฟังก์ชัน generateDocumentNumber แบบ backend (mock database)
export async function generateDocumentNumberFromPattern(
  pattern: string,
  type: string,
  db: any
) {
  // 1. ดึงเลขเอกสารล่าสุดของ type นั้น ๆ จาก database (mock)
  // สมมติ db.documents = [{type: 'quotation', number: 'QT-2024-00012'}, ...]
  const docs = db.documents.filter((doc: any) => doc.type === type);
  let maxRun = 0;
  // หาเลขรันล่าสุดจาก pattern เดิม
  docs.forEach((doc: any) => {
    // หา X ติดกันใน pattern
    const xMatch = pattern.match(/X+/g);
    if (!xMatch) return;
    // สร้าง regex เพื่อดึงเลขรันจากเลขเอกสารจริง
    // เช่น pattern: QT-YYYY-XXXXX => regex: /QT-\d{4}-(\d{5})/
    let regexStr = pattern
      .replace(/YYYY/g, "\\d{4}")
      .replace(/YY/g, "\\d{2}")
      .replace(/MM/g, "\\d{2}")
      .replace(/DD/g, "\\d{2}")
      .replace(/X+/g, (m) => `(\\d{${m.length}})`);
    const regex = new RegExp("^" + regexStr + "$");
    const match = doc.number.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxRun) maxRun = num;
    }
  });
  // 2. +1
  const nextRun = maxRun + 1;
  // 3. generate เลขเอกสารใหม่ตาม pattern
  const now = new Date();
  let result = pattern;
  result = result.replace(/YYYY/g, String(now.getFullYear()));
  result = result.replace(/YY/g, String(now.getFullYear()).slice(-2));
  result = result.replace(/MM/g, String(now.getMonth() + 1).padStart(2, "0"));
  result = result.replace(/DD/g, String(now.getDate()).padStart(2, "0"));
  // 4. แทนที่ X ติดกันด้วยเลขรันที่เติม 0 ข้างหน้า
  result = result.replace(/X+/g, (m) =>
    String(nextRun).padStart(m.length, "0")
  );
  return result;
}

// ดึงข้อมูลการตั้งค่าเลขรันเอกสารทั้งหมด
export async function getAllDocumentNumberSettings() {
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query("SELECT * FROM document_number_settings");
    return rows;
  } finally {
    conn.release();
  }
}

// ดึงข้อมูลการตั้งค่าเลขรันเอกสารตามประเภท
export async function getDocumentNumberSettingByType(document_type: string) {
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(
      "SELECT * FROM document_number_settings WHERE document_type = ? LIMIT 1",
      [document_type]
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } finally {
    conn.release();
  }
}

// อัปเดต pattern และเลขรันปัจจุบัน
export async function updateDocumentNumberSetting(
  document_type: string,
  pattern: string,
  current_number: number
) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      "UPDATE document_number_settings SET pattern = ?, current_number = ?, updated_at = NOW() WHERE document_type = ?",
      [pattern, current_number, document_type]
    );
    return true;
  } finally {
    conn.release();
  }
}
