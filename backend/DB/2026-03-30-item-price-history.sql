-- Migration: rework item_price_history to use from_date/to_date
-- effect_date -> from_date (current price period start)
-- add to_date (NULL = currently active row)

ALTER TABLE `item_price_history`
  CHANGE COLUMN `effect_date` `from_date` date NOT NULL,
  ADD COLUMN `to_date` date DEFAULT NULL AFTER `from_date`;
