-- เพิ่มสถานะ "ร่าง" ในตาราง documents
-- Migration script สำหรับอัปเดตฐานข้อมูลที่มีอยู่

-- อัปเดต enum status ในตาราง documents
ALTER TABLE `documents` 
MODIFY COLUMN `status` enum('ร่าง','รอตอบรับ','ตอบรับแล้ว','พ้นกำหนด','รอชำระ','ชำระแล้ว','ชำระบางส่วน','ยกเลิก') NOT NULL;

-- อัปเดตสถานะของใบเสร็จที่มีอยู่ให้เป็น "ชำระแล้ว" (ถ้าไม่มีสถานะ)
UPDATE `documents` 
SET `status` = 'ชำระแล้ว' 
WHERE `document_type` = 'RECEIPT' AND `status` = '';

-- หรือถ้าต้องการให้ใบเสร็จใหม่เริ่มต้นด้วยสถานะ "ร่าง"
-- UPDATE `documents` 
-- SET `status` = 'ร่าง' 
-- WHERE `document_type` = 'RECEIPT' AND `status` = ''; 