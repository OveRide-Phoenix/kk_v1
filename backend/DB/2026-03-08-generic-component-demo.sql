INSERT INTO plated_items (item_id)
SELECT parent.item_id
FROM items parent
LEFT JOIN plated_items pi ON pi.item_id = parent.item_id
WHERE parent.name = 'Chapati & Curry'
  AND pi.item_id IS NULL;

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT
    pi.plated_item_id,
    chapati.item_id,
    NULL,
    2.000,
    1
FROM plated_items pi
JOIN items parent ON parent.item_id = pi.item_id
JOIN items chapati ON chapati.name = 'Chapati'
LEFT JOIN plated_item_components existing
    ON existing.plated_item_id = pi.plated_item_id
   AND existing.component_item_id = chapati.item_id
WHERE parent.name = 'Chapati & Curry'
  AND existing.id IS NULL;

INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity, sort_order)
SELECT
    pi.plated_item_id,
    NULL,
    ct.component_type_id,
    1.000,
    2
FROM plated_items pi
JOIN items parent ON parent.item_id = pi.item_id
JOIN component_types ct ON ct.name = 'Curry'
LEFT JOIN plated_item_components existing
    ON existing.plated_item_id = pi.plated_item_id
   AND existing.component_type_id = ct.component_type_id
WHERE parent.name = 'Chapati & Curry'
  AND existing.id IS NULL;

INSERT INTO combos (combo_name, price, category_id)
SELECT 'Chapati Curry Demo Combo', 99.00, 2
FROM dual
WHERE NOT EXISTS (
    SELECT 1 FROM combos WHERE combo_name = 'Chapati Curry Demo Combo'
);

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT
    c.combo_id,
    chapati.item_id,
    NULL,
    2
FROM combos c
JOIN items chapati ON chapati.name = 'Chapati'
LEFT JOIN combo_items existing
    ON existing.combo_id = c.combo_id
   AND existing.item_id = chapati.item_id
WHERE c.combo_name = 'Chapati Curry Demo Combo'
  AND existing.id IS NULL;

INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity)
SELECT
    c.combo_id,
    NULL,
    ct.component_type_id,
    1
FROM combos c
JOIN component_types ct ON ct.name = 'Curry'
LEFT JOIN combo_items existing
    ON existing.combo_id = c.combo_id
   AND existing.component_type_id = ct.component_type_id
WHERE c.combo_name = 'Chapati Curry Demo Combo'
  AND existing.id IS NULL;
