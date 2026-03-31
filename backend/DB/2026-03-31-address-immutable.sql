-- Make addresses immutable: add is_active flag so old addresses are preserved
-- when a customer's address changes, instead of overwriting the row.
-- Existing rows are all considered active.

ALTER TABLE addresses
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
        COMMENT 'FALSE = deprecated/soft-deleted; never hard-delete a row that has orders referencing it';

-- Ensure queries that filter on (is_default, is_active) are fast.
CREATE INDEX idx_addresses_customer_active ON addresses (customer_id, is_active, is_default);
