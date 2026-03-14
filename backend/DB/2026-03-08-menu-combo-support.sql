ALTER TABLE menu_items
  MODIFY COLUMN item_id INT NULL;

ALTER TABLE menu_items
  ADD COLUMN combo_id INT NULL AFTER item_id,
  ADD KEY idx_menu_items_combo_id (combo_id),
  ADD CONSTRAINT menu_items_ibfk_combo
    FOREIGN KEY (combo_id) REFERENCES combos (combo_id);
