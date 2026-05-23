START TRANSACTION;

UPDATE addresses
SET route_assignment = 'Route A'
WHERE route_assignment = 'Route1';

UPDATE addresses
SET route_assignment = 'Route B'
WHERE route_assignment = 'Route2';

UPDATE addresses
SET route_assignment = 'Route C'
WHERE route_assignment = 'Route3';

UPDATE addresses
SET route_assignment = 'Route D'
WHERE route_assignment = 'Route4';

CREATE TABLE IF NOT EXISTS delivery_routes (
  route_id INT NOT NULL AUTO_INCREMENT,
  city_code VARCHAR(10) NOT NULL,
  route_code VARCHAR(50) NOT NULL,
  route_name VARCHAR(150) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (route_id),
  UNIQUE KEY uq_delivery_routes_city_route_code (city_code, route_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO delivery_routes (city_code, route_code, route_name, notes, is_active, sort_order)
SELECT city_code,
       route_assignment AS route_code,
       route_assignment AS route_name,
       NULL AS notes,
       1 AS is_active,
       CASE route_assignment
         WHEN 'Route A' THEN 1
         WHEN 'Route B' THEN 2
         WHEN 'Route C' THEN 3
         WHEN 'Route D' THEN 4
         ELSE 99
       END AS sort_order
FROM (
  SELECT DISTINCT city_code, route_assignment
  FROM addresses
  WHERE route_assignment IS NOT NULL
    AND TRIM(route_assignment) <> ''
) routes
ON DUPLICATE KEY UPDATE
  route_name = VALUES(route_name),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order);

COMMIT;
