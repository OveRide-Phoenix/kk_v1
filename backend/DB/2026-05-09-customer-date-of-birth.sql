-- KUT-44: Store customer date of birth for registration and admin profile editing.

ALTER TABLE `customers`
  ADD COLUMN `date_of_birth` date DEFAULT NULL AFTER `recipient_name`;
