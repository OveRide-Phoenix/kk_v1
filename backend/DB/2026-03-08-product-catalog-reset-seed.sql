START TRANSACTION;

CREATE TABLE IF NOT EXISTS combo_bld_map (
  combo_id INT NOT NULL,
  bld_id INT NOT NULL,
  PRIMARY KEY (combo_id, bld_id),
  KEY idx_combo_bld_map_bld_id (bld_id),
  CONSTRAINT fk_combo_bld_map_combo
    FOREIGN KEY (combo_id) REFERENCES combos (combo_id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_bld_map_bld
    FOREIGN KEY (bld_id) REFERENCES bld (bld_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Reset dependent transactional/menu data that references catalog items.
DELETE FROM menu_items;
DELETE FROM menu;
DELETE FROM item_add_ons;
DELETE FROM combo_bld_map;
DELETE FROM combo_items;
DELETE FROM combos;
DELETE FROM plated_item_components;
DELETE FROM plated_items;
DELETE FROM item_bld_map;
DELETE FROM item_price_history;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM items;
DELETE FROM component_types;
DELETE FROM categories;

ALTER TABLE menu_items AUTO_INCREMENT = 1;
ALTER TABLE menu AUTO_INCREMENT = 1;
ALTER TABLE item_add_ons AUTO_INCREMENT = 1;
ALTER TABLE combo_items AUTO_INCREMENT = 1;
ALTER TABLE combos AUTO_INCREMENT = 1;
ALTER TABLE plated_item_components AUTO_INCREMENT = 1;
ALTER TABLE plated_items AUTO_INCREMENT = 1;
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE items AUTO_INCREMENT = 1;
ALTER TABLE component_types AUTO_INCREMENT = 1;
ALTER TABLE categories AUTO_INCREMENT = 1;

-- Categories used in product management.
INSERT INTO categories (category_name) VALUES
  ('South Indian'),
  ('North Indian'),
  ('Beverages'),
  ('Condiments'),
  ('Sweets');

-- Generic operational slots for plated/combo products.
INSERT INTO component_types (name, description, is_active) VALUES
  ('Curry', 'Generic curry slot resolved to the item of the day', 1),
  ('Rice', 'Generic rice slot resolved to the item of the day', 1),
  ('Sambar', 'Generic sambar slot resolved to the item of the day', 1),
  ('Chutney', 'Generic chutney slot resolved to the item of the day', 1),
  ('Dal', 'Generic dal slot resolved to the item of the day', 1),
  ('Raita', 'Generic raita slot resolved to the item of the day', 1),
  ('Sweet', 'Generic sweet slot resolved to the item of the day', 1),
  ('Beverage', 'Generic beverage slot resolved to the item of the day', 1);

-- Atomic sellable/packable items.
INSERT INTO items (
  name,
  description,
  alias,
  category_id,
  component_type_id,
  uom_customer,
  unit_packing,
  uom_packing,
  hsn_code,
  uom_production,
  packing_to_production_rate,
  buffer_percentage,
  max_qty_breakfast,
  max_qty_lunch,
  max_qty_dinner,
  max_qty_condiments,
  picture_url,
  breakfast_price,
  lunch_price,
  dinner_price,
  condiments_price,
  festival_price,
  cgst,
  sgst,
  igst,
  net_price
) VALUES
  (
    'Idly',
    'Soft steamed rice cakes served as a standard 2-piece portion.',
    'idly',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'plate',
    2,
    'pieces',
    NULL,
    'pieces',
    1,
    8,
    180,
    NULL,
    NULL,
    NULL,
    NULL,
    32.00,
    NULL,
    NULL,
    NULL,
    35.00,
    2.50,
    2.50,
    5.00,
    32.00
  ),
  (
    'Single Idly',
    'Single idly unit used for plated combinations and special orders.',
    'single-idly',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'piece',
    1,
    'pieces',
    NULL,
    'pieces',
    1,
    8,
    100,
    NULL,
    NULL,
    NULL,
    NULL,
    18.00,
    NULL,
    NULL,
    NULL,
    20.00,
    2.50,
    2.50,
    5.00,
    18.00
  ),
  (
    'Vada',
    'Crisp medu vada sold as a single piece.',
    'vada',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'piece',
    1,
    'pieces',
    NULL,
    'pieces',
    1,
    8,
    120,
    NULL,
    NULL,
    NULL,
    NULL,
    20.00,
    NULL,
    NULL,
    NULL,
    22.00,
    2.50,
    2.50,
    5.00,
    20.00
  ),
  (
    'Plain Dosa',
    'Classic plain dosa sold per piece.',
    'plain-dosa',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'piece',
    1,
    'pieces',
    NULL,
    'pieces',
    1,
    10,
    140,
    NULL,
    NULL,
    NULL,
    NULL,
    38.00,
    NULL,
    NULL,
    NULL,
    42.00,
    2.50,
    2.50,
    5.00,
    38.00
  ),
  (
    'Masala Dosa',
    'Masala dosa sold per piece.',
    'masala-dosa',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'piece',
    1,
    'pieces',
    NULL,
    'pieces',
    1,
    10,
    140,
    NULL,
    NULL,
    NULL,
    NULL,
    52.00,
    NULL,
    NULL,
    NULL,
    58.00,
    2.50,
    2.50,
    5.00,
    52.00
  ),
  (
    'Poori',
    'Standard poori plate packed as 3 pieces.',
    'poori',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'plate',
    3,
    'pieces',
    NULL,
    'pieces',
    1,
    10,
    100,
    NULL,
    NULL,
    NULL,
    NULL,
    42.00,
    NULL,
    NULL,
    NULL,
    46.00,
    2.50,
    2.50,
    5.00,
    42.00
  ),
  (
    'Upma',
    'Breakfast upma packed as a 300 g bowl.',
    'upma',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'bowl',
    300,
    'g',
    NULL,
    'kg',
    0.001,
    8,
    80,
    NULL,
    NULL,
    NULL,
    NULL,
    38.00,
    NULL,
    NULL,
    NULL,
    42.00,
    2.50,
    2.50,
    5.00,
    38.00
  ),
  (
    'Pongal',
    'Ven pongal packed as a 300 g bowl.',
    'pongal',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'bowl',
    300,
    'g',
    NULL,
    'kg',
    0.001,
    8,
    80,
    NULL,
    NULL,
    NULL,
    NULL,
    42.00,
    NULL,
    NULL,
    NULL,
    46.00,
    2.50,
    2.50,
    5.00,
    42.00
  ),
  (
    'Kesari Bath',
    'Sweet kesari packed as a 150 g cup.',
    'kesari-bath',
    (SELECT category_id FROM categories WHERE category_name = 'Sweets'),
    (SELECT component_type_id FROM component_types WHERE name = 'Sweet'),
    'cup',
    150,
    'g',
    NULL,
    'kg',
    0.001,
    6,
    60,
    NULL,
    NULL,
    NULL,
    NULL,
    28.00,
    NULL,
    NULL,
    NULL,
    32.00,
    2.50,
    2.50,
    5.00,
    28.00
  ),
  (
    'Steamed Rice',
    'Main rice portion packed as 500 g.',
    'steamed-rice',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Rice'),
    'packet',
    500,
    'g',
    NULL,
    'kg',
    0.001,
    10,
    NULL,
    160,
    140,
    NULL,
    NULL,
    NULL,
    45.00,
    45.00,
    NULL,
    48.00,
    2.50,
    2.50,
    5.00,
    45.00
  ),
  (
    'Jeera Rice',
    'Flavoured rice packed as a 350 g portion.',
    'jeera-rice',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Rice'),
    'plate',
    350,
    'g',
    NULL,
    'kg',
    0.001,
    10,
    NULL,
    90,
    90,
    NULL,
    NULL,
    NULL,
    60.00,
    60.00,
    NULL,
    65.00,
    2.50,
    2.50,
    5.00,
    60.00
  ),
  (
    'Lemon Rice',
    'Tangy lemon rice packed as a 350 g plate.',
    'lemon-rice',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Rice'),
    'plate',
    350,
    'g',
    NULL,
    'kg',
    0.001,
    8,
    NULL,
    70,
    NULL,
    NULL,
    NULL,
    NULL,
    48.00,
    NULL,
    NULL,
    52.00,
    2.50,
    2.50,
    5.00,
    48.00
  ),
  (
    'Curd Rice',
    'Curd rice packed as a 350 g plate.',
    'curd-rice',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'plate',
    350,
    'g',
    NULL,
    'kg',
    0.001,
    8,
    NULL,
    70,
    70,
    NULL,
    NULL,
    NULL,
    50.00,
    50.00,
    NULL,
    54.00,
    2.50,
    2.50,
    5.00,
    50.00
  ),
  (
    'Vegetable Sambar',
    'Sambar packed as a 250 g service packet.',
    'vegetable-sambar',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Sambar'),
    'packet',
    250,
    'g',
    NULL,
    'kg',
    0.001,
    6,
    NULL,
    140,
    120,
    NULL,
    NULL,
    NULL,
    30.00,
    30.00,
    NULL,
    34.00,
    2.50,
    2.50,
    5.00,
    30.00
  ),
  (
    'Dal Tadka',
    'Yellow dal packed as a 250 g packet.',
    'dal-tadka',
    (SELECT category_id FROM categories WHERE category_name = 'North Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Dal'),
    'packet',
    250,
    'g',
    NULL,
    'kg',
    0.001,
    8,
    NULL,
    80,
    80,
    NULL,
    NULL,
    NULL,
    48.00,
    48.00,
    NULL,
    52.00,
    2.50,
    2.50,
    5.00,
    48.00
  ),
  (
    'Mix Veg Curry',
    'Mixed vegetable curry packed as a 250 g packet.',
    'mix-veg-curry',
    (SELECT category_id FROM categories WHERE category_name = 'North Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Curry'),
    'packet',
    250,
    'g',
    NULL,
    'kg',
    0.001,
    10,
    NULL,
    90,
    90,
    NULL,
    NULL,
    NULL,
    58.00,
    58.00,
    NULL,
    62.00,
    2.50,
    2.50,
    5.00,
    58.00
  ),
  (
    'Paneer Butter Masala',
    'Paneer butter masala packed as a 250 g packet.',
    'paneer-butter-masala',
    (SELECT category_id FROM categories WHERE category_name = 'North Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Curry'),
    'packet',
    250,
    'g',
    NULL,
    'kg',
    0.001,
    10,
    NULL,
    80,
    80,
    NULL,
    NULL,
    NULL,
    78.00,
    78.00,
    NULL,
    84.00,
    2.50,
    2.50,
    5.00,
    78.00
  ),
  (
    'Kadai Vegetable Curry',
    'Semi-dry kadai vegetable curry packed as a 250 g packet.',
    'kadai-vegetable-curry',
    (SELECT category_id FROM categories WHERE category_name = 'North Indian'),
    (SELECT component_type_id FROM component_types WHERE name = 'Curry'),
    'packet',
    250,
    'g',
    NULL,
    'kg',
    0.001,
    10,
    NULL,
    70,
    70,
    NULL,
    NULL,
    NULL,
    68.00,
    68.00,
    NULL,
    72.00,
    2.50,
    2.50,
    5.00,
    68.00
  ),
  (
    'Chapati',
    'Single chapati unit used in meal assembly.',
    'chapati',
    (SELECT category_id FROM categories WHERE category_name = 'North Indian'),
    NULL,
    'piece',
    1,
    'pieces',
    NULL,
    'pieces',
    1,
    10,
    NULL,
    200,
    200,
    NULL,
    NULL,
    NULL,
    12.00,
    12.00,
    NULL,
    14.00,
    2.50,
    2.50,
    5.00,
    12.00
  ),
  (
    'Bhature',
    'Single bhature unit.',
    'bhature',
    (SELECT category_id FROM categories WHERE category_name = 'North Indian'),
    NULL,
    'piece',
    1,
    'pieces',
    NULL,
    'pieces',
    1,
    10,
    NULL,
    80,
    80,
    NULL,
    NULL,
    NULL,
    18.00,
    18.00,
    NULL,
    20.00,
    2.50,
    2.50,
    5.00,
    18.00
  ),
  (
    'Filter Coffee',
    'Fresh filter coffee served as a 200 ml cup.',
    'filter-coffee',
    (SELECT category_id FROM categories WHERE category_name = 'Beverages'),
    (SELECT component_type_id FROM component_types WHERE name = 'Beverage'),
    'cup',
    200,
    'ml',
    NULL,
    'liter',
    0.001,
    5,
    120,
    NULL,
    NULL,
    NULL,
    NULL,
    25.00,
    NULL,
    NULL,
    NULL,
    28.00,
    2.50,
    2.50,
    5.00,
    25.00
  ),
  (
    'Buttermilk',
    'Spiced buttermilk packed as a 200 ml bottle.',
    'buttermilk',
    (SELECT category_id FROM categories WHERE category_name = 'Beverages'),
    (SELECT component_type_id FROM component_types WHERE name = 'Beverage'),
    'bottle',
    200,
    'ml',
    NULL,
    'liter',
    0.001,
    5,
    NULL,
    80,
    80,
    NULL,
    NULL,
    NULL,
    22.00,
    22.00,
    NULL,
    24.00,
    2.50,
    2.50,
    5.00,
    22.00
  ),
  (
    'Gulab Jamun',
    'Sweet cup packed as 2 pieces.',
    'gulab-jamun',
    (SELECT category_id FROM categories WHERE category_name = 'Sweets'),
    (SELECT component_type_id FROM component_types WHERE name = 'Sweet'),
    'cup',
    2,
    'pieces',
    NULL,
    'pieces',
    1,
    5,
    NULL,
    60,
    60,
    NULL,
    NULL,
    NULL,
    35.00,
    35.00,
    NULL,
    38.00,
    2.50,
    2.50,
    5.00,
    35.00
  ),
  (
    'Coconut Chutney',
    'Breakfast chutney packed as an 80 g packet.',
    'coconut-chutney',
    (SELECT category_id FROM categories WHERE category_name = 'Condiments'),
    (SELECT component_type_id FROM component_types WHERE name = 'Chutney'),
    'packet',
    80,
    'g',
    NULL,
    'kg',
    0.001,
    5,
    NULL,
    NULL,
    NULL,
    200,
    NULL,
    NULL,
    NULL,
    NULL,
    12.00,
    14.00,
    2.50,
    2.50,
    5.00,
    12.00
  ),
  (
    'Tomato Chutney',
    'Tomato chutney packed as an 80 g packet.',
    'tomato-chutney',
    (SELECT category_id FROM categories WHERE category_name = 'Condiments'),
    (SELECT component_type_id FROM component_types WHERE name = 'Chutney'),
    'packet',
    80,
    'g',
    NULL,
    'kg',
    0.001,
    5,
    NULL,
    NULL,
    NULL,
    180,
    NULL,
    NULL,
    NULL,
    NULL,
    12.00,
    14.00,
    2.50,
    2.50,
    5.00,
    12.00
  ),
  (
    'Pickle',
    'Homestyle pickle packed as a 25 g sachet.',
    'pickle',
    (SELECT category_id FROM categories WHERE category_name = 'Condiments'),
    NULL,
    'sachet',
    25,
    'g',
    NULL,
    'kg',
    0.001,
    5,
    NULL,
    NULL,
    NULL,
    200,
    NULL,
    NULL,
    NULL,
    NULL,
    8.00,
    10.00,
    2.50,
    2.50,
    5.00,
    8.00
  ),
  (
    'Ghee',
    'Pure ghee packed as a 20 g cup.',
    'ghee',
    (SELECT category_id FROM categories WHERE category_name = 'Condiments'),
    NULL,
    'cup',
    20,
    'g',
    NULL,
    'kg',
    0.001,
    5,
    NULL,
    NULL,
    NULL,
    150,
    NULL,
    NULL,
    NULL,
    NULL,
    10.00,
    12.00,
    2.50,
    2.50,
    5.00,
    10.00
  ),
  (
    'Veg Raita',
    'Cooling vegetable raita packed as a 200 g packet.',
    'veg-raita',
    (SELECT category_id FROM categories WHERE category_name = 'Condiments'),
    (SELECT component_type_id FROM component_types WHERE name = 'Raita'),
    'packet',
    200,
    'g',
    NULL,
    'kg',
    0.001,
    5,
    NULL,
    NULL,
    NULL,
    120,
    NULL,
    NULL,
    NULL,
    NULL,
    22.00,
    24.00,
    2.50,
    2.50,
    5.00,
    22.00
  ),
  (
    'Curd',
    'Plain curd packed as a 200 g cup.',
    'curd',
    (SELECT category_id FROM categories WHERE category_name = 'Condiments'),
    NULL,
    'cup',
    200,
    'g',
    NULL,
    'kg',
    0.001,
    5,
    NULL,
    NULL,
    NULL,
    140,
    NULL,
    NULL,
    NULL,
    NULL,
    18.00,
    20.00,
    2.50,
    2.50,
    5.00,
    18.00
  );

-- Meal assignment map.
INSERT INTO item_bld_map (item_id, bld_id)
SELECT item_id, 1 FROM items WHERE name IN (
  'Idly',
  'Single Idly',
  'Vada',
  'Plain Dosa',
  'Masala Dosa',
  'Poori',
  'Upma',
  'Pongal',
  'Kesari Bath',
  'Filter Coffee'
);

INSERT INTO item_bld_map (item_id, bld_id)
SELECT item_id, 2 FROM items WHERE name IN (
  'Steamed Rice',
  'Jeera Rice',
  'Lemon Rice',
  'Curd Rice',
  'Vegetable Sambar',
  'Dal Tadka',
  'Mix Veg Curry',
  'Paneer Butter Masala',
  'Kadai Vegetable Curry',
  'Chapati',
  'Bhature',
  'Buttermilk',
  'Gulab Jamun'
);

INSERT INTO item_bld_map (item_id, bld_id)
SELECT item_id, 3 FROM items WHERE name IN (
  'Steamed Rice',
  'Jeera Rice',
  'Curd Rice',
  'Vegetable Sambar',
  'Dal Tadka',
  'Mix Veg Curry',
  'Paneer Butter Masala',
  'Kadai Vegetable Curry',
  'Chapati',
  'Bhature',
  'Buttermilk',
  'Gulab Jamun'
);

INSERT INTO item_bld_map (item_id, bld_id)
SELECT item_id, 4 FROM items WHERE name IN (
  'Coconut Chutney',
  'Tomato Chutney',
  'Pickle',
  'Ghee',
  'Veg Raita',
  'Curd'
);

-- Plated products are sellable composite items backed by their own item rows.
INSERT INTO items (
  name,
  description,
  alias,
  category_id,
  component_type_id,
  uom_customer,
  unit_packing,
  uom_packing,
  hsn_code,
  uom_production,
  packing_to_production_rate,
  buffer_percentage,
  max_qty_breakfast,
  max_qty_lunch,
  max_qty_dinner,
  max_qty_condiments,
  picture_url,
  breakfast_price,
  lunch_price,
  dinner_price,
  condiments_price,
  festival_price,
  cgst,
  sgst,
  igst,
  net_price
) VALUES
  (
    'Idly Vada',
    'One plate of idly with one vada.',
    'idly-vada',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'plate',
    1,
    'plate',
    NULL,
    'plate',
    1,
    8,
    100,
    NULL,
    NULL,
    NULL,
    NULL,
    48.00,
    NULL,
    NULL,
    NULL,
    52.00,
    2.50,
    2.50,
    5.00,
    48.00
  ),
  (
    'Single Idly Vada',
    'Single idly with one vada.',
    'single-idly-vada',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'plate',
    1,
    'plate',
    NULL,
    'plate',
    1,
    8,
    60,
    NULL,
    NULL,
    NULL,
    NULL,
    34.00,
    NULL,
    NULL,
    NULL,
    38.00,
    2.50,
    2.50,
    5.00,
    34.00
  ),
  (
    'Rice & Sambar',
    'Steamed rice served with one packet of sambar.',
    'rice-sambar',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'plate',
    1,
    'plate',
    NULL,
    'plate',
    1,
    8,
    NULL,
    120,
    120,
    NULL,
    NULL,
    NULL,
    72.00,
    72.00,
    NULL,
    78.00,
    2.50,
    2.50,
    5.00,
    72.00
  ),
  (
    'Chapati & Curry',
    'Two chapatis served with the curry of the day.',
    'chapati-curry',
    (SELECT category_id FROM categories WHERE category_name = 'North Indian'),
    NULL,
    'plate',
    1,
    'plate',
    NULL,
    'plate',
    1,
    8,
    NULL,
    120,
    120,
    NULL,
    NULL,
    NULL,
    76.00,
    76.00,
    NULL,
    82.00,
    2.50,
    2.50,
    5.00,
    76.00
  ),
  (
    'Poori Saagu',
    'Poori plate served with the curry of the day.',
    'poori-saagu',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'plate',
    1,
    'plate',
    NULL,
    'plate',
    1,
    8,
    80,
    NULL,
    NULL,
    NULL,
    NULL,
    58.00,
    NULL,
    NULL,
    NULL,
    64.00,
    2.50,
    2.50,
    5.00,
    58.00
  ),
  (
    'Mini Meals',
    'A compact veg meal with rice, curry, sambar, raita, and sweet.',
    'mini-meals',
    (SELECT category_id FROM categories WHERE category_name = 'South Indian'),
    NULL,
    'meal',
    1,
    'meal',
    NULL,
    'meal',
    1,
    8,
    NULL,
    80,
    NULL,
    NULL,
    NULL,
    NULL,
    118.00,
    NULL,
    NULL,
    128.00,
    2.50,
    2.50,
    5.00,
    118.00
  );

INSERT INTO item_bld_map (item_id, bld_id)
SELECT item_id, 1 FROM items WHERE name IN ('Idly Vada', 'Single Idly Vada', 'Poori Saagu');

INSERT INTO item_bld_map (item_id, bld_id)
SELECT item_id, 2 FROM items WHERE name IN ('Rice & Sambar', 'Chapati & Curry', 'Mini Meals');

INSERT INTO item_bld_map (item_id, bld_id)
SELECT item_id, 3 FROM items WHERE name IN ('Rice & Sambar', 'Chapati & Curry');

INSERT INTO plated_items (item_id)
SELECT item_id FROM items WHERE name IN (
  'Idly Vada',
  'Single Idly Vada',
  'Rice & Sambar',
  'Chapati & Curry',
  'Poori Saagu',
  'Mini Meals'
);

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 1
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Idly'
WHERE parent.name = 'Idly Vada';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 2
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Vada'
WHERE parent.name = 'Idly Vada';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 1
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Single Idly'
WHERE parent.name = 'Single Idly Vada';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 2
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Vada'
WHERE parent.name = 'Single Idly Vada';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 1
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Steamed Rice'
WHERE parent.name = 'Rice & Sambar';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 2
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Vegetable Sambar'
WHERE parent.name = 'Rice & Sambar';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 2, 1
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Chapati'
WHERE parent.name = 'Chapati & Curry';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, NULL, ct.component_type_id, 1, 2
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN component_types ct ON ct.name = 'Curry'
WHERE parent.name = 'Chapati & Curry';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 1
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Poori'
WHERE parent.name = 'Poori Saagu';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, NULL, ct.component_type_id, 1, 2
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN component_types ct ON ct.name = 'Curry'
WHERE parent.name = 'Poori Saagu';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 1
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Steamed Rice'
WHERE parent.name = 'Mini Meals';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, NULL, ct.component_type_id, 1, 2
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN component_types ct ON ct.name = 'Sambar'
WHERE parent.name = 'Mini Meals';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, NULL, ct.component_type_id, 1, 3
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN component_types ct ON ct.name = 'Curry'
WHERE parent.name = 'Mini Meals';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 4
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Veg Raita'
WHERE parent.name = 'Mini Meals';

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT p.plated_item_id, i.item_id, NULL, 1, 5
FROM plated_items p
JOIN items parent ON parent.item_id = p.item_id
JOIN items i ON i.name = 'Gulab Jamun'
WHERE parent.name = 'Mini Meals';

-- Combos.
INSERT INTO combos (combo_name, price, category_id) VALUES
  ('Tiffin Combo', 85.00, (SELECT category_id FROM categories WHERE category_name = 'South Indian')),
  ('Dosa Coffee Combo', 110.00, (SELECT category_id FROM categories WHERE category_name = 'South Indian')),
  ('Chapati Meal Combo', 140.00, (SELECT category_id FROM categories WHERE category_name = 'North Indian')),
  ('Rice Bowl Combo', 145.00, (SELECT category_id FROM categories WHERE category_name = 'South Indian')),
  ('Sweet Lunch Combo', 160.00, (SELECT category_id FROM categories WHERE category_name = 'South Indian'));

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Idly'
WHERE c.combo_name = 'Tiffin Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Vada'
WHERE c.combo_name = 'Tiffin Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Filter Coffee'
WHERE c.combo_name = 'Tiffin Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Masala Dosa'
WHERE c.combo_name = 'Dosa Coffee Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Filter Coffee'
WHERE c.combo_name = 'Dosa Coffee Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 3
FROM combos c JOIN items i ON i.name = 'Chapati'
WHERE c.combo_name = 'Chapati Meal Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, NULL, ct.component_type_id, 1
FROM combos c JOIN component_types ct ON ct.name = 'Curry'
WHERE c.combo_name = 'Chapati Meal Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Buttermilk'
WHERE c.combo_name = 'Chapati Meal Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Steamed Rice'
WHERE c.combo_name = 'Rice Bowl Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Dal Tadka'
WHERE c.combo_name = 'Rice Bowl Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Veg Raita'
WHERE c.combo_name = 'Rice Bowl Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Jeera Rice'
WHERE c.combo_name = 'Sweet Lunch Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Paneer Butter Masala'
WHERE c.combo_name = 'Sweet Lunch Combo';

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT c.combo_id, i.item_id, NULL, 1
FROM combos c JOIN items i ON i.name = 'Gulab Jamun'
WHERE c.combo_name = 'Sweet Lunch Combo';

INSERT INTO combo_bld_map (combo_id, bld_id)
SELECT combo_id, 1 FROM combos WHERE combo_name IN ('Tiffin Combo', 'Dosa Coffee Combo');

INSERT INTO combo_bld_map (combo_id, bld_id)
SELECT combo_id, 2 FROM combos WHERE combo_name IN ('Chapati Meal Combo', 'Rice Bowl Combo', 'Sweet Lunch Combo');

INSERT INTO combo_bld_map (combo_id, bld_id)
SELECT combo_id, 3 FROM combos WHERE combo_name IN ('Chapati Meal Combo');

-- Add-ons are simple item-to-item mappings.
INSERT INTO item_add_ons (main_item_id, add_on_item_id, is_mandatory, max_quantity)
SELECT main.item_id, addon.item_id, 0, 2
FROM items main
JOIN items addon ON addon.name = 'Coconut Chutney'
WHERE main.name = 'Masala Dosa';

INSERT INTO item_add_ons (main_item_id, add_on_item_id, is_mandatory, max_quantity)
SELECT main.item_id, addon.item_id, 0, 2
FROM items main
JOIN items addon ON addon.name = 'Tomato Chutney'
WHERE main.name = 'Plain Dosa';

INSERT INTO item_add_ons (main_item_id, add_on_item_id, is_mandatory, max_quantity)
SELECT main.item_id, addon.item_id, 0, 1
FROM items main
JOIN items addon ON addon.name = 'Ghee'
WHERE main.name = 'Idly Vada';

INSERT INTO item_add_ons (main_item_id, add_on_item_id, is_mandatory, max_quantity)
SELECT main.item_id, addon.item_id, 0, 1
FROM items main
JOIN items addon ON addon.name = 'Veg Raita'
WHERE main.name = 'Rice & Sambar';

INSERT INTO item_add_ons (main_item_id, add_on_item_id, is_mandatory, max_quantity)
SELECT main.item_id, addon.item_id, 0, 1
FROM items main
JOIN items addon ON addon.name = 'Buttermilk'
WHERE main.name = 'Chapati & Curry';

INSERT INTO item_add_ons (main_item_id, add_on_item_id, is_mandatory, max_quantity)
SELECT main.item_id, addon.item_id, 0, 2
FROM items main
JOIN items addon ON addon.name = 'Gulab Jamun'
WHERE main.name = 'Mini Meals';

INSERT INTO component_types (name, description, is_active)
SELECT 'Idly', 'Items that fulfill an idly slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Idly');

INSERT INTO component_types (name, description, is_active)
SELECT 'Vada', 'Items that fulfill a vada slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Vada');

INSERT INTO component_types (name, description, is_active)
SELECT 'Dosa', 'Items that fulfill a dosa slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Dosa');

