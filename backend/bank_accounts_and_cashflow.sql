-- ตารางบัญชีธนาคาร
CREATE TABLE `bank_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bank_name` varchar(255) NOT NULL,
  `account_type` enum('ออมทรัพย์','กระแสรายวัน','ประจำ') NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'THB',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_number` (`account_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ตารางกระแสเงินสด
CREATE TABLE `cash_flow` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('income','expense') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `bank_account_id` int(11) DEFAULT NULL,
  `document_id` int(11) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `bank_account_id` (`bank_account_id`),
  KEY `document_id` (`document_id`),
  KEY `date` (`date`),
  CONSTRAINT `cash_flow_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_flow_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- เพิ่มฟิลด์ bank_account_id ใน receipt_details
ALTER TABLE `receipt_details` 
ADD COLUMN `bank_account_id` int(11) DEFAULT NULL,
ADD CONSTRAINT `fk_receipt_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL;

-- เพิ่มข้อมูลตัวอย่างบัญชีธนาคาร
INSERT INTO `bank_accounts` (`bank_name`, `account_type`, `account_number`, `current_balance`) VALUES
('ธนาคารกสิกรไทย', 'ออมทรัพย์', 'xxx-x-x5678-x', 245680.00),
('ธนาคารไทยพาณิชย์', 'กระแสรายวัน', 'xxx-x-x1234-x', 89420.00),
('ธนาคารกรุงเทพ', 'ออมทรัพย์', 'xxx-x-x9876-x', 156260.00);

-- เพิ่มข้อมูลตัวอย่างกระแสเงินสด
INSERT INTO `cash_flow` (`type`, `amount`, `description`, `date`, `bank_account_id`, `category`) VALUES
('income', 245680.00, 'รายรับเดือนมกราคม 2024', '2024-01-31', 1, 'รายได้จากการขาย'),
('expense', 189420.00, 'รายจ่ายเดือนมกราคม 2024', '2024-01-31', 1, 'ค่าใช้จ่ายในการดำเนินงาน'),
('income', 298450.00, 'รายรับเดือนกุมภาพันธ์ 2024', '2024-02-29', 1, 'รายได้จากการขาย'),
('expense', 201350.00, 'รายจ่ายเดือนกุมภาพันธ์ 2024', '2024-02-29', 1, 'ค่าใช้จ่ายในการดำเนินงาน'),
('income', 189320.00, 'รายรับเดือนมีนาคม 2024', '2024-03-31', 1, 'รายได้จากการขาย'),
('expense', 156780.00, 'รายจ่ายเดือนมีนาคม 2024', '2024-03-31', 1, 'ค่าใช้จ่ายในการดำเนินงาน'); 