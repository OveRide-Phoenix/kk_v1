-- KUT-51: Condiment Types taxonomy
-- Introduces a condiment_types table and links items to it.

CREATE TABLE `condiment_types` (
  `condiment_type_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`condiment_type_id`),
  UNIQUE KEY `uk_condiment_types_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `items`
  ADD COLUMN `condiment_type_id` int DEFAULT NULL AFTER `category_id`,
  ADD CONSTRAINT `fk_items_condiment_type`
    FOREIGN KEY (`condiment_type_id`) REFERENCES `condiment_types` (`condiment_type_id`)
    ON DELETE SET NULL;

INSERT INTO `condiment_types` (`name`, `sort_order`) VALUES
  ('Ready-mixes', 1),
  ('Sweets', 2),
  ('Savouries', 3),
  ('Spices', 4),
  ('Accompaniments', 5),
  ('Festival Specials', 6);
