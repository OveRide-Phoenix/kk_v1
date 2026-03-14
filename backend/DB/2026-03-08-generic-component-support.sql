SET @combo_component_type_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'combo_items'
      AND COLUMN_NAME = 'component_type_id'
);
SET @combo_component_type_column_sql := IF(
    @combo_component_type_column_exists = 0,
    'ALTER TABLE combo_items ADD COLUMN component_type_id INT NULL AFTER item_id',
    'SELECT 1'
);
PREPARE stmt FROM @combo_component_type_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @combo_item_nullable_sql := 'ALTER TABLE combo_items MODIFY COLUMN item_id INT NULL';
PREPARE stmt FROM @combo_item_nullable_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @combo_component_type_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'combo_items'
      AND INDEX_NAME = 'idx_combo_items_component_type_id'
);
SET @combo_component_type_index_sql := IF(
    @combo_component_type_index_exists = 0,
    'CREATE INDEX idx_combo_items_component_type_id ON combo_items (component_type_id)',
    'SELECT 1'
);
PREPARE stmt FROM @combo_component_type_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
