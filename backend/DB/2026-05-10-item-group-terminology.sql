UPDATE component_types
SET description = CONCAT('Item group resolved to the ', LOWER(name), ' of the day')
WHERE description LIKE CONCAT('Gen', 'eric % slot resolved to the item of the day');
