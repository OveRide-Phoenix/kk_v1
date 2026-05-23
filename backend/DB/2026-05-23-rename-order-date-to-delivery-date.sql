ALTER TABLE `orders`
  CHANGE COLUMN `order_date` `delivery_date` DATE NULL,
  DROP INDEX `idx_orders_order_date`,
  ADD INDEX `idx_orders_delivery_date` (`delivery_date`);
