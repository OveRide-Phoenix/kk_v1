CREATE TABLE IF NOT EXISTS trip_sheets (
  trip_sheet_id INT NOT NULL AUTO_INCREMENT,
  service_date DATE NOT NULL,
  city_code VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  meal_type VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  payload JSON NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (trip_sheet_id),
  UNIQUE KEY uq_trip_sheets_service_city_meal (service_date, city_code, meal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
