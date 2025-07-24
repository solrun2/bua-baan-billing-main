CREATE TABLE `documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(64) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `document_number` varchar(100) NOT NULL,
  `document_type` enum('QUOTATION','INVOICE','RECEIPT','TAX_INVOICE') NOT NULL,
  `status` enum('ร่าง','รอตอบรับ','ตอบรับแล้ว','พ้นกำหนด','รอชำระ','ชำระแล้ว','ชำระบางส่วน','ยกเลิก') NOT NULL,
  `issue_date` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `related_document_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `customer_address` text DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `price_type` ENUM('EXCLUDE_VAT', 'INCLUDE_VAT', 'NO_VAT') NOT NULL DEFAULT 'EXCLUDE_VAT',
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_number` (`document_number`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `quotation_details` (
  `document_id` int(11) NOT NULL,
  `valid_until` date NOT NULL,
  PRIMARY KEY (`document_id`),
  CONSTRAINT `fk_quotation_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `invoice_details` (
  `document_id` int(11) NOT NULL,
  `due_date` date NOT NULL,
  PRIMARY KEY (`document_id`),
  CONSTRAINT `fk_invoice_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `receipt_details` (
  `document_id` int(11) NOT NULL,
  `payment_date` datetime NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `payment_channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payment_channels`)),
  `fees` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fees`)),
  `offset_docs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`offset_docs`)),
  `net_total_receipt` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`document_id`),
  CONSTRAINT `fk_receipt_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `document_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document_id` int(11) NOT NULL,
  `product_id` varchar(64) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `original_unit_price` decimal(10,2) DEFAULT NULL, -- ราคาต่อหน่วยต้นฉบับ
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `withholding_tax_amount` decimal(10,2) DEFAULT 0.00,
  `withholding_tax_option` enum('ไม่ระบุ','ไม่มี','1%','1.5%','2%','3%','5%','10%','15%','กำหนดเอง') NOT NULL DEFAULT 'ไม่ระบุ',
  `amount_before_tax` decimal(15,2) DEFAULT 0.00,
  `discount` decimal(15,2) DEFAULT 0.00,
  `discount_type` enum('thb','percentage') DEFAULT 'thb',
  `tax` decimal(5,2) DEFAULT 7.00,
  `tax_amount` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `document_items_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=224 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE document_number_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL,      -- ประเภทเอกสาร เช่น quotation, invoice, receipt
    prefix VARCHAR(10) NOT NULL,             -- รหัสนำหน้า เช่น QT, INV, RC
    pattern VARCHAR(100) NOT NULL,           -- รูปแบบเลขเอกสาร เช่น QT-YYYY-XXX
    current_number INT NOT NULL DEFAULT 0,   -- เลขรันปัจจุบัน
    last_run_date DATE DEFAULT NULL,         -- วันที่รันล่าสุด
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE document_number_settings
ADD UNIQUE KEY unique_document_type (document_type);

-- เพิ่มข้อมูลเริ่มต้น
INSERT INTO document_number_settings (document_type, prefix, pattern, current_number) VALUES
('quotation', 'QT', 'QT-YYYY-MM-XXXX', 0),
('invoice', 'IV', 'IV-YYYY-MM-XXXX', 0),
('receipt', 'RE', 'RE-YYYY-MM-XXXX', 0),
('tax_invoice', 'TAX', 'TAX-YYYY-MM-XXXX', 0);
