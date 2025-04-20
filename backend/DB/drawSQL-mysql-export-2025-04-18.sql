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
CREATE TABLE `addresses`(
    `address_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `house_apartment_no` VARCHAR(255) NULL,
    `written_address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `pin_code` VARCHAR(10) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `address_type` VARCHAR(50) NULL,
    `route_assignment` VARCHAR(50) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT 'DEFAULT FALSE'
);
CREATE TABLE `orders`(
    `order_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `address_id` INT NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'Pending',
    `payment_method` VARCHAR(50) NOT NULL,
    `discount` DECIMAL(10, 2) NULL DEFAULT '0',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP());
CREATE TABLE `order_items`(
    `order_item_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `item_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL
);
CREATE TABLE `menu`(
    `menu_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `menu_type` ENUM('') NOT NULL,
    `date` DATE NOT NULL,
    `is_festival` BOOLEAN NOT NULL DEFAULT 'DEFAULT FALSE'
);
CREATE TABLE `groups`(
    `group_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `group_name` VARCHAR(100) NOT NULL
);
ALTER TABLE
    `groups` ADD UNIQUE `groups_group_name_unique`(`group_name`);
CREATE TABLE `items`(
    `item_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `alias` VARCHAR(100) NULL,
    `group_id` INT NULL,
    `uom` VARCHAR(50) NOT NULL,
    `weight_factor` DECIMAL(5, 3) NULL,
    `weight_uom` VARCHAR(50) NULL,
    `item_type` VARCHAR(50) NULL,
    `hsn_code` VARCHAR(50) NULL,
    `factor` DECIMAL(5, 3) NULL DEFAULT '1',
    `quantity_portion` INT NULL,
    `buffer_percentage` DECIMAL(5, 2) NULL,
    `picture_url` VARCHAR(255) NULL,
    `breakfast_price` DECIMAL(10, 2) NULL,
    `lunch_price` DECIMAL(10, 2) NULL,
    `dinner_price` DECIMAL(10, 2) NULL,
    `condiments_price` DECIMAL(10, 2) NULL,
    `festival_price` DECIMAL(10, 2) NULL,
    `cgst` DECIMAL(5, 2) NULL,
    `sgst` DECIMAL(5, 2) NULL,
    `igst` DECIMAL(5, 2) NULL,
    `net_price` DECIMAL(10, 2) NULL,
    `is_combo` BOOLEAN NOT NULL DEFAULT 'DEFAULT FALSE'
);
CREATE TABLE `menu_items`(
    `menu_item_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `menu_id` INT NOT NULL,
    `item_id` INT NOT NULL,
    `group_id` INT NULL,
    `planned_qty` INT NULL,
    `rate` DECIMAL(10, 2) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT 'DEFAULT FALSE',
    `sort_order` INT NULL
);
CREATE TABLE `item_combos`(
    `combo_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `combo_item_id` INT NOT NULL,
    `included_item_id` INT NULL,
    `included_group_id` INT NULL,
    `quantity` INT NOT NULL DEFAULT '1'
);
CREATE TABLE `item_add_ons`(
    `add_on_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `main_item_id` INT NOT NULL,
    `add_on_item_id` INT NOT NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT 'DEFAULT FALSE',
    `max_quantity` INT NOT NULL DEFAULT '1'
);
CREATE TABLE `item_price_history`(
    `history_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `item_id` INT NOT NULL,
    `effect_date` DATE NOT NULL,
    `breakfast_price` DECIMAL(10, 2) NULL,
    `lunch_price` DECIMAL(10, 2) NULL,
    `dinner_price` DECIMAL(10, 2) NULL,
    `condiments_price` DECIMAL(10, 2) NULL,
    `festival_price` DECIMAL(10, 2) NULL,
    `cgst` DECIMAL(5, 2) NULL,
    `sgst` DECIMAL(5, 2) NULL,
    `igst` DECIMAL(5, 2) NULL,
    `net_price` DECIMAL(10, 2) NULL
);
ALTER TABLE
    `order_items` ADD CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY(`order_id`) REFERENCES `orders`(`order_id`);
ALTER TABLE
    `orders` ADD CONSTRAINT `orders_customer_id_foreign` FOREIGN KEY(`customer_id`) REFERENCES `customers`(`customer_id`);
ALTER TABLE
    `order_items` ADD CONSTRAINT `order_items_item_id_foreign` FOREIGN KEY(`item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `orders` ADD CONSTRAINT `orders_address_id_foreign` FOREIGN KEY(`address_id`) REFERENCES `addresses`(`address_id`);
ALTER TABLE
    `menu_items` ADD CONSTRAINT `menu_items_menu_id_foreign` FOREIGN KEY(`menu_id`) REFERENCES `menu`(`menu_id`);
ALTER TABLE
    `item_price_history` ADD CONSTRAINT `item_price_history_item_id_foreign` FOREIGN KEY(`item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `item_combos` ADD CONSTRAINT `item_combos_included_group_id_foreign` FOREIGN KEY(`included_group_id`) REFERENCES `groups`(`group_id`);
ALTER TABLE
    `item_add_ons` ADD CONSTRAINT `item_add_ons_main_item_id_foreign` FOREIGN KEY(`main_item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `menu_items` ADD CONSTRAINT `menu_items_item_id_foreign` FOREIGN KEY(`item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `items` ADD CONSTRAINT `items_group_id_foreign` FOREIGN KEY(`group_id`) REFERENCES `groups`(`group_id`);
ALTER TABLE
    `item_combos` ADD CONSTRAINT `item_combos_combo_item_id_foreign` FOREIGN KEY(`combo_item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `menu_items` ADD CONSTRAINT `menu_items_group_id_foreign` FOREIGN KEY(`group_id`) REFERENCES `groups`(`group_id`);
ALTER TABLE
    `item_add_ons` ADD CONSTRAINT `item_add_ons_add_on_item_id_foreign` FOREIGN KEY(`add_on_item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `item_combos` ADD CONSTRAINT `item_combos_included_item_id_foreign` FOREIGN KEY(`included_item_id`) REFERENCES `items`(`item_id`);
ALTER TABLE
    `addresses` ADD CONSTRAINT `addresses_customer_id_foreign` FOREIGN KEY(`customer_id`) REFERENCES `customers`(`customer_id`);