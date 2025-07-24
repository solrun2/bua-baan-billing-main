-- อัปเดตตาราง document_number_settings ที่มีอยู่แล้ว
ALTER TABLE document_number_settings 
ADD COLUMN last_run_date DATE DEFAULT NULL AFTER current_number;

-- เพิ่มข้อมูลเริ่มต้น (ถ้ายังไม่มี)
INSERT IGNORE INTO document_number_settings (document_type, prefix, pattern, current_number) VALUES
('quotation', 'QT', 'QT-YYYY-MM-XXXX', 0),
('invoice', 'IV', 'IV-YYYY-MM-XXXX', 0),
('receipt', 'RE', 'RE-YYYY-MM-XXXX', 0),
('tax_invoice', 'TAX', 'TAX-YYYY-MM-XXXX', 0); 