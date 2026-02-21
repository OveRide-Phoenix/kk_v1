-- Ensure combos table tracks the legacy item that spawned it
ALTER TABLE combos
    ADD COLUMN IF NOT EXISTS legacy_item_id INT NULL UNIQUE,
    ADD INDEX IF NOT EXISTS idx_combos_legacy_item_id (legacy_item_id);

-- Mapping table to keep track of migrated combos (drop once legacy rows are removed)
CREATE TABLE IF NOT EXISTS legacy_combo_map (
    legacy_item_id INT NOT NULL PRIMARY KEY,
    combo_id INT NOT NULL,
    migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_legacy_combo FOREIGN KEY (combo_id) REFERENCES combos (combo_id) ON DELETE CASCADE
);
