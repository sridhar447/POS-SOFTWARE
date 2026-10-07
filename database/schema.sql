-- Showroom ERP + POS Relational Database Schema
-- Compatible with MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `showroom_erp` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `showroom_erp`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'BILLING_USER') NOT NULL DEFAULT 'BILLING_USER',
  `phone` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(50) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Brands
CREATE TABLE IF NOT EXISTS `brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Stock Locations (Showroom vs Warehouse)
CREATE TABLE IF NOT EXISTS `stock_locations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Products Catalog
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `category_id` INT DEFAULT NULL,
  `brand_id` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `size` VARCHAR(50) DEFAULT NULL,
  `color` VARCHAR(50) DEFAULT NULL,
  `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `reorder_level` INT NOT NULL DEFAULT 5,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL,
  INDEX `idx_product_name` (`name`),
  INDEX `idx_product_sku` (`sku`),
  INDEX `idx_product_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Suppliers
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `gst_number` VARCHAR(50) DEFAULT NULL,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_supplier_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Purchases
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_number` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_id` INT NOT NULL,
  `supplier_invoice_no` VARCHAR(100) DEFAULT NULL,
  `purchase_date` DATE NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `initial_location_id` INT NOT NULL,
  `payment_status` ENUM('PAID', 'PARTIAL', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`initial_location_id`) REFERENCES `stock_locations`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_purchase_number` (`purchase_number`),
  INDEX `idx_purchase_date` (`purchase_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Purchase Items
CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `purchase_price` DECIMAL(12,2) NOT NULL,
  `selling_price` DECIMAL(12,2) NOT NULL,
  `tax_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `line_total` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Product Units (Every physical unit with unique barcode)
CREATE TABLE IF NOT EXISTS `product_units` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `barcode` VARCHAR(60) NOT NULL UNIQUE,
  `sku` VARCHAR(50) DEFAULT NULL,
  `purchase_id` INT DEFAULT NULL,
  `location_id` INT NOT NULL,
  `status` ENUM('AVAILABLE', 'SOLD', 'RESERVED', 'DAMAGED', 'RETURNED', 'TRANSFERRED', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
  `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`location_id`) REFERENCES `stock_locations`(`id`) ON DELETE RESTRICT,
  INDEX `idx_units_barcode` (`barcode`),
  INDEX `idx_units_product` (`product_id`),
  INDEX `idx_units_location` (`location_id`),
  INDEX `idx_units_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Stock Transfers
CREATE TABLE IF NOT EXISTS `stock_transfers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transfer_number` VARCHAR(50) NOT NULL UNIQUE,
  `from_location_id` INT NOT NULL,
  `to_location_id` INT NOT NULL,
  `total_quantity` INT NOT NULL,
  `transfer_date` DATE NOT NULL,
  `transferred_by` INT DEFAULT NULL,
  `reason` TEXT DEFAULT NULL,
  `status` ENUM('COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`from_location_id`) REFERENCES `stock_locations`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`to_location_id`) REFERENCES `stock_locations`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`transferred_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_transfer_number` (`transfer_number`),
  INDEX `idx_transfer_date` (`transfer_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Stock Transfer Items