INSERT INTO component_types (name, description, is_active)
SELECT 'Poori', 'Items that fulfill a poori slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Poori');

INSERT INTO component_types (name, description, is_active)
SELECT 'Upma', 'Items that fulfill an upma slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Upma');

INSERT INTO component_types (name, description, is_active)
SELECT 'Pongal', 'Items that fulfill a pongal slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Pongal');

INSERT INTO component_types (name, description, is_active)
SELECT 'Curd Rice', 'Items that fulfill a curd rice slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Curd Rice');

INSERT INTO component_types (name, description, is_active)
SELECT 'Chapati', 'Items that fulfill a chapati slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Chapati');

INSERT INTO component_types (name, description, is_active)
SELECT 'Bhature', 'Items that fulfill a bhature slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Bhature');

INSERT INTO component_types (name, description, is_active)
SELECT 'Pickle', 'Items that fulfill a pickle slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Pickle');

INSERT INTO component_types (name, description, is_active)
SELECT 'Ghee', 'Items that fulfill a ghee slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Ghee');

INSERT INTO component_types (name, description, is_active)
SELECT 'Curd', 'Items that fulfill a curd slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Curd');

INSERT INTO component_types (name, description, is_active)
SELECT 'Idly Vada', 'Items that fulfill an idly vada slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Idly Vada');

