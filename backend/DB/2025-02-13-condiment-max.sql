-- Ensure condiment items have their own capacity column.
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS max_qty_condiments INT NULL AFTER max_qty_dinner;

-- Backfill using dinner caps so existing condiments retain their previous limits.
UPDATE items
   SET max_qty_condiments = max_qty_dinner
 WHERE max_qty_condiments IS NULL;
