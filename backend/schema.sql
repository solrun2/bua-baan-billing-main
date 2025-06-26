-- Drop tables in the correct order to respect foreign key constraints.
DROP TABLE IF EXISTS `document_items`;
DROP TABLE IF EXISTS `receipt_details`;
DROP TABLE IF EXISTS `invoice_details`;
DROP TABLE IF EXISTS `quotation_details`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `product_lots`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `customers`;

-- Recreate all tables with the correct schema.
CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT,
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `tax_id` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_type` ENUM('product', 'service') NOT NULL DEFAULT 'product',
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NULL UNIQUE,
  `unit` VARCHAR(50),
  `description` TEXT,
  `feature_img` VARCHAR(255),
  `selling_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `purchase_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `selling_vat_rate` DECIMAL(5, 2) DEFAULT 7.00,
  `purchase_vat_rate` DECIMAL(5, 2) DEFAULT 7.00,
  `status` TINYINT(1) NOT NULL DEFAULT 1, -- 1=active, 0=inactive
  `instock` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `has_barcode` BOOLEAN DEFAULT FALSE,
  `barcode` VARCHAR(255),
  `sales_account` VARCHAR(100),
  `purchase_account` VARCHAR(100),
  `costing_method` ENUM('FIFO', 'LIFO', 'Average', 'Specific') DEFAULT 'FIFO',
  `calculate_cogs_on_sale` BOOLEAN DEFAULT TRUE,
  `cogs_account` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `product_lots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `purchase_date` DATE NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL,
  `purchase_price_per_unit` DECIMAL(15, 2) NOT NULL,
  `is_opening_balance` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `document_number` VARCHAR(100) NOT NULL UNIQUE,
  `document_type` ENUM('QUOTATION', 'INVOICE', 'RECEIPT', 'TAX_INVOICE') NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'ร่าง',
  `issue_date` DATE NOT NULL,
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `notes` TEXT,
  `related_document_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE `receipt_details` (
  `document_id` INT PRIMARY KEY,
  `payment_date` DATETIME NOT NULL,
  `payment_method` VARCHAR(100),
  `payment_reference` VARCHAR(255),
  CONSTRAINT `fk_receipt_document`
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `document_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `document_id` INT NOT NULL,
  `product_id` INT NULL, 
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  `unit_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


