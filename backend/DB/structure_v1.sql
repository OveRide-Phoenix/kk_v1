-- Customers Table
CREATE TABLE customers (
    customer_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    referred_by VARCHAR(100) NULL,
    primary_mobile VARCHAR(15) NOT NULL UNIQUE,
    alternative_mobile VARCHAR(15) NULL,
    name VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    payment_frequency VARCHAR(50) NULL DEFAULT 'Daily',
    email VARCHAR(100) NULL UNIQUE,
    default_address_id INT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (default_address_id) REFERENCES address(address_id)
);

-- Address Table
CREATE TABLE address (
    address_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    house_apartment_no VARCHAR(255) NULL,
    written_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address_type VARCHAR(50) NULL,
    route_assignment VARCHAR(50) NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Orders Table
CREATE TABLE orders (
    order_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    address_id INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NULL DEFAULT 'Pending',
    payment_method VARCHAR(50) NULL,
    discount DECIMAL(10,2) NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (address_id) REFERENCES address(address_id)
);

-- Order Items Table
CREATE TABLE order_items (
    order_item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    menu_rate DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- Menu Table
CREATE TABLE menu (
    menu_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    menu_date DATE NOT NULL,
    menu_type ENUM('Breakfast', 'Lunch', 'Dinner', 'Condiments') NOT NULL,
    is_festival BOOLEAN NOT NULL DEFAULT FALSE
);

-- Menu Items Table
CREATE TABLE menu_items (
    menu_item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NOT NULL,
    item_id INT NOT NULL,
    planned_qty INT NULL,
    rate DECIMAL(10,2) NOT NULL,
    sort_order INT NULL,
    FOREIGN KEY (menu_id) REFERENCES menu(menu_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- Items Table
CREATE TABLE items (
    item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_combo BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    alias VARCHAR(100) NULL,
    type VARCHAR(100) NOT NULL,
    group_name VARCHAR(100) NULL,
    uom VARCHAR(50) NOT NULL,
    weight_factor DECIMAL(5,3) NULL,
    weight_uom VARCHAR(50) NULL,
    item_type VARCHAR(50) NULL,
    hsn_code VARCHAR(50) NULL,
    factor DECIMAL(5,3) NULL DEFAULT 1,
    quantity_portion INT NULL,
    buffer_percentage DECIMAL(5,2) NULL,
    picture_url VARCHAR(255) NULL,
    breakfast_price DECIMAL(10,2) NOT NULL,
    lunch_price DECIMAL(10,2) NOT NULL,
    dinner_price DECIMAL(10,2) NOT NULL
);

-- Item Price History Table
CREATE TABLE item_price_history (
    history_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    old_breakfast_price DECIMAL(10,2) NOT NULL,
    old_lunch_price DECIMAL(10,2) NOT NULL,
    old_dinner_price DECIMAL(10,2) NOT NULL,
    changed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);
