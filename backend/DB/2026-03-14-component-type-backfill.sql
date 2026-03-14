START TRANSACTION;

INSERT INTO component_types (name, description, is_active)
SELECT 'Idly', 'Items that fulfill an idly slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Idly');

INSERT INTO component_types (name, description, is_active)
SELECT 'Vada', 'Items that fulfill a vada slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Vada');

INSERT INTO component_types (name, description, is_active)
SELECT 'Dosa', 'Items that fulfill a dosa slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Dosa');

INSERT INTO component_types (name, description, is_active)
SELECT 'Poori', 'Items that fulfill a poori slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Poori');

INSERT INTO component_types (name, description, is_active)
SELECT 'Upma', 'Items that fulfill an upma slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Upma');

INSERT INTO component_types (name, description, is_active)
SELECT 'Pongal', 'Items that fulfill a pongal slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Pongal');

INSERT INTO component_types (name, description, is_active)
SELECT 'Curd Rice', 'Items that fulfill a curd rice slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Curd Rice');

INSERT INTO component_types (name, description, is_active)
SELECT 'Chapati', 'Items that fulfill a chapati slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Chapati');

INSERT INTO component_types (name, description, is_active)
SELECT 'Bhature', 'Items that fulfill a bhature slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Bhature');

INSERT INTO component_types (name, description, is_active)
SELECT 'Pickle', 'Items that fulfill a pickle slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Pickle');

INSERT INTO component_types (name, description, is_active)
SELECT 'Ghee', 'Items that fulfill a ghee slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Ghee');

INSERT INTO component_types (name, description, is_active)
SELECT 'Curd', 'Items that fulfill a curd slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Curd');

INSERT INTO component_types (name, description, is_active)
SELECT 'Idly Vada', 'Items that fulfill an idly vada slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Idly Vada');

INSERT INTO component_types (name, description, is_active)
SELECT 'Rice Meal', 'Items that fulfill a rice meal slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Rice Meal');

INSERT INTO component_types (name, description, is_active)
SELECT 'Chapati Meal', 'Items that fulfill a chapati meal slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Chapati Meal');

INSERT INTO component_types (name, description, is_active)
SELECT 'Poori Saagu', 'Items that fulfill a poori saagu slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Poori Saagu');

INSERT INTO component_types (name, description, is_active)
SELECT 'Mini Meals', 'Items that fulfill a mini meals slot', 1
WHERE NOT EXISTS (SELECT 1 FROM component_types WHERE name = 'Mini Meals');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Idly' LIMIT 1)
WHERE name IN ('Idly', 'Single Idly');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Vada' LIMIT 1)
WHERE name = 'Vada';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Dosa' LIMIT 1)
WHERE name IN ('Plain Dosa', 'Masala Dosa');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Poori' LIMIT 1)
WHERE name = 'Poori';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Upma' LIMIT 1)
WHERE name = 'Upma';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Pongal' LIMIT 1)
WHERE name = 'Pongal';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Curd Rice' LIMIT 1)
WHERE name = 'Curd Rice';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Chapati' LIMIT 1)
WHERE name = 'Chapati';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Bhature' LIMIT 1)
WHERE name = 'Bhature';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Pickle' LIMIT 1)
WHERE name = 'Pickle';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Ghee' LIMIT 1)
WHERE name = 'Ghee';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Curd' LIMIT 1)
WHERE name = 'Curd';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Idly Vada' LIMIT 1)
WHERE name IN ('Idly Vada', 'Single Idly Vada');

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Rice Meal' LIMIT 1)
WHERE name = 'Rice & Sambar';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Chapati Meal' LIMIT 1)
WHERE name = 'Chapati & Curry';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Poori Saagu' LIMIT 1)
WHERE name = 'Poori Saagu';

UPDATE items
SET component_type_id = (SELECT component_type_id FROM component_types WHERE name = 'Mini Meals' LIMIT 1)
WHERE name = 'Mini Meals';

COMMIT;
