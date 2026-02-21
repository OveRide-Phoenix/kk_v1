-- Remove deprecated condiment flag now that eligibility is driven by item_bld_map.
ALTER TABLE items
  DROP COLUMN IF EXISTS is_condiment;
