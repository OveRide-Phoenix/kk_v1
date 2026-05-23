START TRANSACTION;

INSERT INTO categories (category_name)
SELECT 'South Indian'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE category_name = 'South Indian'
);

INSERT INTO categories (category_name)
SELECT 'North Indian'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE category_name = 'North Indian'
);

SET @south_indian_category_id := (
  SELECT category_id FROM categories WHERE category_name = 'South Indian' LIMIT 1
);
SET @north_indian_category_id := (
  SELECT category_id FROM categories WHERE category_name = 'North Indian' LIMIT 1
);

UPDATE items
SET category_id = @south_indian_category_id
WHERE category_id IN (
  SELECT category_id
  FROM (
    SELECT category_id
    FROM categories
    WHERE category_name IN ('Breakfast', 'Rice & Bath')
  ) legacy_south
);

UPDATE items
SET category_id = @north_indian_category_id
WHERE category_id IN (
  SELECT category_id
  FROM (
    SELECT category_id
    FROM categories
    WHERE category_name IN ('Curries', 'Breads')
  ) legacy_north
);

UPDATE combos
SET category_id = @south_indian_category_id
WHERE category_id IN (
  SELECT category_id
  FROM (
    SELECT category_id
    FROM categories
    WHERE category_name IN ('Breakfast', 'Rice & Bath')
  ) legacy_south
);

UPDATE combos
SET category_id = @north_indian_category_id
WHERE category_id IN (
  SELECT category_id
  FROM (
    SELECT category_id
    FROM categories
    WHERE category_name IN ('Curries', 'Breads')
  ) legacy_north
);

UPDATE menu_items
SET category_id = @south_indian_category_id
WHERE category_id IN (
  SELECT category_id
  FROM (
    SELECT category_id
    FROM categories
    WHERE category_name IN ('Breakfast', 'Rice & Bath')
  ) legacy_south
);

UPDATE menu_items
SET category_id = @north_indian_category_id
WHERE category_id IN (
  SELECT category_id
  FROM (
    SELECT category_id
    FROM categories
    WHERE category_name IN ('Curries', 'Breads')
  ) legacy_north
);

DELETE FROM categories
WHERE category_name IN ('Breakfast', 'Rice & Bath', 'Curries', 'Breads');

COMMIT;
