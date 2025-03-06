-- Categories Table
CREATE TABLE categories (
    category_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

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
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP()
);

-- Admin Users Table
CREATE TABLE admin_users (
    admin_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    admin_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);


-- Menu Table
CREATE TABLE menu (
    menu_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    menu_type ENUM('Breakfast', 'Lunch', 'Dinner', 'Condiments') NOT NULL,
    date DATE NOT NULL,
    is_festival BOOLEAN NOT NULL DEFAULT FALSE
);

-- Items Table
CREATE TABLE items (
    item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    alias VARCHAR(100) NULL,
    category_id INT NULL,
    uom VARCHAR(50) NOT NULL,
    weight_factor DECIMAL(5,3) NULL,
    weight_uom VARCHAR(50) NULL,
    item_type VARCHAR(50) NULL,
    hsn_code VARCHAR(50) NULL,
    factor DECIMAL(5,3) NULL DEFAULT 1,
    quantity_portion INT NULL,
    buffer_percentage DECIMAL(5,2) NULL,
    picture_url VARCHAR(255) NULL,
    breakfast_price DECIMAL(10,2) NULL,
    lunch_price DECIMAL(10,2) NULL,
    dinner_price DECIMAL(10,2) NULL,
    condiments_price DECIMAL(10,2) NULL,
    festival_price DECIMAL(10,2) NULL,
    cgst DECIMAL(5,2) NULL,
    sgst DECIMAL(5,2) NULL,
    igst DECIMAL(5,2) NULL,
    net_price DECIMAL(10,2) NULL,
    is_combo BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Addresses Table
CREATE TABLE addresses (
    address_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    house_apartment_no VARCHAR(255) NULL,
    written_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_type VARCHAR(50) NULL,
    route_assignment VARCHAR(50) NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Orders Table
CREATE TABLE orders (
    order_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    address_id INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NULL DEFAULT 'Pending',
    payment_method VARCHAR(50) NOT NULL,
    discount DECIMAL(10,2) NULL DEFAULT 0.00,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (address_id) REFERENCES addresses(address_id)
);

-- Order Items Table
CREATE TABLE order_items (
    order_item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- Menu Items Table
CREATE TABLE menu_items (
    menu_item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NOT NULL,
    item_id INT NOT NULL,
    category_id INT NULL,
    planned_qty INT NULL,
    rate DECIMAL(10,2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NULL,
    FOREIGN KEY (menu_id) REFERENCES menu(menu_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Item Combo Table
CREATE TABLE item_combos (
    combo_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    combo_item_id INT NOT NULL,  -- The combo (e.g., South Indian Thali)
    included_item_id INT NULL,  -- Individual item (e.g., Rice)
    included_category_id INT NULL,  -- General category (e.g., Sambar)
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (combo_item_id) REFERENCES items(item_id),
    FOREIGN KEY (included_item_id) REFERENCES items(item_id),
    FOREIGN KEY (included_category_id) REFERENCES categories(category_id)
);

-- Add-On Table
CREATE TABLE item_add_ons (
    add_on_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    main_item_id INT NOT NULL,  -- The item that gets the add-on (e.g., Idly)
    add_on_item_id INT NOT NULL,  -- The item that is the add-on (e.g., Chutney)
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,  -- Some add-ons are optional
    max_quantity INT NOT NULL DEFAULT 1,  -- Max number of times this add-on can be ordered
    FOREIGN KEY (main_item_id) REFERENCES items(item_id),
    FOREIGN KEY (add_on_item_id) REFERENCES items(item_id)
);

-- Item Price History Table
CREATE TABLE item_price_history (
    history_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    effect_date DATE NOT NULL,
    breakfast_price DECIMAL(10,2) NULL,
    lunch_price DECIMAL(10,2) NULL,
    dinner_price DECIMAL(10,2) NULL,
    condiments_price DECIMAL(10,2) NULL,
    festival_price DECIMAL(10,2) NULL,
    cgst DECIMAL(5,2) NULL,
    sgst DECIMAL(5,2) NULL,
    igst DECIMAL(5,2) NULL,
    net_price DECIMAL(10,2) NULL,
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);
