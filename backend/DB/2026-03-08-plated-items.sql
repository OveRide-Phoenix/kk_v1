CREATE TABLE IF NOT EXISTS plated_items (
    plated_item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_plated_items_item_id (item_id),
    CONSTRAINT fk_plated_items_item
        FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plated_item_components (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    plated_item_id INT NOT NULL,
    component_item_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1.000,
    sort_order INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_plated_item_components_plated_item_id (plated_item_id),
    KEY idx_plated_item_components_component_item_id (component_item_id),
    CONSTRAINT fk_plated_item_components_parent
        FOREIGN KEY (plated_item_id) REFERENCES plated_items(plated_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_plated_item_components_component
        FOREIGN KEY (component_item_id) REFERENCES items(item_id)
);