CREATE TABLE IF NOT EXISTS `stock_transfer_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transfer_id` INT NOT NULL,
  `unit_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `barcode` VARCHAR(60) NOT NULL,
  FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`unit_id`) REFERENCES `product_units`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Customers
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `customer_type` ENUM('WALK_IN', 'REGISTERED') NOT NULL DEFAULT 'WALK_IN',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_customer_phone` (`phone`),
  INDEX `idx_customer_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Sales
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT DEFAULT NULL,
  `cashier_id` INT NOT NULL,
  `sale_date` DATE NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('CASH', 'UPI', 'CARD', 'OTHER', 'SPLIT') NOT NULL DEFAULT 'CASH',
  `payment_status` ENUM('PAID', 'PARTIAL', 'REFUNDED') NOT NULL DEFAULT 'PAID',
  `amount_received` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `change_returned` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_sale_invoice` (`invoice_number`),
  INDEX `idx_sale_date` (`sale_date`),
  INDEX `idx_sale_cashier` (`cashier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Sale Items
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `unit_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `barcode` VARCHAR(60) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(50) DEFAULT NULL,
  `unit_purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `unit_selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `line_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`unit_id`) REFERENCES `product_units`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  INDEX `idx_sale_item_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT DEFAULT NULL,
  `purchase_id` INT DEFAULT NULL,
  `payment_type` ENUM('SALE', 'PURCHASE', 'EXPENSE', 'REFUND') NOT NULL,
  `payment_method` ENUM('CASH', 'UPI', 'CARD', 'OTHER') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `processed_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_payment_sale` (`sale_id`),
  INDEX `idx_payment_type` (`payment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Sales Returns
CREATE TABLE IF NOT EXISTS `sales_returns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_number` VARCHAR(50) NOT NULL UNIQUE,
  `sale_id` INT NOT NULL,
  `customer_id` INT DEFAULT NULL,
  `return_date` DATE NOT NULL,
  `total_refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `processed_by` INT DEFAULT NULL,
  `reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_return_number` (`return_number`),
  INDEX `idx_return_date` (`return_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Sales Return Items
CREATE TABLE IF NOT EXISTS `sales_return_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_id` INT NOT NULL,
  `sale_item_id` INT NOT NULL,
  `unit_id` INT NOT NULL,
  `barcode` VARCHAR(60) NOT NULL,
  `product_id` INT NOT NULL,
  `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `return_destination` ENUM('SHOWROOM', 'WAREHOUSE', 'DAMAGED') NOT NULL DEFAULT 'SHOWROOM',
  `condition_status` VARCHAR(100) DEFAULT 'GOOD',
  FOREIGN KEY (`return_id`) REFERENCES `sales_returns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`unit_id`) REFERENCES `product_units`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Expenses
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `expense_number` VARCHAR(50) NOT NULL UNIQUE,
  `expense_date` DATE NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` ENUM('CASH', 'UPI', 'CARD', 'OTHER') NOT NULL DEFAULT 'CASH',
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_expense_date` (`expense_date`),
  INDEX `idx_expense_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Daily Closings
CREATE TABLE IF NOT EXISTS `daily_closings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `closing_date` DATE NOT NULL UNIQUE,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_sales_cash` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_sales_upi` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_sales_card` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_sales_other` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_sales_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_expenses` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_refunds` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `expected_cash` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `actual_cash` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `difference` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `closed_by` INT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_closing_date` (`closing_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Attendance
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `login_time` TIME DEFAULT NULL,
  `logout_time` TIME DEFAULT NULL,
  `working_hours` DECIMAL(5,2) DEFAULT 0.00,
  `status` ENUM('Present', 'Absent', 'Half Day', 'Leave') NOT NULL DEFAULT 'Present',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_date` (`user_id`, `date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_att_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. Stock Movements Audit Ledger
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `unit_id` INT DEFAULT NULL,
  `barcode` VARCHAR(60) NOT NULL,
  `product_id` INT NOT NULL,
  `from_location_id` INT DEFAULT NULL,
  `to_location_id` INT DEFAULT NULL,
  `movement_type` ENUM('PURCHASE', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'RETURN', 'DAMAGE', 'MANUAL_ADJUSTMENT') NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `reference_type` VARCHAR(50) DEFAULT NULL,
  `reference_id` INT DEFAULT NULL,
  `movement_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `user_id` INT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_movement_barcode` (`barcode`),
  INDEX `idx_movement_product` (`product_id`),
  INDEX `idx_movement_date` (`movement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `role` VARCHAR(50) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `record_id` VARCHAR(100) DEFAULT NULL,
  `old_value` JSON DEFAULT NULL,
  `new_value` JSON DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. Settings
CREATE TABLE IF NOT EXISTS `settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `key_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
