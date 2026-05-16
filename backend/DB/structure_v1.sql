SET FOREIGN_KEY_CHECKS=0;

-- TABLE: categories
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: roles
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: component_types
CREATE TABLE `component_types` (
  `component_type_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `category_id` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`component_type_id`),
  UNIQUE KEY `uk_component_types_name` (`name`),
  KEY `idx_component_types_category_id` (`category_id`),
  CONSTRAINT `fk_component_types_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: constants
CREATE TABLE `constants` (
  `constant_id` int NOT NULL AUTO_INCREMENT,
  `constant_code` varchar(50) NOT NULL,
  `constant_type` varchar(20) NOT NULL,
  `constant_value` decimal(5,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`constant_id`),
  UNIQUE KEY `constant_code` (`constant_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: bld
CREATE TABLE `bld` (
  `bld_id` int NOT NULL AUTO_INCREMENT,
  `bld_type` enum('Breakfast','Lunch','Dinner','Condiments') NOT NULL,
  PRIMARY KEY (`bld_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: customers
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `referred_by` varchar(100) DEFAULT NULL,
  `primary_mobile` varchar(15) NOT NULL,
  `alternative_mobile` varchar(15) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `recipient_name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `payment_frequency` varchar(50) DEFAULT 'Daily',
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `roles` json DEFAULT NULL,
  `admin_password_hash` varchar(255) DEFAULT NULL,
  `admin_is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `primary_mobile` (`primary_mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: delivery_routes
CREATE TABLE `delivery_routes` (
  `route_id` int NOT NULL AUTO_INCREMENT,
  `city_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `route_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `route_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`route_id`),
  UNIQUE KEY `uq_delivery_routes_city_route_code` (`city_code`,`route_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLE: trip_sheets
CREATE TABLE `trip_sheets` (
  `trip_sheet_id` int NOT NULL AUTO_INCREMENT,
  `service_date` date NOT NULL,
  `city_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meal_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `payload` json NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`trip_sheet_id`),
  UNIQUE KEY `uq_trip_sheets_service_city_meal` (`service_date`,`city_code`,`meal_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLE: items
CREATE TABLE `items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `alias` varchar(100) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `component_type_id` int DEFAULT NULL,
  `uom_customer` varchar(50) NOT NULL,
  `unit_packing` decimal(10,3) DEFAULT NULL,
  `uom_packing` varchar(50) DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `hsn_code` varchar(50) DEFAULT NULL,
  `uom_production` varchar(50) DEFAULT NULL,
  `packing_to_production_rate` decimal(10,6) DEFAULT '1.000000',
  `buffer_percentage` decimal(5,2) DEFAULT NULL,
  `max_qty_breakfast` int DEFAULT NULL,
  `max_qty_lunch` int DEFAULT NULL,
  `max_qty_dinner` int DEFAULT NULL,
  `max_qty_condiments` int DEFAULT NULL,
  `picture_url` varchar(255) DEFAULT NULL,
  `breakfast_price` decimal(10,2) DEFAULT NULL,
  `lunch_price` decimal(10,2) DEFAULT NULL,
  `dinner_price` decimal(10,2) DEFAULT NULL,
  `condiments_price` decimal(10,2) DEFAULT NULL,
  `festival_price` decimal(10,2) DEFAULT NULL,
  `cgst` decimal(5,2) DEFAULT NULL,
  `sgst` decimal(5,2) DEFAULT NULL,
  `igst` decimal(5,2) DEFAULT NULL,
  `net_price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `category_id` (`category_id`),
  KEY `idx_items_component_type_id` (`component_type_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: combos
CREATE TABLE `combos` (
  `combo_id` int NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`combo_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `combos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: addresses
CREATE TABLE `addresses` (
  `address_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `house_apartment_no` varchar(255) DEFAULT NULL,
  `written_address` text NOT NULL,
  `city` varchar(100) NOT NULL,
  `city_code` varchar(3) NOT NULL DEFAULT 'MYS',
  `pin_code` varchar(10) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `address_type` varchar(50) DEFAULT NULL,
  `route_id` int DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'FALSE = deprecated/soft-deleted; never hard-delete a row that has orders referencing it',
  PRIMARY KEY (`address_id`),
  KEY `customer_id` (`customer_id`),
  KEY `fk_addresses_route_id` (`route_id`),
  KEY `idx_addresses_customer_active` (`customer_id`,`is_active`,`is_default`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `fk_addresses_route_id` FOREIGN KEY (`route_id`) REFERENCES `delivery_routes` (`route_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: menu
CREATE TABLE `menu` (
  `menu_id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `is_festival` tinyint(1) NOT NULL DEFAULT '0',
  `is_released` tinyint(1) NOT NULL DEFAULT '0',
  `period_type` enum('one_day','subscription','all_days') DEFAULT NULL,
  `city_code` varchar(3) NOT NULL DEFAULT 'MYS',
  `bld_id` int NOT NULL,
  `is_production_generated` tinyint(1) DEFAULT '0',
  `buffer_override_pct` decimal(5,2) DEFAULT NULL,
  `menu_type` varchar(20) NOT NULL DEFAULT 'ONE_DAY',
  `delivers_by` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`menu_id`),
  KEY `fk_menu_bld` (`bld_id`),
  CONSTRAINT `fk_menu_bld` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: item_price_history
CREATE TABLE `item_price_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date DEFAULT NULL,
  `breakfast_price` decimal(10,2) DEFAULT NULL,
  `lunch_price` decimal(10,2) DEFAULT NULL,
  `dinner_price` decimal(10,2) DEFAULT NULL,
  `condiments_price` decimal(10,2) DEFAULT NULL,
  `festival_price` decimal(10,2) DEFAULT NULL,
  `cgst` decimal(5,2) DEFAULT NULL,
  `sgst` decimal(5,2) DEFAULT NULL,
  `igst` decimal(5,2) DEFAULT NULL,
  `net_price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_price_history_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: item_discounts
CREATE TABLE `item_discounts` (
  `discount_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `city_code` varchar(20) NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date DEFAULT NULL,
  `discount_pct` decimal(5,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`discount_id`),
  KEY `idx_item_discounts_lookup` (`item_id`,`city_code`,`from_date`),
  CONSTRAINT `fk_item_discounts_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: item_bld_map
CREATE TABLE `item_bld_map` (
  `item_id` int NOT NULL,
  `bld_id` int NOT NULL,
  PRIMARY KEY (`item_id`,`bld_id`),
  KEY `bld_id` (`bld_id`),
  CONSTRAINT `item_bld_map_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `item_bld_map_ibfk_2` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: combo_items
CREATE TABLE `combo_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `combo_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `component_type_id` int DEFAULT NULL,
  `quantity` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `combo_id` (`combo_id`),
  KEY `item_id` (`item_id`),
  KEY `idx_combo_items_component_type_id` (`component_type_id`),
  CONSTRAINT `combo_items_ibfk_1` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `combo_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: combo_bld_map
CREATE TABLE `combo_bld_map` (
  `combo_id` int NOT NULL,
  `bld_id` int NOT NULL,
  PRIMARY KEY (`combo_id`,`bld_id`),
  KEY `idx_combo_bld_map_bld_id` (`bld_id`),
  CONSTRAINT `fk_combo_bld_map_bld` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_combo_bld_map_combo` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: legacy_combo_map
CREATE TABLE `legacy_combo_map` (
  `legacy_item_id` int NOT NULL,
  `combo_id` int NOT NULL,
  `migrated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`legacy_item_id`),
  KEY `fk_legacy_combo` (`combo_id`),
  CONSTRAINT `fk_legacy_combo` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: orders
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `address_id` int NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` varchar(50) DEFAULT 'Confirmed',
  `payment_method` varchar(50) NOT NULL,
  `order_date` date DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `cgst` decimal(10,2) DEFAULT '0.00',
  `sgst` decimal(10,2) DEFAULT '0.00',
  `delivery_charge` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `order_type` varchar(50) DEFAULT 'one_time',
  `paid` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `address_id` (`address_id`),
  KEY `idx_orders_order_date` (`order_date`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: menu_items
CREATE TABLE `menu_items` (
  `menu_item_id` int NOT NULL AUTO_INCREMENT,
  `menu_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `combo_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `max_qty` int DEFAULT NULL,
  `rate` decimal(10,2) NOT NULL,
  `discount_pct` decimal(5,2) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int DEFAULT NULL,
  `available_qty` int NOT NULL DEFAULT '0',
  `buffer_qty` decimal(10,2) DEFAULT '0.00',
  `final_qty` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`menu_item_id`),
  KEY `menu_id` (`menu_id`),
  KEY `item_id` (`item_id`),
  KEY `category_id` (`category_id`),
  KEY `idx_menu_items_combo_id` (`combo_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`menu_id`),
  CONSTRAINT `menu_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `menu_items_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `menu_items_ibfk_combo` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: order_items
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `combo_id` int DEFAULT NULL,
  `menu_item_id` int DEFAULT NULL,
  `meal_type` varchar(50) DEFAULT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `item_id` (`item_id`),
  KEY `idx_order_items_combo_id` (`combo_id`),
  KEY `idx_order_items_menu_item_id` (`menu_item_id`),
  CONSTRAINT `fk_order_items_menu_item` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`) ON DELETE SET NULL,
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `order_items_ibfk_combo` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: plated_items
CREATE TABLE `plated_items` (
  `plated_item_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`plated_item_id`),
  UNIQUE KEY `uk_plated_items_item_id` (`item_id`),
  CONSTRAINT `fk_plated_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: plated_item_components
CREATE TABLE `plated_item_components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plated_item_id` int NOT NULL,
  `component_item_id` int DEFAULT NULL,
  `component_type_id` int DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL DEFAULT '1.000',
  `sort_order` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_plated_item_components_plated_item_id` (`plated_item_id`),
  KEY `idx_plated_item_components_component_item_id` (`component_item_id`),
  KEY `idx_plated_item_components_component_type_id` (`component_type_id`),
  CONSTRAINT `fk_plated_item_components_component` FOREIGN KEY (`component_item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `fk_plated_item_components_parent` FOREIGN KEY (`plated_item_id`) REFERENCES `plated_items` (`plated_item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- TABLE: admin_logs
CREATE TABLE `admin_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action_type` enum('ADD','UPDATE','DELETE') NOT NULL,
  `entity_type` enum('ITEM','COMBO','ADDON','CATEGORY') NOT NULL,
  `entity_id` int NOT NULL,
  `description` text,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- VIEW: customer_orders_view
CREATE VIEW `customer_orders_view` AS select `c`.`customer_id` AS `customer_id`,`c`.`name` AS `customer_name`,`c`.`primary_mobile` AS `customer_phone`,`c`.`email` AS `customer_email`,`a`.`written_address` AS `address`,count(`o`.`order_id`) AS `no_of_orders` from ((`customers` `c` left join `addresses` `a` on(((`c`.`customer_id` = `a`.`customer_id`) and (`a`.`is_default` = true) and (`a`.`is_active` = true)))) left join `orders` `o` on((`c`.`customer_id` = `o`.`customer_id`))) group by `c`.`customer_id`,`c`.`name`,`c`.`primary_mobile`,`c`.`email`,`a`.`written_address`;

SET FOREIGN_KEY_CHECKS=1;
