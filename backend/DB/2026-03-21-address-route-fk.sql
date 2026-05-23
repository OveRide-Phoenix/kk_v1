-- Migration: Replace addresses.route_assignment (loose string) with addresses.route_id (FK to delivery_routes)
-- No backfill — existing addresses start with route_id = NULL

ALTER TABLE addresses
  ADD COLUMN route_id INT NULL AFTER address_type,
  ADD CONSTRAINT fk_addresses_route_id
    FOREIGN KEY (route_id) REFERENCES delivery_routes(route_id) ON DELETE SET NULL;

ALTER TABLE addresses DROP COLUMN route_assignment;
