
SHOW CREATE TABLE addresses;

CREATE TABLE `addresses` (
  `address_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `house_apartment_no` varchar(255) DEFAULT NULL,
  `written_address` text NOT NULL,
  `city` varchar(100) NOT NULL,
  `pin_code` varchar(10) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `address_type` varchar(50) DEFAULT NULL,
  `route_assignment` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`address_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci



SHOW CREATE TABLE admin_users;
CREATE TABLE `admin_users` (
  `admin_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','manager') NOT NULL DEFAULT 'admin',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admin_customer` (`customer_id`),
  CONSTRAINT `fk_admin_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE bld;
CREATE TABLE `bld` (
  `bld_id` int NOT NULL AUTO_INCREMENT,
  `bld_type` enum('Breakfast','Lunch','Dinner','Condiments') NOT NULL,
  PRIMARY KEY (`bld_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE categories;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE combo_items;
CREATE TABLE `combo_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `combo_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `combo_id` (`combo_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `combo_items_ibfk_1` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `combo_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE combos;
CREATE TABLE `combos` (
  `combo_id` int NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`combo_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `combos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE customer_orders_view;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `customer_orders_view` AS select `c`.`customer_id` AS `customer_id`,`c`.`name` AS `customer_name`,`c`.`primary_mobile` AS `customer_phone`,`c`.`email` AS `customer_email`,`a`.`written_address` AS `address`,count(`o`.`order_id`) AS `no_of_orders` from ((`customers` `c` left join `addresses` `a` on(((`c`.`customer_id` = `a`.`customer_id`) and (`a`.`is_default` = true)))) left join `orders` `o` on((`c`.`customer_id` = `o`.`customer_id`))) group by `c`.`customer_id`,`c`.`name`,`c`.`primary_mobile`,`c`.`email`,`a`.`written_address`

SHOW CREATE TABLE customers;
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `referred_by` varchar(100) DEFAULT NULL,
  `primary_mobile` varchar(15) NOT NULL,
  `alternative_mobile` varchar(15) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `recipient_name` varchar(100) NOT NULL,
  `payment_frequency` varchar(50) DEFAULT 'Daily',
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `primary_mobile` (`primary_mobile`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE item_add_ons;
CREATE TABLE `item_add_ons` (
  `add_on_id` int NOT NULL AUTO_INCREMENT,
  `main_item_id` int NOT NULL,
  `add_on_item_id` int NOT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '0',
  `max_quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`add_on_id`),
  KEY `main_item_id` (`main_item_id`),
  KEY `add_on_item_id` (`add_on_item_id`),
  CONSTRAINT `item_add_ons_ibfk_1` FOREIGN KEY (`main_item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `item_add_ons_ibfk_2` FOREIGN KEY (`add_on_item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE item_price_history;
CREATE TABLE `item_price_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `effect_date` date NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE items;
CREATE TABLE `items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `alias` varchar(100) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `uom` varchar(50) NOT NULL,
  `weight_factor` decimal(5,3) DEFAULT NULL,
  `weight_uom` varchar(50) DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `hsn_code` varchar(50) DEFAULT NULL,
  `factor` decimal(5,3) DEFAULT '1.000',
  `quantity_portion` int DEFAULT NULL,
  `buffer_percentage` decimal(5,2) DEFAULT NULL,
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
  `bld_id` int NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `category_id` (`category_id`),
  KEY `fk_item_bld` (`bld_id`),
  CONSTRAINT `fk_item_bld` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=313 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE menu;
CREATE TABLE `menu` (
  `menu_id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `is_festival` tinyint(1) NOT NULL DEFAULT '0',
  `is_released` tinyint(1) NOT NULL DEFAULT '0',
  `period_type` enum('one_day','subscription','all_days') DEFAULT NULL,
  `bld_id` int NOT NULL,
  `is_production_generated` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`menu_id`),
  KEY `fk_menu_bld` (`bld_id`),
  CONSTRAINT `fk_menu_bld` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE menu_items;
CREATE TABLE `menu_items` (
  `menu_item_id` int NOT NULL AUTO_INCREMENT,
  `menu_id` int NOT NULL,
  `item_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `planned_qty` int DEFAULT NULL,
  `rate` decimal(10,2) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int DEFAULT NULL,
  `available_qty` int NOT NULL DEFAULT '0',
  `buffer_qty` decimal(10,2) DEFAULT '0.00',
  `final_qty` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`menu_item_id`),
  KEY `menu_id` (`menu_id`),
  KEY `item_id` (`item_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`menu_id`),
  CONSTRAINT `menu_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `menu_items_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=326 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE order_items;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

SHOW CREATE TABLE orders;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `address_id` int NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `payment_method` varchar(50) NOT NULL,
  `order_type` varchar(50) DEFAULT 'one_time',
  `discount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `address_id` (`address_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
