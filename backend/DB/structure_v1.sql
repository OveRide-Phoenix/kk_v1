CREATE TABLE `customers`(
    `customer_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `referred_by` VARCHAR(100) NULL,
    `primary_mobile` VARCHAR(15) NOT NULL,
    `alternative_mobile` VARCHAR(15) NULL,
    `name` VARCHAR(100) NOT NULL,
    `recipient_name` VARCHAR(100) NOT NULL,
    `payment_frequency` VARCHAR(50) NULL DEFAULT 'Daily',
    `email` VARCHAR(100) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP());
ALTER TABLE
    `customers` ADD UNIQUE `customers_primary_mobile_unique`(`primary_mobile`);
ALTER TABLE
    `customers` ADD UNIQUE `customers_email_unique`(`email`);
CREATE TABLE `address`(
    `address_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `house_apartment_no` VARCHAR(255) NULL,
    `written_address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `pin_code` VARCHAR(10) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `address_type` VARCHAR(50) NULL,
    `route_assignment` VARCHAR(50) NULL
);
CREATE TABLE `items`(
    `item_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `parent_item_id` INT NULL,
    `is_combo` BOOLEAN NULL DEFAULT 'DEFAULT FALSE',
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `alias` VARCHAR(100) NULL,
    `item_type` VARCHAR(50) NULL,
    `group_name` VARCHAR(100) NULL,
    `uom` VARCHAR(50) NOT NULL,
    `weight_factor` DECIMAL(5, 3) NULL,
    `weight_uom` VARCHAR(50) NULL,
    `hsn_code` VARCHAR(50) NULL,
    `factor` DECIMAL(5, 3) NULL DEFAULT '1',
    `quantity_portion` INT NULL,
    `buffer_percentage` DECIMAL(5, 2) NULL,
    `picture_url` VARCHAR(255) NULL,
    `rate_effect_date` DATE NOT NULL,
    `basic_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `discount` DECIMAL(10, 2) NULL DEFAULT '0',
    `breakfast_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `lunch_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `dinner_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `snacks_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `condiments_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `sweets_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `festival_price` DECIMAL(10, 2) NULL DEFAULT '0',
    `cgst` DECIMAL(5, 2) NULL DEFAULT '0',
    `sgst` DECIMAL(5, 2) NULL DEFAULT '0',
    `igst` DECIMAL(5, 2) NULL DEFAULT '0',
    `net_price` DECIMAL(10, 2) NULL DEFAULT '0'
);
CREATE TABLE `menu`(
    `menu_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `menu_type` ENUM('') NOT NULL,
    `meal_type` ENUM('') NOT NULL,
    `date` DATE NULL,
    `festival` BOOLEAN NULL
);
CREATE TABLE `menu_items`(
    `menu_item_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `menu_id` INT NOT NULL,
    `item_id` INT NOT NULL,
    `planned_qty` INT NOT NULL,
    `available_qty` INT NOT NULL,
    `rate` DECIMAL(10, 2) NULL,
    `sort_order` INT NULL
);
CREATE TABLE `orders`(
    `order_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `address_id` INT NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'Pending'
);
CREATE TABLE `order_items`(
    `order_id` INT NOT NULL,
    `order_item_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `item_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `menu_rate` DECIMAL(10, 2) NOT NULL
);
ALTER TABLE
    `items` ADD CONSTRAINT `items_parent_item_id_foreign` FOREIGN KEY(`parent_item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `address` ADD CONSTRAINT `address_customer_id_foreign` FOREIGN KEY(`customer_id`) REFERENCES `customers`(`customer_id`);
ALTER TABLE
    `menu_items` ADD CONSTRAINT `menu_items_rate_foreign` FOREIGN KEY(`rate`) REFERENCES `order_items`(`menu_rate`);
ALTER TABLE
    `menu_items` ADD CONSTRAINT `menu_items_menu_id_foreign` FOREIGN KEY(`menu_id`) REFERENCES `menu`(`menu_id`);
ALTER TABLE
    `orders` ADD CONSTRAINT `orders_address_id_foreign` FOREIGN KEY(`address_id`) REFERENCES `address`(`address_id`);
ALTER TABLE
    `orders` ADD CONSTRAINT `orders_customer_id_foreign` FOREIGN KEY(`customer_id`) REFERENCES `customers`(`customer_id`);
ALTER TABLE
    `order_items` ADD CONSTRAINT `order_items_item_id_foreign` FOREIGN KEY(`item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `order_items` ADD CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY(`order_id`) REFERENCES `orders`(`order_id`);
ALTER TABLE
    `menu_items` ADD CONSTRAINT `menu_items_item_id_foreign` FOREIGN KEY(`item_id`) REFERENCES `items`(`item_id`);