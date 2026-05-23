-- Add planned_qty to menu_items so production planning has its own column
-- and never overwrites max_qty (the admin-set ordering threshold).
-- planned_qty = base qty from orders received; final_qty = planned_qty + buffer_qty.

ALTER TABLE `menu_items`
  ADD COLUMN `planned_qty` decimal(10,2) NOT NULL DEFAULT '0.00' AFTER `max_qty`;
