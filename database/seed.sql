-- Seed Data for Showroom ERP + POS
USE `showroom_erp`;

SET FOREIGN_KEY_CHECKS = 0;

-- Initial Settings
INSERT INTO `settings` (`key_name`, `key_value`) VALUES
('showroom_name', 'VIP CAR DECOR'),
('showroom_address', '104 Boulevard Avenue, Commercial Hub, Chennai, TN - 600001'),
('showroom_phone', '+91 98765 43210'),
('showroom_email', 'contact@vipcardecor.com'),
('gst_number', '33ABCDE1234F1Z5'),
('invoice_prefix', 'INV-2026-'),
('purchase_prefix', 'PUR-2026-'),
('transfer_prefix', 'TRF-2026-'),
('barcode_prefix', 'SH-'),
('currency_symbol', '₹'),
('default_tax_percent', '12.00'),
('default_reorder_level', '5'),
('invoice_footer', 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days with original receipt and barcode tags intact.')
ON DUPLICATE KEY UPDATE `key_value` = VALUES(`key_value`);

-- Stock Locations
INSERT INTO `stock_locations` (`id`, `code`, `name`, `description`) VALUES
(1, 'SHOWROOM', 'Main Showroom Floor', 'Products physically available in showroom for retail customer billing'),
(2, 'WAREHOUSE', 'Central Storage Warehouse', 'Products stored in central warehouse; NOT allowed for direct POS billing')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Default Admin and Billing Staff Users
-- Password for admin: Admin@123 (bcrypt: $2a$10$w8T0M47F1hOQnKq5Nl5Jhe77l2qIvdXq3u3WJmHqOqW.X.kZgRjO6)
-- Password for billing: Billing@123 (bcrypt: $2a$10$3p4Bq/6uG1F2uL8y9Z9E8.3GqKx4nE2e7iM3O5vT6r8P9Q1w2Y3Z4)
-- We will also handle live bcrypt generation in backend db bootstrapper
INSERT INTO `users` (`id`, `name`, `email`, `username`, `password_hash`, `role`, `phone`, `status`) VALUES
(1, 'System Administrator', 'admin@example.com', 'admin', '$2a$10$fV9uI2O8Zc1QY1e2G5LhvuGzMh5rD7b8T2v4C6j9w1K3s5N7x0P8u', 'ADMIN', '+91 9876500001', 'ACTIVE'),
(2, 'Billing Cashier 1', 'billing@example.com', 'cashier1', '$2a$10$fV9uI2O8Zc1QY1e2G5LhvuGzMh5rD7b8T2v4C6j9w1K3s5N7x0P8u', 'BILLING_USER', '+91 9876500002', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Categories
INSERT INTO `categories` (`id`, `name`, `code`, `description`) VALUES
(1, 'Car Interior Decor', 'CAR-INT', 'Seat covers, ambient lighting, steering grips, floor mats'),
(2, 'Car Electronics & Gadgets', 'CAR-ELEC', 'Dashcams, audio systems, GPS mounts, air purifiers'),
(3, 'Apparel & Uniforms', 'APP-WEAR', 'Showroom apparel, racing jackets, polo tees'),
(4, 'Car Care & Accessories', 'CAR-CARE', 'Microfiber kits, ceramic sprays, car perfumes')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Brands
INSERT INTO `brands` (`id`, `name`, `description`) VALUES
(1, 'Nexus Auto Style', 'Premium interior styling and custom car aesthetics'),
(2, 'Apex Dynamics', 'High-end automotive electronics and accessories'),
(3, 'Velocita Luxury', 'Luxury racing apparel, leather accessories and watches')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Suppliers
INSERT INTO `suppliers` (`id`, `name`, `phone`, `email`, `address`, `gst_number`, `opening_balance`, `current_balance`, `status`) VALUES
(1, 'Royal Auto Distributors Ltd', '+91 98401 23456', 'sales@royalauto.com', 'Plot 45, Auto Nagar, Chennai, TN', '33AAACR1234F1Z8', 0.00, 0.00, 'ACTIVE'),
(2, 'Metro Garments & Accessories', '+91 98402 34567', 'orders@metrogarments.com', '12 Textile Avenue, Tirupur, TN', '33BBBPM5678G2Z1', 0.00, 0.00, 'ACTIVE'),
(3, 'Apex Electronics Importers', '+91 98403 45678', 'support@apexelectronics.com', '88 Electronics Complex, Bengaluru, KA', '29CCCPD9012H3Z4', 0.00, 0.00, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Customers
INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `address`, `customer_type`) VALUES
(1, 'Walk-in Customer', '9999999999', 'walkin@showroom.local', 'Counter Sale', 'WALK_IN'),
(2, 'Rahul Varma', '9841122334', 'rahul.varma@gmail.com', '42 Gandhi Road, Chennai', 'REGISTERED'),
(3, 'Ananya Sundaram', '9842233445', 'ananya.s@outlook.com', '15 Lake View Street, Chennai', 'REGISTERED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Clean starting state for custom product creation
SET FOREIGN_KEY_CHECKS = 1;

