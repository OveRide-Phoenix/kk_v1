ALTER TABLE items
    ADD COLUMN uom_customer VARCHAR(50) NULL AFTER category_id,
    ADD COLUMN unit_packing DECIMAL(10,3) NULL AFTER uom_customer,
    ADD COLUMN uom_packing VARCHAR(50) NULL AFTER unit_packing,
    ADD COLUMN uom_production VARCHAR(50) NULL AFTER hsn_code,
    ADD COLUMN packing_to_production_rate DECIMAL(10,6) NULL DEFAULT 1 AFTER uom_production;

UPDATE items
SET
    uom_customer = COALESCE(NULLIF(uom_customer, ''), uom),
    unit_packing = COALESCE(unit_packing, quantity_portion, weight_factor),
    uom_packing = COALESCE(NULLIF(uom_packing, ''), weight_uom),
    uom_production = COALESCE(NULLIF(uom_production, ''), uom),
    packing_to_production_rate = COALESCE(packing_to_production_rate, factor, 1);

ALTER TABLE items
    MODIFY COLUMN uom_customer VARCHAR(50) NOT NULL,
    DROP COLUMN uom,
    DROP COLUMN weight_factor,
    DROP COLUMN weight_uom,
    DROP COLUMN factor,
    DROP COLUMN quantity_portion;
