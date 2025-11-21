-- Remove deprecated item_type column now that BLD assignments drive menu eligibility.
ALTER TABLE items
  DROP COLUMN IF EXISTS item_type;
