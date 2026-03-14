INSERT INTO items (
    name,
    description,
    alias,
    category_id,
    uom_customer,
    unit_packing,
    uom_packing,
    item_type,
    hsn_code,
    uom_production,
    packing_to_production_rate,
    buffer_percentage,
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
)
SELECT
    seed.name,
    seed.description,
    seed.alias,
    seed.category_id,
    seed.uom_customer,
    seed.unit_packing,
    seed.uom_packing,
    NULL AS item_type,
    NULL AS hsn_code,
    seed.uom_production,
    seed.packing_to_production_rate,
    NULL AS buffer_percentage,
    NULL AS picture_url,
    NULL AS breakfast_price,
    NULL AS lunch_price,
    NULL AS dinner_price,
    NULL AS condiments_price,
    NULL AS festival_price,
    NULL AS cgst,
    NULL AS sgst,
    NULL AS igst,
    NULL AS net_price
FROM (
    SELECT 'Rice' AS name, 'Base plated component for Rice & Sambar' AS description, 'Lunch Rice' AS alias, 1 AS category_id, 'packet' AS uom_customer, 500.000 AS unit_packing, 'g' AS uom_packing, 'kg' AS uom_production, 0.001000 AS packing_to_production_rate
    UNION ALL
    SELECT 'Sambar', 'Base plated component for Rice & Sambar', 'Lunch Sambar', 1, 'packet', 250.000, 'g', 'kg', 0.001000
    UNION ALL
    SELECT 'Chole', 'Base plated component for Chole Bhature', 'Bhature Chole', 2, 'packet', 250.000, 'g', 'kg', 0.001000
    UNION ALL
    SELECT 'Bhature', 'Base plated component for Chole Bhature', 'Single Bhature', 2, 'piece', 1.000, 'pcs', 'piece', 1.000000
    UNION ALL
    SELECT 'Chapati', 'Base plated component for chapati-based plated products', 'Single Chapati', 2, 'piece', 1.000, 'pcs', 'piece', 1.000000
) AS seed
LEFT JOIN items existing ON existing.name = seed.name
WHERE existing.item_id IS NULL;

INSERT INTO item_bld_map (item_id, bld_id)
SELECT i.item_id, 2
FROM items i
LEFT JOIN item_bld_map ibm
    ON ibm.item_id = i.item_id
   AND ibm.bld_id = 2
WHERE i.name IN ('Rice', 'Sambar', 'Chole', 'Bhature', 'Chapati')
  AND ibm.item_id IS NULL;

INSERT INTO plated_items (item_id)
SELECT parent.item_id
FROM items parent
LEFT JOIN plated_items pi ON pi.item_id = parent.item_id
WHERE parent.name IN ('Rice & Sambar', 'Chole Bhature')
  AND pi.item_id IS NULL;

INSERT INTO plated_item_components (plated_item_id, component_item_id, quantity, sort_order)
SELECT
    pi.plated_item_id,
    component.item_id,
    mapping.quantity,
    mapping.sort_order
FROM plated_items pi
JOIN items parent ON parent.item_id = pi.item_id
JOIN (
    SELECT 'Rice & Sambar' AS parent_name, 'Rice' AS component_name, 1.000 AS quantity, 1 AS sort_order
    UNION ALL
    SELECT 'Rice & Sambar', 'Sambar', 1.000, 2
    UNION ALL
    SELECT 'Chole Bhature', 'Chole', 1.000, 1
    UNION ALL
    SELECT 'Chole Bhature', 'Bhature', 2.000, 2
) AS mapping
    ON mapping.parent_name = parent.name
JOIN items component
    ON component.name = mapping.component_name
LEFT JOIN plated_item_components existing
    ON existing.plated_item_id = pi.plated_item_id
   AND existing.component_item_id = component.item_id
WHERE existing.id IS NULL;
