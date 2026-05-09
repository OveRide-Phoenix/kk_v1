-- Migration: scalable discount_rules table (KUT-61)
-- Replaces item_discounts as the canonical discount engine.
-- dimension: 'item' | 'category' | 'meal_type' | 'global' (extensible — just add new values)
-- entity_id: item_id or category_id; NULL for meal_type and global rules
-- entity_label: meal_type string (e.g. 'breakfast'); NULL for item/category/global rules
-- priority: lower number is resolved first when multiple rules match the same item

CREATE TABLE `discount_rules` (
  `rule_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `dimension` varchar(50) NOT NULL,
  `entity_id` int DEFAULT NULL,
  `entity_label` varchar(100) DEFAULT NULL,
  `city_code` varchar(20) NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date DEFAULT NULL,
  `discount_pct` decimal(5,2) NOT NULL,
  `priority` int NOT NULL DEFAULT 10,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `idx_discount_rules_lookup` (`dimension`, `city_code`, `from_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
