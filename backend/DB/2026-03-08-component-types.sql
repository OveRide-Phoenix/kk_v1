CREATE TABLE IF NOT EXISTS component_types (
    component_type_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_component_types_name (name)
);

SET @items_component_type_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'items'
      AND COLUMN_NAME = 'component_type_id'
);
SET @items_component_type_column_sql := IF(
    @items_component_type_column_exists = 0,
    'ALTER TABLE items ADD COLUMN component_type_id INT NULL AFTER category_id',
    'SELECT 1'
);
PREPARE stmt FROM @items_component_type_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @items_component_type_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'items'
      AND INDEX_NAME = 'idx_items_component_type_id'
);
SET @items_component_type_index_sql := IF(
    @items_component_type_index_exists = 0,
    'CREATE INDEX idx_items_component_type_id ON items (component_type_id)',
    'SELECT 1'
);
PREPARE stmt FROM @items_component_type_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @plated_component_type_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'plated_item_components'
      AND COLUMN_NAME = 'component_type_id'
);
SET @plated_component_type_column_sql := IF(
    @plated_component_type_column_exists = 0,
    'ALTER TABLE plated_item_components ADD COLUMN component_type_id INT NULL AFTER component_item_id',
    'SELECT 1'
);
PREPARE stmt FROM @plated_component_type_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @plated_component_item_nullable_sql := 'ALTER TABLE plated_item_components MODIFY COLUMN component_item_id INT NULL';
PREPARE stmt FROM @plated_component_item_nullable_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @plated_component_type_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'plated_item_components'
      AND INDEX_NAME = 'idx_plated_item_components_component_type_id'
);
SET @plated_component_type_index_sql := IF(
    @plated_component_type_index_exists = 0,
    'CREATE INDEX idx_plated_item_components_component_type_id ON plated_item_components (component_type_id)',
    'SELECT 1'
);
PREPARE stmt FROM @plated_component_type_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO component_types (name, description, is_active)
SELECT seed.name, seed.description, 1
FROM (
    SELECT 'Curry' AS name, 'Generic curry slot resolved to the item of the day' AS description
    UNION ALL
    SELECT 'Rice', 'Generic rice slot resolved to the item of the day'
    UNION ALL
    SELECT 'Sambar', 'Generic sambar slot resolved to the item of the day'
    UNION ALL
    SELECT 'Huli', 'Generic huli slot resolved to the item of the day'
    UNION ALL
    SELECT 'Palya', 'Generic palya slot resolved to the item of the day'
    UNION ALL
    SELECT 'Chutney', 'Generic chutney slot resolved to the item of the day'
) AS seed
LEFT JOIN component_types existing ON existing.name = seed.name
WHERE existing.component_type_id IS NULL;
