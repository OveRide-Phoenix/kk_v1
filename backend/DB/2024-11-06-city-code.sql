-- Multi-city support (Phase 1): introduce city_code columns with safe defaults

ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS city_code VARCHAR(3) NOT NULL DEFAULT 'MYS' AFTER city;

UPDATE addresses
   SET city_code = 'MYS'
 WHERE city_code IS NULL
    OR city_code = '';

ALTER TABLE menu
  ADD COLUMN IF NOT EXISTS city_code VARCHAR(3) NOT NULL DEFAULT 'MYS' AFTER period_type;

UPDATE menu
   SET city_code = 'MYS'
 WHERE city_code IS NULL
    OR city_code = '';