INSERT INTO component_types (name, description, is_active)
SELECT 'Rice Meal', 'Items that fulfill a rice meal slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Rice Meal');

INSERT INTO component_types (name, description, is_active)
SELECT 'Chapati Meal', 'Items that fulfill a chapati meal slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Chapati Meal');

INSERT INTO component_types (name, description, is_active)
SELECT 'Poori Saagu', 'Items that fulfill a poori saagu slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Poori Saagu');

INSERT INTO component_types (name, description, is_active)
SELECT 'Mini Meals', 'Items that fulfill a mini meals slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Mini Meals');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Idly' LIMIT 1)
WHERE name IN ('Idly', 'Single Idly');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Vada' LIMIT 1)
WHERE name = 'Vada';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Dosa' LIMIT 1)
WHERE name IN ('Plain Dosa', 'Masala Dosa');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Poori' LIMIT 1)
WHERE name = 'Poori';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Upma' LIMIT 1)
WHERE name = 'Upma';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Pongal' LIMIT 1)
WHERE name = 'Pongal';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Curd Rice' LIMIT 1)
WHERE name = 'Curd Rice';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Chapati' LIMIT 1)
WHERE name = 'Chapati';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Bhature' LIMIT 1)
WHERE name = 'Bhature';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Pickle' LIMIT 1)
WHERE name = 'Pickle';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Ghee' LIMIT 1)
WHERE name = 'Ghee';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Curd' LIMIT 1)
WHERE name = 'Curd';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Idly Vada' LIMIT 1)
WHERE name IN ('Idly Vada', 'Single Idly Vada');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Rice Meal' LIMIT 1)
WHERE name = 'Rice & Sambar';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Chapati Meal' LIMIT 1)
WHERE name = 'Chapati & Curry';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Poori Saagu' LIMIT 1)
WHERE name = 'Poori Saagu';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Mini Meals' LIMIT 1)
WHERE name = 'Mini Meals';

COMMIT;
