ALTER TABLE orders
  MODIFY COLUMN status VARCHAR(50) DEFAULT 'Confirmed';

UPDATE orders
SET status = CASE
  WHEN status IS NULL OR TRIM(status) = '' THEN 'Confirmed'
  WHEN LOWER(REPLACE(TRIM(status), ' (Payment Due)', '')) IN (
    'pending',
    'payment due',
    'awaiting payment',
    'confirmed - payment due',
    'confirmed but needs to pay',
    'confirmed'
  ) THEN 'Confirmed'
  WHEN LOWER(REPLACE(TRIM(status), ' (Payment Due)', '')) IN (
    'preparing',
    'processing'
  ) THEN 'Confirmed'
  WHEN LOWER(REPLACE(TRIM(status), ' (Payment Due)', '')) IN (
    'in progress',
    'on the way',
    'out for delivery',
    'en route',
    'dispatched'
  ) THEN 'Dispatched'
  WHEN LOWER(REPLACE(TRIM(status), ' (Payment Due)', '')) IN (
    'delivered',
    'completed',
    'complete'
  ) THEN 'Delivered'
  WHEN LOWER(REPLACE(TRIM(status), ' (Payment Due)', '')) IN (
    'cancelled',
    'canceled'
  ) THEN 'Cancelled'
  ELSE status
END;
