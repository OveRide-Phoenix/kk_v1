-- KUT-69: durable subscription menus and customer pause windows.

CREATE TABLE IF NOT EXISTS subscription_pause_windows (
  pause_id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  city_code VARCHAR(3) NOT NULL,
  meal_type VARCHAR(20) NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (pause_id),
  KEY idx_subscription_pause_city_dates (city_code, start_date, end_date),
  KEY idx_subscription_pause_customer (customer_id),
  CONSTRAINT fk_subscription_pause_customer
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    ON DELETE CASCADE
);

SET @menu_items_component_type_col_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'menu_items'
     AND COLUMN_NAME = 'component_type_id'
);

SET @menu_items_component_type_col_sql := IF(
  @menu_items_component_type_col_exists = 0,
  'ALTER TABLE menu_items ADD COLUMN component_type_id INT NULL',
  'SELECT 1'
);

PREPARE menu_items_component_type_col_stmt FROM @menu_items_component_type_col_sql;
EXECUTE menu_items_component_type_col_stmt;
DEALLOCATE PREPARE menu_items_component_type_col_stmt;

SET @menu_items_component_type_fk_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'menu_items'
     AND CONSTRAINT_NAME = 'fk_menu_items_component_type'
);

SET @menu_items_component_type_fk_sql := IF(
  @menu_items_component_type_fk_exists = 0,
  'ALTER TABLE menu_items ADD CONSTRAINT fk_menu_items_component_type FOREIGN KEY (component_type_id) REFERENCES component_types(component_type_id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE menu_items_component_type_fk_stmt FROM @menu_items_component_type_fk_sql;
EXECUTE menu_items_component_type_fk_stmt;
DEALLOCATE PREPARE menu_items_component_type_fk_stmt;

SET @menu_subscription_lookup_idx_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'menu'
     AND INDEX_NAME = 'idx_menu_subscription_lookup'
);

SET @menu_subscription_lookup_idx_sql := IF(
  @menu_subscription_lookup_idx_exists = 0,
  'CREATE INDEX idx_menu_subscription_lookup ON menu (menu_type, city_code, bld_id, period_type, date)',
  'SELECT 1'
);

PREPARE menu_subscription_lookup_idx_stmt FROM @menu_subscription_lookup_idx_sql;
EXECUTE menu_subscription_lookup_idx_stmt;
DEALLOCATE PREPARE menu_subscription_lookup_idx_stmt;
