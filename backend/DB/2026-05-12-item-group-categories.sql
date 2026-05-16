INSERT INTO categories (category_name)
SELECT seed.category_name
FROM (
    SELECT 'Ready Mixes' AS category_name
    UNION ALL SELECT 'Savouries'
    UNION ALL SELECT 'Spices'
    UNION ALL SELECT 'Accompaniments'
    UNION ALL SELECT 'Festival Specials'
) AS seed
LEFT JOIN categories existing ON existing.category_name = seed.category_name
WHERE existing.category_id IS NULL;

SET @component_types_category_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'component_types'
      AND COLUMN_NAME = 'category_id'
);
SET @component_types_category_column_sql := IF(
    @component_types_category_column_exists = 0,
    'ALTER TABLE component_types ADD COLUMN category_id INT NULL AFTER description',
    'SELECT 1'
);
PREPARE stmt FROM @component_types_category_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @component_types_category_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'component_types'
      AND INDEX_NAME = 'idx_component_types_category_id'
);
SET @component_types_category_index_sql := IF(
    @component_types_category_index_exists = 0,
    'CREATE INDEX idx_component_types_category_id ON component_types (category_id)',
    'SELECT 1'
);
PREPARE stmt FROM @component_types_category_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE component_types ct
LEFT JOIN (
    SELECT 'Curry' AS name, 'South Indian' AS category_name
    UNION ALL SELECT 'Rice', 'South Indian'
    UNION ALL SELECT 'Sambar', 'South Indian'
    UNION ALL SELECT 'Huli', 'South Indian'
    UNION ALL SELECT 'Palya', 'South Indian'
    UNION ALL SELECT 'Dal', 'North Indian'
    UNION ALL SELECT 'Sweet', 'Sweets'
    UNION ALL SELECT 'Beverage', 'Beverages'
    UNION ALL SELECT 'Chutney', 'Accompaniments'
    UNION ALL SELECT 'Raita', 'Accompaniments'
    UNION ALL SELECT 'Pickle', 'Accompaniments'
    UNION ALL SELECT 'Ghee', 'Accompaniments'
    UNION ALL SELECT 'Curd', 'Accompaniments'
    UNION ALL SELECT 'Idly', 'South Indian'
    UNION ALL SELECT 'Vada', 'South Indian'
    UNION ALL SELECT 'Dosa', 'South Indian'
    UNION ALL SELECT 'Poori', 'South Indian'
    UNION ALL SELECT 'Upma', 'South Indian'
    UNION ALL SELECT 'Pongal', 'South Indian'
    UNION ALL SELECT 'Curd Rice', 'South Indian'
    UNION ALL SELECT 'Chapati', 'North Indian'
    UNION ALL SELECT 'Bhature', 'North Indian'
    UNION ALL SELECT 'Idly Vada', 'South Indian'
    UNION ALL SELECT 'Rice Meal', 'South Indian'
    UNION ALL SELECT 'Chapati Meal', 'North Indian'
    UNION ALL SELECT 'Poori Saagu', 'South Indian'
    UNION ALL SELECT 'Mini Meals', 'South Indian'
) AS mapping ON mapping.name = ct.name
LEFT JOIN categories c ON c.category_name = mapping.category_name
SET ct.category_id = c.category_id
WHERE ct.category_id IS NULL
  AND c.category_id IS NOT NULL;
