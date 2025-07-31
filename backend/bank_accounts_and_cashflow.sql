-- ตารางบัญชีธนาคาร
CREATE TABLE `bank_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bank_name` varchar(255) NOT NULL,
  `account_type` enum('ออมทรัพย์','กระแสรายวัน','ประจำ') NOT NULL DEFAULT 'ออมทรัพย์',
  `account_number` varchar(50) NOT NULL,
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'THB',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bank_name` (`bank_name`),
  KEY `idx_account_type` (`account_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ตารางกระแสเงินสด
CREATE TABLE `cash_flow` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('income','expense') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` text NOT NULL,
  `date` date NOT NULL,
  `bank_account_id` int(11) DEFAULT NULL,
  `document_id` int(11) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_date` (`date`),
  KEY `idx_bank_account_id` (`bank_account_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_category` (`category`),
  CONSTRAINT `fk_cash_flow_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cash_flow_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- เพิ่มข้อมูลตัวอย่างสำหรับบัญชีธนาคาร
INSERT INTO `bank_accounts` (`bank_name`, `account_type`, `account_number`, `current_balance`, `currency`) VALUES
('ธนาคารกรุงเทพ', 'ออมทรัพย์', 'xxx-x-x9876-x', 5000.00, 'THB'),
('ธนาคารไทยพาณิชย์', 'กระแสรายวัน', 'xxx-x-x1234-x', 20000.00, 'THB'),
('ธนาคารกสิกรไทย', 'ประจำ', 'xxx-x-x5678-x', 15000.00, 'THB');

-- เพิ่มข้อมูลตัวอย่างสำหรับกระแสเงินสด
INSERT INTO `cash_flow` (`type`, `amount`, `description`, `date`, `bank_account_id`, `category`) VALUES
('income', 50000.00, 'รายได้จากการขายสินค้า', '2024-01-15', 1, 'รายได้จากการขาย'),
('expense', 15000.00, 'ค่าเช่าออฟฟิศ', '2024-01-20', 1, 'ค่าใช้จ่ายในการดำเนินงาน'),
('income', 30000.00, 'รายได้จากบริการ', '2024-01-25', 2, 'รายได้จากบริการ'),
('expense', 8000.00, 'ค่าไฟฟ้า', '2024-01-30', 2, 'ค่าใช้จ่ายในการดำเนินงาน'); 