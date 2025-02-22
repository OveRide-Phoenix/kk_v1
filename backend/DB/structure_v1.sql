-- Create indexes if needed..

CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    referred_by VARCHAR(100),
    primary_mobile VARCHAR(15) UNIQUE NOT NULL,
    alternative_mobile VARCHAR(15),
    name VARCHAR(100) NOT NULL,
    deliver_to VARCHAR(100) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'Regular',
    payment_frequency VARCHAR(50) DEFAULT 'Daily',
    route_assignment VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE address (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    house_apartment VARCHAR(255),
    written_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    google_pin VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    parent_item_id INT,
    is_combo BOOLEAN DEFAULT FALSE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    alias VARCHAR(100),
    type VARCHAR(100) NOT NULL,
    group_name VARCHAR(100),
    uom VARCHAR(50) NOT NULL,
    weight_factor DECIMAL(5,3),
    weight_uom VARCHAR(50),
    item_type VARCHAR(50),
    hsn_code VARCHAR(50),
    factor DECIMAL(5,3) DEFAULT 1.000,
    quantity_portion INT,
    buffer_percentage DECIMAL(5,2),
    picture_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_item_id) REFERENCES items(item_id)
);

CREATE TABLE menu (
    menu_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_type ENUM('One Day', 'Subscription', 'All Days', 'Festivals') NOT NULL,
    meal_type ENUM('Breakfast', 'Lunch', 'Dinner') NOT NULL,
    date DATE,
    festival VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
    menu_item_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NOT NULL,
    item_id INT NOT NULL,
    increment_qty INT,
    planned_qty INT,
    rate DECIMAL(10,2),
    sort_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_id) REFERENCES menu(menu_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    address_id INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (address_id) REFERENCES address(address_id)
);

CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);
