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

INSERT IGNORE INTO combo_bld_map (combo_id, bld_id)
SELECT combo_id, 1 FROM combos WHERE combo_name IN ('Tiffin Combo', 'Dosa Coffee Combo');

INSERT IGNORE INTO combo_bld_map (combo_id, bld_id)
SELECT combo_id, 2 FROM combos WHERE combo_name IN ('Chapati Meal Combo', 'Rice Bowl Combo', 'Sweet Lunch Combo');

INSERT IGNORE INTO combo_bld_map (combo_id, bld_id)
SELECT combo_id, 3 FROM combos WHERE combo_name IN ('Chapati Meal Combo');
