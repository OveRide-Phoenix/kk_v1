-- Multi-city condiments support
-- 1) Extend menu table with menu_type (ONE_DAY / CONDIMENTS) and allow NULL dates for condiments rows.
ALTER TABLE menu
  ADD COLUMN IF NOT EXISTS menu_type ENUM('ONE_DAY','CONDIMENTS') NOT NULL DEFAULT 'ONE_DAY' AFTER is_production_generated;

UPDATE menu
   SET menu_type = 'ONE_DAY'
 WHERE menu_type IS NULL;

ALTER TABLE menu
  MODIFY COLUMN date DATE NULL;

-- Optional: ensure there is only one CONDIMENTS row per city (MySQL doesn't support partial unique indexes;
-- enforce with application logic).

-- 2) Flag condiments in items table.
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS is_condiment TINYINT(1) NOT NULL DEFAULT 0 AFTER festival_price;
