-- Migration: discount codes engine (KUT-61 redesign)
-- Replaces discount_rules with a code-based system.
-- One code = one rule; one rule has multiple conditions (OR logic per item).
-- Conditions are checked at order time — menus always show full price.

DROP TABLE IF EXISTS `discount_rules`;

CREATE TABLE `discount_codes` (
  `code_id`      int          NOT NULL AUTO_INCREMENT,
  `code`         varchar(50)  NOT NULL,
  `name`         varchar(200) NOT NULL,
  `discount_pct` decimal(5,2) NOT NULL,
  `city_code`    varchar(20)  NOT NULL,
  `from_date`    date         NOT NULL,
  `to_date`      date         DEFAULT NULL,
  `max_uses`     int          DEFAULT NULL,
  `use_count`    int          NOT NULL DEFAULT 0,
  `is_active`    tinyint(1)   NOT NULL DEFAULT 1,
  `created_at`   datetime     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code_id`),
  UNIQUE KEY `uq_discount_code` (`code`, `city_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Conditions for each code (OR logic — discount fires if ANY condition matches the cart item).
-- A code with zero conditions is treated as global (applies to all items).
-- dimension: 'item' | 'category' | 'meal_type' | 'global'
-- entity_id:    item_id or category_id  (NULL for meal_type / global)
-- entity_label: meal_type string        (NULL for item / category / global)
CREATE TABLE `discount_code_conditions` (
  `condition_id` int         NOT NULL AUTO_INCREMENT,
  `code_id`      int         NOT NULL,
  `dimension`    varchar(50) NOT NULL,
  `entity_id`    int         DEFAULT NULL,
  `entity_label` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`condition_id`),
  KEY `fk_dcc_code` (`code_id`),
  CONSTRAINT `fk_dcc_code` FOREIGN KEY (`code_id`)
    REFERENCES `discount_codes` (`code_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Bookkeeping columns on order_items so we always know what was charged vs. full price.
ALTER TABLE `order_items`
  ADD COLUMN `original_price`        decimal(10,2) DEFAULT NULL AFTER `price`,
  ADD COLUMN `applied_discount_pct`  decimal(5,2)  DEFAULT NULL AFTER `original_price`;

-- Track which code was used on each order.
ALTER TABLE `orders`
  ADD COLUMN `discount_code` varchar(50) DEFAULT NULL AFTER `discount`;
