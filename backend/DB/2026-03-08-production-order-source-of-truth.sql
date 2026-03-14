ALTER TABLE orders
  ADD COLUMN order_date DATE NULL AFTER payment_method;

ALTER TABLE order_items
  ADD COLUMN menu_item_id INT NULL AFTER combo_id,
  ADD COLUMN meal_type VARCHAR(50) NULL AFTER menu_item_id;

ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_menu_item
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id)
  ON DELETE SET NULL;

CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);
