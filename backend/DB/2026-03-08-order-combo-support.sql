ALTER TABLE order_items
  MODIFY COLUMN item_id INT NULL;

ALTER TABLE order_items
  ADD COLUMN combo_id INT NULL AFTER item_id,
  ADD KEY idx_order_items_combo_id (combo_id),
  ADD CONSTRAINT order_items_ibfk_combo
    FOREIGN KEY (combo_id) REFERENCES combos (combo_id);
