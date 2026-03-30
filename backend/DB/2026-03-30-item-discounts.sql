-- Migration: item_discounts rules table + discount_pct snapshot on menu_items

CREATE TABLE `item_discounts` (
  `discount_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `city_code` varchar(20) NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date DEFAULT NULL,
  `discount_pct` decimal(5,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`discount_id`),
  KEY `idx_item_discounts_lookup` (`item_id`, `city_code`, `from_date`),
  CONSTRAINT `fk_item_discounts_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `menu_items`
  ADD COLUMN `discount_pct` decimal(5,2) DEFAULT NULL AFTER `rate`;
