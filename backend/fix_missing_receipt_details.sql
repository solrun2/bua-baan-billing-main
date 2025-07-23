-- แก้ไขข้อมูล receipt_details ที่หายไป
-- Migration script สำหรับเพิ่มข้อมูล receipt_details สำหรับใบเสร็จที่มีอยู่แล้ว

-- หาใบเสร็จที่ไม่มีข้อมูลใน receipt_details
INSERT INTO receipt_details (
  document_id, 
  payment_date, 
  payment_method, 
  payment_reference, 
  payment_channels, 
  fees, 
  offset_docs, 
  net_total_receipt
)
SELECT 
  d.id as document_id,
  d.issue_date as payment_date,
  'เงินสด' as payment_method,
  '' as payment_reference,
  '[]' as payment_channels,
  '[]' as fees,
  '[]' as offset_docs,
  d.total_amount as net_total_receipt
FROM documents d
LEFT JOIN receipt_details rd ON d.id = rd.document_id
WHERE d.document_type = 'RECEIPT' 
  AND rd.document_id IS NULL;

-- แสดงผลลัพธ์
SELECT 
  'ใบเสร็จที่เพิ่มข้อมูล receipt_details:' as message,
  COUNT(*) as count
FROM documents d
LEFT JOIN receipt_details rd ON d.id = rd.document_id
WHERE d.document_type = 'RECEIPT' 
  AND rd.document_id IS NOT NULL;

-- แสดงรายการใบเสร็จทั้งหมด
SELECT 
  d.id,
  d.document_number,
  d.customer_name,
  d.total_amount,
  d.status,
  CASE 
    WHEN rd.document_id IS NOT NULL THEN 'มีข้อมูล'
    ELSE 'ไม่มีข้อมูล'
  END as receipt_details_status
FROM documents d
LEFT JOIN receipt_details rd ON d.id = rd.document_id
WHERE d.document_type = 'RECEIPT'
ORDER BY d.id; 