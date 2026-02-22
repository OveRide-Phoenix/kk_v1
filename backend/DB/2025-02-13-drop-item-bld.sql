-- Remove legacy bld_id column now that item_bld_map manages eligibility.
ALTER TABLE items
  DROP COLUMN IF EXISTS bld_id;
