-- Ensure multi-meal eligibility uses item_bld_map

CREATE TABLE IF NOT EXISTS item_bld_map (
  item_id INT NOT NULL,
  bld_id  INT NOT NULL,
  PRIMARY KEY (item_id, bld_id),
  CONSTRAINT fk_item_bld_item
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
  CONSTRAINT fk_item_bld_bld
    FOREIGN KEY (bld_id) REFERENCES bld(bld_id) ON DELETE CASCADE
);

-- Backfill rows from the legacy single-value column.
INSERT IGNORE INTO item_bld_map (item_id, bld_id)
SELECT i.item_id, i.bld_id
  FROM items i
 WHERE i.bld_id IS NOT NULL;

-- After the application is running against item_bld_map,
-- drop the deprecated columns (no-op if they were already removed).
ALTER TABLE items DROP COLUMN IF EXISTS allowed_blds;
ALTER TABLE items DROP COLUMN IF EXISTS bld_id;
