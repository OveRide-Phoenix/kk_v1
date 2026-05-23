-- Migration: add delivery_charge column to orders (default 0)

ALTER TABLE `orders`
  ADD COLUMN `delivery_charge` decimal(10,2) NOT NULL DEFAULT '0.00' AFTER `sgst`;
