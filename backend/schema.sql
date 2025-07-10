CREATE TABLE `documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(64) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `document_number` varchar(100) NOT NULL,
  `document_type` enum('QUOTATION','INVOICE','RECEIPT','TAX_INVOICE') NOT NULL,
  `status` enum('รอตอบรับ','ตอบรับแล้ว','พ้นกำหนด','รอชำระ','ชำระแล้ว','ยกเลิก') NOT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_number` (`document_number`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci

CREATE TABLE `quotation_details` (
  `document_id` INT PRIMARY KEY,
  `valid_until` DATE NOT NULL,
  CONSTRAINT `fk_quotation_document`
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `invoice_details` (
  `document_id` INT PRIMARY KEY,
  `due_date` DATE NOT NULL,
  CONSTRAINT `fk_invoice_document`
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS receipt_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    payment_date TEXT,
    payment_method TEXT,
    payment_reference TEXT,
    payment_channels TEXT, -- JSON array
    fees TEXT, -- JSON array
    offset_docs TEXT, -- JSON array
    net_total_receipt REAL DEFAULT 0,
    FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE `document_items` (
  `id`