-- MySQL dump 10.13  Distrib 9.4.0, for macos15 (arm64)
--
-- Host: localhost    Database: kk_v1
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `address_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `house_apartment_no` varchar(255) DEFAULT NULL,
  `written_address` text NOT NULL,
  `city` varchar(100) NOT NULL,
  `pin_code` varchar(10) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `address_type` varchar(50) DEFAULT NULL,
  `route_assignment` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`address_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (5,13,'#23, Gowri Mane','Chamundipuram, Near GTR, Mysuru-76','Mysore','560076',12.28906891,76.65058537,'Home',NULL,1),(13,25,'A-1033','123 MG Road, Bangalore','Bangalore','560001',12.97160000,77.59460000,'Home','Route1',1),(14,26,'B-202','456 Residency Road, Chennai','Chennai','600001',13.08270000,80.27070000,'Work','Route2',1),(43,25,'B-202','2nd adddress of satish','Bangalore','560025',12.97350000,77.60900000,'Work','Route2',0),(44,25,'D-404','12 JP Nagar 4th Phase, Bangalore','Bangalore','560078',12.90630000,77.58500000,'Home 2','Route4',0),(45,25,'C-303','789 Indiranagar Main Road, Bangalore','Bangalore','560038',12.97890000,77.64120000,'Other','Route3',0);
/*!40000 ALTER TABLE `addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_logs`
--

DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action_type` enum('ADD','UPDATE','DELETE') NOT NULL,
  `entity_type` enum('ITEM','COMBO','ADDON','CATEGORY') NOT NULL,
  `entity_id` int NOT NULL,
  `description` text,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`admin_id`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_logs`
--

LOCK TABLES `admin_logs` WRITE;
/*!40000 ALTER TABLE `admin_logs` DISABLE KEYS */;
INSERT INTO `admin_logs` VALUES (7,5,'UPDATE','ITEM',40,'Menu unreleased','2025-10-21 17:39:55'),(8,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 5 items','2025-10-21 17:40:05'),(9,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 5 items','2025-10-21 17:40:08'),(10,5,'UPDATE','ITEM',40,'Menu released','2025-10-21 17:40:08'),(11,5,'UPDATE','ITEM',36,'Menu unreleased','2025-10-21 17:40:21'),(12,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 9 items','2025-10-21 17:40:27'),(13,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 9 items','2025-10-21 17:40:31'),(14,5,'UPDATE','ITEM',36,'Menu released','2025-10-21 17:40:31'),(15,5,'UPDATE','ITEM',40,'Menu unreleased','2025-10-21 17:50:17'),(16,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-21 17:50:22'),(17,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-21 17:50:23'),(18,5,'UPDATE','ITEM',40,'Menu released','2025-10-21 17:50:23'),(19,5,'UPDATE','ITEM',36,'Menu unreleased','2025-10-21 17:53:33'),(20,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 7 items','2025-10-21 17:53:41'),(21,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 7 items','2025-10-21 17:53:43'),(22,5,'UPDATE','ITEM',36,'Menu released','2025-10-21 17:53:43'),(23,5,'UPDATE','ITEM',36,'Menu unreleased','2025-10-21 17:56:35'),(24,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 8 items','2025-10-21 17:56:39'),(25,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 8 items','2025-10-21 17:56:45'),(26,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 8 items','2025-10-21 17:56:48'),(27,5,'UPDATE','ITEM',36,'Menu released','2025-10-21 17:56:48'),(28,5,'UPDATE','ITEM',40,'Menu unreleased','2025-10-22 00:48:49'),(29,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-22 00:49:07'),(30,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-22 00:49:07'),(31,5,'UPDATE','ITEM',40,'Menu released','2025-10-22 00:49:07'),(32,5,'UPDATE','ITEM',40,'Generated production plan for 2025-10-22 (Breakfast)','2025-10-22 09:20:57'),(33,5,'UPDATE','ITEM',40,'Adjusted planned quantities for 2025-10-22 (Breakfast)','2025-10-22 09:21:12'),(34,5,'UPDATE','ITEM',40,'Generated production plan for 2025-10-22 (Breakfast)','2025-10-22 09:21:13'),(35,5,'ADD','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:50:52'),(36,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:50:52'),(37,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 10:50:52'),(38,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 10:50:58'),(39,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 10:51:05'),(40,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:13'),(41,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:14'),(42,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 10:51:14'),(43,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 10:51:29'),(44,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:40'),(45,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:44'),(46,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:44'),(47,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 10:51:44'),(48,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 11:16:13'),(49,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 0 items','2025-10-23 11:16:15'),(50,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 11:16:15'),(51,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 11:16:21'),(52,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 11:16:30'),(53,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 11:16:31'),(54,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 11:16:31'),(55,5,'ADD','ITEM',42,'Upserted menu for 2025-10-23 (lunch) with 3 items','2025-10-23 11:16:54'),(56,5,'UPDATE','ITEM',42,'Upserted menu for 2025-10-23 (lunch) with 3 items','2025-10-23 11:16:55'),(57,5,'UPDATE','ITEM',42,'Menu released','2025-10-23 11:16:55'),(58,5,'UPDATE','ITEM',42,'Generated production plan for 2025-10-23 (Lunch)','2025-10-23 11:17:13'),(59,5,'ADD','ITEM',43,'Upserted menu for 2025-10-23 (dinner) with 2 items','2025-10-23 11:17:25'),(60,5,'UPDATE','ITEM',43,'Upserted menu for 2025-10-23 (dinner) with 2 items','2025-10-23 11:17:26'),(61,5,'UPDATE','ITEM',43,'Menu released','2025-10-23 11:17:26'),(62,5,'UPDATE','ITEM',43,'Generated production plan for 2025-10-23 (Dinner)','2025-10-23 11:18:08'),(63,5,'UPDATE','ITEM',43,'Generated production plan for 2025-10-23 (Dinner)','2025-10-23 11:18:11'),(64,5,'UPDATE','ITEM',43,'Generated production plan for 2025-10-23 (Dinner)','2025-10-23 11:18:36'),(65,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:18:44'),(66,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:19:17'),(67,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:22:21'),(68,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:22:56'),(69,5,'ADD','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 12:50:36'),(70,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 12:50:36'),(71,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 12:50:36'),(72,5,'UPDATE','ITEM',44,'Menu unreleased','2025-10-24 13:07:29'),(73,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:07:34'),(74,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:07:34'),(75,5,'UPDATE','ITEM',44,'Menu unreleased','2025-10-24 13:07:35'),(76,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:07:41'),(77,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:07:41'),(78,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:34:33'),(79,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:34:33'),(80,5,'ADD','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:34:33'),(81,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:34:33'),(82,5,'ADD','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:34:33'),(83,5,'ADD','ITEM',47,'Upserted menu for 2025-10-25 (Breakfast) with 25 items','2025-10-24 13:35:05'),(84,5,'UPDATE','ITEM',47,'Menu released','2025-10-24 13:35:05'),(85,5,'ADD','ITEM',48,'Upserted menu for 2025-10-25 (Lunch) with 40 items','2025-10-24 13:35:05'),(86,5,'UPDATE','ITEM',48,'Menu released','2025-10-24 13:35:05'),(87,5,'ADD','ITEM',49,'Upserted menu for 2025-10-25 (Dinner) with 13 items','2025-10-24 13:35:06'),(88,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:35:42'),(89,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:35:42'),(90,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:35:42'),(91,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:35:42'),(92,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:35:42'),(93,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:36:14'),(94,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:36:17'),(95,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:36:17'),(96,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:37:17'),(97,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:37:17'),(98,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:37:17'),(99,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:37:17'),(100,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:37:17'),(101,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:40:14'),(102,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:40:14'),(103,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:40:14'),(104,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:40:14'),(105,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:40:14'),(106,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 8 items','2025-10-24 13:42:00'),(107,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:42:00'),(108,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 8 items','2025-10-24 13:42:00'),(109,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:42:00'),(110,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 8 items','2025-10-24 13:42:00');
/*!40000 ALTER TABLE `admin_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_users` (
  `admin_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','manager') NOT NULL DEFAULT 'admin',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admin_customer` (`customer_id`),
  CONSTRAINT `fk_admin_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_users`
--

LOCK TABLES `admin_users` WRITE;
/*!40000 ALTER TABLE `admin_users` DISABLE KEYS */;
INSERT INTO `admin_users` VALUES (5,13,'$2b$12$togjzHD04OtMRDgvKa2DR.k49xb8r5gy0gFHlQpprpVWabyeCYYDe','admin',1,'2025-03-05 19:40:31');
/*!40000 ALTER TABLE `admin_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bld`
--

DROP TABLE IF EXISTS `bld`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bld` (
  `bld_id` int NOT NULL AUTO_INCREMENT,
  `bld_type` enum('Breakfast','Lunch','Dinner','Condiments') NOT NULL,
  PRIMARY KEY (`bld_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bld`
--

LOCK TABLES `bld` WRITE;
/*!40000 ALTER TABLE `bld` DISABLE KEYS */;
INSERT INTO `bld` VALUES (1,'Breakfast'),(2,'Lunch'),(3,'Dinner'),(4,'Condiments');
/*!40000 ALTER TABLE `bld` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (4,'Beverages'),(2,'North Indian'),(3,'Snacks'),(1,'South Indian');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `combo_items`
--

DROP TABLE IF EXISTS `combo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combo_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `combo_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `combo_id` (`combo_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `combo_items_ibfk_1` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `combo_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `combo_items`
--

LOCK TABLES `combo_items` WRITE;
/*!40000 ALTER TABLE `combo_items` DISABLE KEYS */;
INSERT INTO `combo_items` VALUES (1,4,1,1),(2,4,2,1),(3,4,3,1),(4,4,4,1),(5,1,1,1),(6,1,2,1),(7,1,3,1),(8,1,4,1),(9,2,1,1),(10,2,2,1),(11,2,3,1),(12,2,4,1),(13,3,1,1),(14,3,2,1),(15,3,3,1),(16,3,4,1),(17,4,1,1),(18,4,2,1),(19,4,3,1),(20,4,4,1),(21,4,1,1),(22,4,2,1),(23,4,3,1),(24,4,4,1);
/*!40000 ALTER TABLE `combo_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `combos`
--

DROP TABLE IF EXISTS `combos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combos` (
  `combo_id` int NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`combo_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `combos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `combos`
--

LOCK TABLES `combos` WRITE;
/*!40000 ALTER TABLE `combos` DISABLE KEYS */;
INSERT INTO `combos` VALUES (1,'Breakfast Combo',120.00,1),(2,'Lunch Combo 1',180.00,2),(3,'Lunch Combo 2',200.00,2),(4,'Dinner Combo',250.00,2);
/*!40000 ALTER TABLE `combos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `customer_orders_view`
--

DROP TABLE IF EXISTS `customer_orders_view`;
/*!50001 DROP VIEW IF EXISTS `customer_orders_view`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `customer_orders_view` AS SELECT 
 1 AS `customer_id`,
 1 AS `customer_name`,
 1 AS `customer_phone`,
 1 AS `customer_email`,
 1 AS `address`,
 1 AS `no_of_orders`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `referred_by` varchar(100) DEFAULT NULL,
  `primary_mobile` varchar(15) NOT NULL,
  `alternative_mobile` varchar(15) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `recipient_name` varchar(100) NOT NULL,
  `payment_frequency` varchar(50) DEFAULT 'Daily',
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `primary_mobile` (`primary_mobile`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (13,'Sanjay D','9108254344','9880962761','Shashank S','Shashank S','Daily','shashanksrao@gmail.com','2025-03-05 15:07:22',1),(25,NULL,'9845266160','9876501234','Satish BN','Gowramma','Daily','sat@example.com','2025-03-07 19:09:29',0),(26,NULL,'9123456789','9867543210','Sneha Rao','Sneha Rao','Monthly','sneha@example.com','2025-03-07 19:09:29',0);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_add_ons`
--

DROP TABLE IF EXISTS `item_add_ons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_add_ons` (
  `add_on_id` int NOT NULL AUTO_INCREMENT,
  `main_item_id` int NOT NULL,
  `add_on_item_id` int NOT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '0',
  `max_quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`add_on_id`),
  KEY `main_item_id` (`main_item_id`),
  KEY `add_on_item_id` (`add_on_item_id`),
  CONSTRAINT `item_add_ons_ibfk_1` FOREIGN KEY (`main_item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `item_add_ons_ibfk_2` FOREIGN KEY (`add_on_item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_add_ons`
--

LOCK TABLES `item_add_ons` WRITE;
/*!40000 ALTER TABLE `item_add_ons` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_add_ons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_price_history`
--

DROP TABLE IF EXISTS `item_price_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_price_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `effect_date` date NOT NULL,
  `breakfast_price` decimal(10,2) DEFAULT NULL,
  `lunch_price` decimal(10,2) DEFAULT NULL,
  `dinner_price` decimal(10,2) DEFAULT NULL,
  `condiments_price` decimal(10,2) DEFAULT NULL,
  `festival_price` decimal(10,2) DEFAULT NULL,
  `cgst` decimal(5,2) DEFAULT NULL,
  `sgst` decimal(5,2) DEFAULT NULL,
  `igst` decimal(5,2) DEFAULT NULL,
  `net_price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_price_history_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_price_history`
--

LOCK TABLES `item_price_history` WRITE;
/*!40000 ALTER TABLE `item_price_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_price_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `alias` varchar(100) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `uom` varchar(50) NOT NULL,
  `weight_factor` decimal(5,3) DEFAULT NULL,
  `weight_uom` varchar(50) DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `hsn_code` varchar(50) DEFAULT NULL,
  `factor` decimal(5,3) DEFAULT '1.000',
  `quantity_portion` int DEFAULT NULL,
  `buffer_percentage` decimal(5,2) DEFAULT NULL,
  `picture_url` varchar(255) DEFAULT NULL,
  `breakfast_price` decimal(10,2) DEFAULT NULL,
  `lunch_price` decimal(10,2) DEFAULT NULL,
  `dinner_price` decimal(10,2) DEFAULT NULL,
  `condiments_price` decimal(10,2) DEFAULT NULL,
  `festival_price` decimal(10,2) DEFAULT NULL,
  `cgst` decimal(5,2) DEFAULT NULL,
  `sgst` decimal(5,2) DEFAULT NULL,
  `igst` decimal(5,2) DEFAULT NULL,
  `net_price` decimal(10,2) DEFAULT NULL,
  `bld_id` int NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `category_id` (`category_id`),
  KEY `fk_item_bld` (`bld_id`),
  CONSTRAINT `fk_item_bld` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=313 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (1,'Idli','Soft rice cakes','idli',1,'plate',1.000,'pcs','Food','1234',1.000,2,5.00,'idli.jpg',30.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,31.50,1),(2,'Dosa','Crispy rice pancake','dosa',1,'piece',1.000,'pcs','Food','1235',1.000,1,5.00,'dosa.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,52.50,1),(3,'Rice & Sambar','Steamed rice with Sambar','rice_sambar',1,'plate',1.000,'pcs','Food','1236',1.000,1,5.00,'rice_sambar.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,84.00,2),(4,'Chapati & Curry','Whole wheat chapati with curry','chapati_curry',2,'plate',1.000,'pcs','Food','1237',1.000,2,5.00,'chapati_curry.jpg',NULL,90.00,NULL,NULL,NULL,5.00,5.00,0.00,94.50,2),(5,'Upma','Savory semolina porridge','upma',1,'plate',1.000,'pcs','Food','1240',1.000,1,5.00,'upma.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00,1),(6,'Pongal','Rice and lentil dish','pongal',1,'bowl',1.000,'pcs','Food','1241',1.000,1,5.00,'pongal.jpg',45.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,49.50,1),(7,'Medu Vada','Crispy lentil doughnut','medu_vada',1,'piece',1.000,'pcs','Food','1242',1.000,1,5.00,'medu_vada.jpg',35.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,38.50,1),(8,'Pesarattu','Green gram pancake','pesarattu',1,'plate',1.000,'pcs','Food','1243',1.000,1,5.00,'pesarattu.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00,1),(9,'Curd Rice','Rice in yogurt','curd_rice',1,'plate',1.000,'pcs','Food','1244',1.000,1,5.00,'curd_rice.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00,3),(10,'Lemon Rice','Rice with lemon and spices','lemon_rice',1,'plate',1.000,'pcs','Food','1245',1.000,1,5.00,'lemon_rice.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00,1),(11,'Tomato Rice','Rice cooked with tomato gravy','tomato_rice',1,'plate',1.000,'pcs','Food','1246',1.000,1,5.00,'tomato_rice.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00,1),(12,'Bisi Bele Bath','Spicy rice–lentil dish','bisi_bele_bath',1,'bowl',1.000,'pcs','Food','1247',1.000,1,5.00,'bisi_bele_bath.jpg',70.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,77.00,1),(13,'Avial','Mixed vegetable stew','avial',1,'plate',1.000,'pcs','Food','1248',1.000,1,5.00,'avial.jpg',65.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,71.50,1),(14,'Cabbage Thoran','Stir-fried cabbage with coconut','cabbage_thoran',1,'plate',1.000,'pcs','Food','1249',1.000,1,5.00,'cabbage_thoran.jpg',55.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,60.50,1),(15,'Poori','Deep-fried bread','poori',1,'piece',1.000,'pcs','Food','1250',1.000,1,5.00,'poori.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00,1),(16,'Masala Dosa','Rice pancake with potato filling','masala_dosa',1,'piece',1.000,'pcs','Food','1251',1.000,1,5.00,'masala_dosa.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00,1),(17,'Idiyappam','Steamed rice noodles','idiyappam',1,'plate',1.000,'pcs','Food','1252',1.000,1,5.00,'idiyappam.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00,1),(18,'Puttu','Steamed rice cake','puttu',1,'plate',1.000,'pcs','Food','1253',1.000,1,5.00,'puttu.jpg',45.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,49.50,1),(19,'Appam','Fermented rice pancake','appam',1,'piece',1.000,'pcs','Food','1254',1.000,1,5.00,'appam.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00,1),(20,'Kesari Bath','Sweet semolina pudding','kesari_bath',1,'plate',1.000,'pcs','Food','1255',1.000,1,5.00,'kesari_bath.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00,1),(21,'Rava Dosa','Semolina crepe','rava_dosa',1,'piece',1.000,'pcs','Food','1256',1.000,1,5.00,'rava_dosa.jpg',55.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,60.50,1),(22,'Onion Uttapam','Savory rice pancake with onion','onion_uttapam',1,'piece',1.000,'pcs','Food','1257',1.000,1,5.00,'onion_uttapam.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00,1),(23,'Rava Idli','Steamed semolina cakes','rava_idli',1,'piece',1.000,'pcs','Food','1258',1.000,1,5.00,'rava_idli.jpg',45.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,49.50,1),(24,'Semiya Upma','Vermicelli porridge','semiya_upma',1,'plate',1.000,'pcs','Food','1259',1.000,1,5.00,'semiya_upma.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00,1),(25,'Vegetable Uttapam','Rice pancake with veggies','veg_uttapam',1,'piece',1.000,'pcs','Food','1260',1.000,1,5.00,'veg_uttapam.jpg',65.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,71.50,1),(26,'Paniyaram','Savory rice dumplings','paniyaram',1,'piece',1.000,'pcs','Food','1261',1.000,1,5.00,'paniyaram.jpg',35.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,38.50,1),(27,'Tomato Uthappam','Rice pancake with tomato','tomato_uthappam',1,'piece',1.000,'pcs','Food','1262',1.000,1,5.00,'tomato_uthappam.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00,1),(28,'Vegetable Dosa','Rice pancake with veggies','veg_dosa',1,'piece',1.000,'pcs','Food','1263',1.000,1,5.00,'veg_dosa.jpg',70.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,77.00,1),(29,'Palak Paneer','Spinach with cottage cheese','palak_paneer',2,'plate',1.000,'pcs','Food','1264',1.000,1,5.00,'palak_paneer.jpg',NULL,150.00,NULL,NULL,NULL,5.00,5.00,0.00,165.00,2),(30,'Paneer Butter Masala','Cottage cheese in tomato gravy','paneer_butter_masala',2,'plate',1.000,'pcs','Food','1265',1.000,1,5.00,'paneer_butter_masala.jpg',NULL,160.00,NULL,NULL,NULL,5.00,5.00,0.00,176.00,2),(31,'Malai Kofta','Vegetable dumplings in gravy','malai_kofta',2,'plate',1.000,'pcs','Food','1266',1.000,1,5.00,'malai_kofta.jpg',NULL,170.00,NULL,NULL,NULL,5.00,5.00,0.00,187.00,2),(32,'Dal Makhani','Creamy black lentils','dal_makhani',2,'bowl',1.000,'pcs','Food','1267',1.000,1,5.00,'dal_makhani.jpg',NULL,140.00,NULL,NULL,NULL,5.00,5.00,0.00,154.00,2),(33,'Chole Bhature','Spicy chickpeas with fried bread','chole_bhature',2,'plate',1.000,'pcs','Food','1268',1.000,1,5.00,'chole_bhature.jpg',NULL,130.00,NULL,NULL,NULL,5.00,5.00,0.00,143.00,2),(34,'Aloo Paratha','Stuffed potato bread','aloo_paratha',2,'piece',1.000,'pcs','Food','1269',1.000,1,5.00,'aloo_paratha.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,88.00,2),(35,'Gobi Paratha','Stuffed cauliflower bread','gobi_paratha',2,'piece',1.000,'pcs','Food','1270',1.000,1,5.00,'gobi_paratha.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,88.00,2),(36,'Mix Veg Curry','Mixed vegetables in gravy','mix_veg_curry',2,'plate',1.000,'pcs','Food','1271',1.000,1,5.00,'mix_veg_curry.jpg',NULL,130.00,NULL,NULL,NULL,5.00,5.00,0.00,143.00,2),(37,'Rajma','Red kidney bean curry','rajma',2,'bowl',1.000,'pcs','Food','1272',1.000,1,5.00,'rajma.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00,2),(38,'Kadhi Pakora','Yogurt curry with fritters','kadhi_pakora',2,'bowl',1.000,'pcs','Food','1273',1.000,1,5.00,'kadhi_pakora.jpg',NULL,110.00,NULL,NULL,NULL,5.00,5.00,0.00,121.00,2),(39,'Bhindi Masala','Spiced okra','bhindi_masala',2,'plate',1.000,'pcs','Food','1274',1.000,1,5.00,'bhindi_masala.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00,2),(40,'Aloo Gobi','Potato & cauliflower','aloo_gobi',2,'plate',1.000,'pcs','Food','1275',1.000,1,5.00,'aloo_gobi.jpg',NULL,100.00,NULL,NULL,NULL,5.00,5.00,0.00,110.00,2),(41,'Tandoori Roti','Clay-oven flatbread','tandoori_roti',2,'piece',1.000,'pcs','Food','1276',1.000,1,5.00,'tandoori_roti.jpg',NULL,20.00,NULL,NULL,NULL,5.00,5.00,0.00,22.00,2),(42,'Naan','Leavened flatbread','naan',2,'piece',1.000,'pcs','Food','1277',1.000,1,5.00,'naan.jpg',NULL,30.00,NULL,NULL,NULL,5.00,5.00,0.00,33.00,2),(43,'Veg Biryani','Spiced rice with vegetables','veg_biryani',2,'plate',1.000,'pcs','Food','1278',1.000,1,5.00,'veg_biryani.jpg',NULL,150.00,NULL,NULL,NULL,5.00,5.00,0.00,165.00,2),(44,'Pea Pulao','Rice with green peas','pea_pulao',2,'plate',1.000,'pcs','Food','1279',1.000,1,5.00,'pea_pulao.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00,2),(45,'Veg Fried Rice','Stir-fried rice & veggies','veg_fried_rice',2,'plate',1.000,'pcs','Food','1280',1.000,1,5.00,'veg_fried_rice.jpg',NULL,100.00,NULL,NULL,NULL,5.00,5.00,0.00,110.00,2),(46,'Veg Hakka Noodles','China-style stir-fried noodles','veg_hakka_noodles',2,'plate',1.000,'pcs','Food','1281',1.000,1,5.00,'veg_hakka_noodles.jpg',NULL,110.00,NULL,NULL,NULL,5.00,5.00,0.00,121.00,2),(47,'Corn Chaat','Spiced corn snack','corn_chaat',2,'bowl',1.000,'pcs','Food','1282',1.000,1,5.00,'corn_chaat.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,88.00,2),(48,'Samosa','Fried pastry with potato filling','samosa',2,'piece',1.000,'pcs','Food','1283',1.000,1,5.00,'samosa.jpg',NULL,30.00,NULL,NULL,NULL,5.00,5.00,0.00,33.00,2),(49,'Veg Cutlet','Spiced vegetable patty','veg_cutlet',2,'piece',1.000,'pcs','Food','1284',1.000,1,5.00,'veg_cutlet.jpg',NULL,40.00,NULL,NULL,NULL,5.00,5.00,0.00,44.00,2),(50,'Veg Sandwich','Mixed veggie sandwich','veg_sandwich',2,'piece',1.000,'pcs','Food','1285',1.000,1,5.00,'veg_sandwich.jpg',NULL,60.00,NULL,NULL,NULL,5.00,5.00,0.00,66.00,2),(51,'Spring Roll','Vegetable filled roll','spring_roll',2,'piece',1.000,'pcs','Food','1286',1.000,1,5.00,'spring_roll.jpg',NULL,50.00,NULL,NULL,NULL,5.00,5.00,0.00,55.00,2),(52,'Veg Manchurian','Chinese-style veggie balls','veg_manchurian',2,'plate',1.000,'pcs','Food','1287',1.000,1,5.00,'veg_manchurian.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00,2),(53,'Hara Bhara Kabab','Spinach & peas kebab','hara_bhara_kabab',2,'piece',1.000,'pcs','Food','1288',1.000,1,5.00,'hara_bhara_kabab.jpg',NULL,90.00,NULL,NULL,NULL,5.00,5.00,0.00,99.00,2),(54,'Dhaba Dal','Spiced lentils, street style','dhaba_dal',2,'bowl',1.000,'pcs','Food','1289',1.000,1,5.00,'dhaba_dal.jpg',NULL,140.00,NULL,NULL,NULL,5.00,5.00,0.00,154.00,2),(201,'Kadai Paneer','Paneer cooked with capsicum & spices','kadai_paneer',2,'plate',1.000,'pcs','Food','1290',1.000,1,5.00,'kadai_paneer.jpg',NULL,160.00,NULL,NULL,NULL,5.00,5.00,0.00,168.00,2),(202,'Matar Paneer','Peas and paneer in tomato-onion gravy','matar_paneer',2,'plate',1.000,'pcs','Food','1291',1.000,1,5.00,'matar_paneer.jpg',NULL,150.00,NULL,NULL,NULL,5.00,5.00,0.00,157.50,2),(203,'Baingan Bharta','Smoked mashed eggplant curry','baingan_bharta',2,'plate',1.000,'pcs','Food','1292',1.000,1,5.00,'baingan_bharta.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,126.00,2),(204,'Veg Korma','Mixed veg in rich coconut-cashew gravy','veg_korma',2,'plate',1.000,'pcs','Food','1293',1.000,1,5.00,'veg_korma.jpg',NULL,130.00,NULL,NULL,NULL,5.00,5.00,0.00,136.50,2),(205,'Jeera Rice','Fragrant cumin tempered basmati rice','jeera_rice',2,'plate',1.000,'pcs','Food','1294',1.000,1,5.00,'jeera_rice.jpg',NULL,90.00,NULL,NULL,NULL,5.00,5.00,0.00,94.50,2),(206,'Veg Pulao','Basmati rice cooked with mixed vegetables','veg_pulao',2,'plate',1.000,'pcs','Food','1295',1.000,1,5.00,'veg_pulao.jpg',NULL,110.00,NULL,NULL,NULL,5.00,5.00,0.00,115.50,2),(207,'Lachha Paratha','Layered flaky whole wheat paratha','lachha_paratha',2,'piece',1.000,'pcs','Food','1296',1.000,1,5.00,'lachha_paratha.jpg',NULL,35.00,NULL,NULL,NULL,5.00,5.00,0.00,36.75,2),(208,'Paneer Tikka','Marinated paneer grilled in tandoor','paneer_tikka',2,'plate',1.000,'pcs','Food','1297',1.000,1,5.00,'paneer_tikka.jpg',NULL,140.00,NULL,NULL,NULL,5.00,5.00,0.00,147.00,2),(209,'Mix Veg Thali','Assorted veg curries, bread & rice','mix_veg_thali',2,'plate',1.000,'pcs','Food','1298',1.000,1,5.00,'mix_veg_thali.jpg',NULL,180.00,NULL,NULL,NULL,5.00,5.00,0.00,189.00,2),(210,'Dal Tadka','Yellow lentils tempered with ghee & spices','dal_tadka',2,'bowl',1.000,'pcs','Food','1299',1.000,1,5.00,'dal_tadka.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,126.00,2),(211,'Mushroom Masala','Button mushrooms in spicy gravy','mushroom_masala',2,'plate',1.000,'pcs','Food','1300',1.000,1,5.00,'mushroom_masala.jpg',NULL,160.00,NULL,NULL,NULL,5.00,5.00,0.00,168.00,2),(212,'Aloo Jeera','Potatoes tossed with cumin & spices','aloo_jeera',2,'plate',1.000,'pcs','Food','1301',1.000,1,5.00,'aloo_jeera.jpg',NULL,100.00,NULL,NULL,NULL,5.00,5.00,0.00,105.00,2),(301,'Veg Kurma','South-Indian style mixed veg kurma','veg_kurma_din',3,'plate',1.000,'pcs','Food','1302',1.000,1,5.00,'veg_kurma_din.jpg',NULL,NULL,130.00,NULL,NULL,5.00,5.00,0.00,136.50,3),(302,'Ghee Rice','Aromatic basmati rice cooked in ghee','ghee_rice',3,'plate',1.000,'pcs','Food','1303',1.000,1,5.00,'ghee_rice.jpg',NULL,NULL,120.00,NULL,NULL,5.00,5.00,0.00,126.00,3),(303,'Paneer Tikka Masala','Grilled paneer in rich tomato gravy','paneer_tikka_masala',3,'plate',1.000,'pcs','Food','1304',1.000,1,5.00,'paneer_tikka_masala.jpg',NULL,NULL,170.00,NULL,NULL,5.00,5.00,0.00,178.50,3),(304,'Veg Handi','Mixed vegetables slow-cooked in handi','veg_handi',3,'plate',1.000,'pcs','Food','1305',1.000,1,5.00,'veg_handi.jpg',NULL,NULL,150.00,NULL,NULL,5.00,5.00,0.00,157.50,3),(305,'Dal Fry','Toor dal tempered with garlic & spices','dal_fry',3,'bowl',1.000,'pcs','Food','1306',1.000,1,5.00,'dal_fry.jpg',NULL,NULL,110.00,NULL,NULL,5.00,5.00,0.00,115.50,3),(306,'Mixed Veg Raita','Curd with cucumber, onion & spices','mixed_veg_raita',3,'bowl',1.000,'pcs','Food','1307',1.000,1,5.00,'mixed_veg_raita.jpg',NULL,NULL,50.00,NULL,NULL,5.00,5.00,0.00,52.50,3),(307,'Hot & Sour Soup (Veg)','Spicy-tangy veg soup','hot_sour_soup_veg',3,'bowl',1.000,'pcs','Food','1308',1.000,1,5.00,'hot_sour_soup_veg.jpg',NULL,NULL,90.00,NULL,NULL,5.00,5.00,0.00,94.50,3),(308,'Paneer Bhurji','Scrambled paneer with spices','paneer_bhurji',3,'plate',1.000,'pcs','Food','1309',1.000,1,5.00,'paneer_bhurji.jpg',NULL,NULL,140.00,NULL,NULL,5.00,5.00,0.00,147.00,3),(309,'Mushroom Do Pyaza','Mushrooms with double onions','mushroom_do_pyaza',3,'plate',1.000,'pcs','Food','1310',1.000,1,5.00,'mushroom_do_pyaza.jpg',NULL,NULL,150.00,NULL,NULL,5.00,5.00,0.00,157.50,3),(310,'Veg Kofta Curry','Vegetable dumplings in tomato-onion gravy','veg_kofta_curry',3,'plate',1.000,'pcs','Food','1311',1.000,1,5.00,'veg_kofta_curry.jpg',NULL,NULL,160.00,NULL,NULL,5.00,5.00,0.00,168.00,3),(311,'Tawa Chapati','Soft whole wheat chapati','tawa_chapati',3,'piece',1.000,'pcs','Food','1312',1.000,1,5.00,'tawa_chapati.jpg',NULL,NULL,18.00,NULL,NULL,5.00,5.00,0.00,18.90,3),(312,'Veg Hyderabadi','Spicy Hyderabadi-style mixed veg curry','veg_hyderabadi',3,'plate',1.000,'pcs','Food','1313',1.000,1,5.00,'veg_hyderabadi.jpg',NULL,NULL,155.00,NULL,NULL,5.00,5.00,0.00,162.75,3);
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `menu_id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `is_festival` tinyint(1) NOT NULL DEFAULT '0',
  `is_released` tinyint(1) NOT NULL DEFAULT '0',
  `period_type` enum('one_day','subscription','all_days') DEFAULT NULL,
  `bld_id` int NOT NULL,
  `is_production_generated` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`menu_id`),
  KEY `fk_menu_bld` (`bld_id`),
  CONSTRAINT `fk_menu_bld` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES (1,'2025-03-08',0,0,NULL,1,0),(2,'2025-03-08',0,0,NULL,2,0),(3,'2025-03-08',0,0,NULL,3,0),(4,'2025-06-15',0,0,'one_day',1,0),(5,'2025-06-16',0,0,'one_day',1,0),(6,'2025-06-15',0,0,'subscription',2,0),(7,'2025-06-18',1,0,NULL,1,0),(8,'2025-06-02',0,0,'one_day',1,0),(10,'2025-07-24',0,0,'one_day',2,0),(11,'2025-07-02',0,0,'one_day',1,0),(12,'2025-07-01',0,0,'one_day',1,0),(13,'2025-07-30',0,0,'one_day',1,0),(14,'2025-07-29',0,0,'one_day',1,0),(15,'2025-08-19',0,0,'one_day',2,0),(16,'2025-06-04',0,0,'one_day',1,0),(17,'2025-06-04',0,0,'one_day',3,0),(18,'2025-06-09',0,0,'one_day',1,0),(19,'2025-07-14',0,0,'one_day',1,0),(20,'2025-07-05',0,0,'one_day',1,0),(21,'2025-08-04',0,0,'one_day',1,0),(22,'2025-08-05',0,0,'one_day',1,0),(23,'2025-08-06',0,0,'one_day',1,0),(24,'2025-10-06',0,1,'one_day',1,0),(25,'2025-10-06',0,1,'one_day',2,0),(26,'2025-10-08',0,1,'one_day',2,0),(27,'2025-10-08',0,1,'one_day',3,0),(28,'2025-10-15',0,1,'one_day',1,0),(29,'2025-10-16',0,1,'one_day',1,1),(30,'2025-10-16',0,1,'one_day',2,0),(31,'2025-10-17',0,1,'one_day',1,1),(32,'2025-10-17',0,1,'one_day',2,1),(33,'2025-10-17',0,1,'one_day',3,1),(34,'2025-10-18',0,1,'one_day',1,1),(35,'2025-10-18',0,1,'one_day',3,1),(36,'2025-10-21',0,1,'one_day',1,1),(37,'2025-10-21',0,0,'one_day',2,0),(38,'2025-10-21',0,0,'one_day',3,0),(39,'2025-10-21',0,1,'one_day',4,0),(40,'2025-10-22',0,1,'one_day',1,1),(41,'2025-10-23',0,1,'one_day',1,1),(42,'2025-10-23',0,1,'one_day',2,1),(43,'2025-10-23',0,1,'one_day',3,1),(47,'2025-10-25',0,1,NULL,1,0),(48,'2025-10-25',0,1,NULL,2,0),(49,'2025-10-25',0,0,NULL,3,0);
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `menu_item_id` int NOT NULL AUTO_INCREMENT,
  `menu_id` int NOT NULL,
  `item_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `planned_qty` int DEFAULT NULL,
  `rate` decimal(10,2) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int DEFAULT NULL,
  `available_qty` int NOT NULL DEFAULT '0',
  `buffer_qty` decimal(10,2) DEFAULT '0.00',
  `final_qty` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`menu_item_id`),
  KEY `menu_id` (`menu_id`),
  KEY `item_id` (`item_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`menu_id`),
  CONSTRAINT `menu_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `menu_items_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1034 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,1,1,1,50,30.00,1,1,0,0.00,0.00),(2,1,2,1,40,50.00,1,2,0,0.00,0.00),(3,2,3,1,60,80.00,1,1,0,0.00,0.00),(4,2,4,2,50,90.00,1,2,0,0.00,0.00),(13,6,4,3,80,120.00,1,1,0,0.00,0.00),(14,6,5,3,60,150.00,0,2,0,0.00,0.00),(15,7,6,4,50,140.00,1,1,0,0.00,0.00),(16,7,7,4,30,100.00,0,2,0,0.00,0.00),(25,8,1,1,12,31.50,0,1,0,0.00,0.00),(26,8,2,1,1,52.50,0,1,0,0.00,0.00),(27,8,5,1,1,44.00,0,1,0,0.00,0.00),(53,10,3,1,1,84.00,0,1,0,0.00,0.00),(54,10,29,2,1,165.00,0,1,0,0.00,0.00),(55,10,30,2,1,176.00,0,1,0,0.00,0.00),(56,10,4,2,1,94.50,0,1,0,0.00,0.00),(57,11,1,1,1,31.50,0,1,0,0.00,0.00),(58,11,2,1,1,52.50,0,1,0,0.00,0.00),(59,11,5,1,1,44.00,0,1,0,0.00,0.00),(60,5,1,2,100,30.00,1,1,0,0.00,0.00),(61,5,2,2,50,40.00,0,2,0,0.00,0.00),(62,12,1,1,1,31.50,0,1,0,0.00,0.00),(63,12,2,1,1,52.50,0,1,0,0.00,0.00),(64,12,7,1,1,38.50,0,1,0,0.00,0.00),(65,13,1,1,1555,31.50,0,1,0,0.00,0.00),(66,14,2,1,444,52.50,0,1,0,0.00,0.00),(67,15,3,1,33,84.00,0,1,0,0.00,0.00),(68,15,4,2,1,94.50,0,1,0,0.00,0.00),(71,4,1,2,3000,30.00,1,1,0,0.00,0.00),(72,4,2,2,50,40.00,0,2,0,0.00,0.00),(91,17,9,1,10,44.00,0,1,10,0.00,0.00),(92,16,1,1,19,31.50,0,1,22,0.00,0.00),(93,16,2,1,27,52.50,0,2,17,0.00,0.00),(94,16,6,1,6,49.50,0,3,6,0.00,0.00),(95,18,1,1,50,31.50,0,1,50,0.00,0.00),(96,18,5,1,1,44.00,0,1,1,0.00,0.00),(97,18,27,1,1,66.00,0,1,1,0.00,0.00),(129,20,1,1,10,31.50,0,1,1,0.00,0.00),(130,20,8,1,10,55.00,0,1,1,0.00,0.00),(131,20,14,1,10,60.50,0,1,1,0.00,0.00),(132,20,15,1,10,44.00,0,1,1,0.00,0.00),(139,19,2,1,7,52.50,0,1,7,0.00,0.00),(140,19,8,1,0,55.00,0,1,0,0.00,0.00),(141,19,13,1,3,71.50,0,1,3,0.00,0.00),(142,21,1,1,100,31.50,0,1,100,0.00,0.00),(143,21,2,1,1,52.50,0,1,1,0.00,0.00),(144,22,1,1,1,31.50,0,1,1,0.00,0.00),(146,23,1,1,1,31.50,0,1,1,0.00,0.00),(224,24,2,1,7,52.50,0,1,7,0.00,0.00),(225,24,8,1,5,55.00,0,1,5,0.00,0.00),(226,24,13,1,4,71.50,0,1,4,0.00,0.00),(227,24,17,1,3,55.00,0,1,3,0.00,0.00),(235,25,36,2,10,143.00,0,1,10,0.00,0.00),(236,25,40,2,8,110.00,0,1,8,0.00,0.00),(237,25,48,2,10,33.00,0,1,10,0.00,0.00),(238,25,41,2,91,22.00,0,1,91,0.00,0.00),(239,25,212,2,99,105.00,0,1,99,0.00,0.00),(240,25,46,2,33,121.00,0,1,33,0.00,0.00),(241,25,50,2,13,66.00,0,1,13,0.00,0.00),(254,26,4,2,100,94.50,0,1,0,0.00,0.00),(255,26,36,2,50,143.00,0,1,50,0.00,0.00),(256,26,48,2,50,33.00,0,1,50,0.00,0.00),(257,26,41,2,100,22.00,0,1,100,0.00,0.00),(268,27,301,3,50,136.50,0,1,50,0.00,0.00),(269,27,305,3,50,115.50,0,1,50,0.00,0.00),(270,27,309,3,25,157.50,0,1,25,0.00,0.00),(271,27,310,3,50,168.00,0,1,50,0.00,0.00),(272,27,302,3,50,126.00,0,5,50,0.00,0.00),(273,27,311,3,100,18.90,0,5,100,0.00,0.00),(286,28,10,1,100,55.00,0,1,0,0.00,0.00),(287,28,14,1,50,60.50,0,1,50,0.00,0.00),(288,28,18,1,45,49.50,0,1,45,0.00,0.00),(313,29,8,1,200,55.00,0,1,0,0.00,0.00),(314,29,13,1,150,71.50,0,1,150,0.00,0.00),(315,29,17,1,50,55.00,0,1,50,0.00,0.00),(321,30,36,2,150,143.00,0,1,150,0.00,0.00),(322,30,40,2,100,110.00,0,1,100,0.00,0.00),(323,30,48,2,50,33.00,0,1,50,0.00,0.00),(324,30,37,2,100,132.00,0,1,100,0.00,0.00),(325,30,31,2,50,187.00,0,1,50,0.00,0.00),(349,32,3,1,150,84.00,0,1,146,30.00,180.00),(350,32,4,2,100,94.50,0,1,100,20.00,120.00),(352,33,9,1,200,44.00,0,1,199,20.00,220.00),(384,31,2,NULL,150,15.00,0,1,0,0.00,0.00),(385,31,3,NULL,100,30.00,0,2,100,0.00,0.00),(386,31,15,1,100,44.00,0,3,100,0.00,0.00),(387,31,19,1,100,55.00,0,3,100,0.00,0.00),(388,31,23,1,100,49.50,0,3,100,0.00,0.00),(389,31,27,1,100,66.00,0,3,100,0.00,0.00),(390,31,8,1,100,55.00,0,7,100,0.00,0.00),(397,34,2,1,110,52.50,0,1,96,10.00,120.00),(398,34,1,1,150,31.50,0,2,148,15.00,165.00),(399,34,12,1,200,77.00,0,3,200,20.00,220.00),(404,35,305,3,14,115.50,0,1,14,1.00,15.00),(405,35,301,3,21,136.50,0,2,21,1.00,22.00),(406,35,9,1,144,44.00,0,3,144,7.00,151.00),(407,35,304,3,15,157.50,0,4,15,1.00,16.00),(473,37,41,2,1,22.00,0,1,1,0.00,0.00),(474,37,45,2,1,110.00,0,2,1,0.00,0.00),(475,37,49,2,1,44.00,0,3,1,0.00,0.00),(476,37,53,2,1,99.00,0,4,1,0.00,0.00),(479,38,310,3,1,168.00,0,1,1,0.00,0.00),(480,38,311,3,1,18.90,0,2,1,0.00,0.00),(557,36,23,1,100,49.50,0,1,100,0.00,0.00),(558,36,20,1,50,44.00,0,2,50,0.00,0.00),(559,36,16,1,150,66.00,0,3,150,0.00,0.00),(560,36,6,1,50,49.50,0,4,50,0.00,0.00),(561,36,5,1,50,44.00,0,5,50,0.00,0.00),(562,36,1,1,150,31.50,0,6,150,0.00,0.00),(563,36,2,1,75,52.50,0,7,75,0.00,0.00),(564,36,18,1,1,49.50,0,8,1,0.00,0.00),(571,40,8,1,21,55.00,0,1,0,0.00,21.00),(572,40,13,1,1,71.50,0,2,18,0.00,1.00),(573,40,17,1,1,55.00,0,3,47,0.00,1.00),(574,40,21,1,1,60.50,0,4,41,0.00,1.00),(575,40,6,1,1,49.50,0,5,493,0.00,1.00),(576,40,10,1,1,55.00,0,6,48,0.00,1.00),(601,41,8,1,100,55.00,0,1,100,0.00,100.00),(602,41,13,1,100,71.50,0,2,100,0.00,100.00),(603,41,17,1,95,55.00,0,3,95,0.00,95.00),(607,42,41,2,110,22.00,0,1,100,10.00,110.00),(608,42,33,2,110,143.00,0,2,100,10.00,110.00),(609,42,37,2,105,132.00,0,3,95,10.00,105.00),(612,43,309,3,105,157.50,0,1,100,5.00,105.00),(613,43,310,3,89,168.00,0,2,85,4.00,89.00),(696,47,19,1,50,50.00,1,1,50,0.00,0.00),(697,47,13,1,50,65.00,1,2,50,0.00,0.00),(698,47,12,1,50,70.00,1,3,50,0.00,0.00),(699,47,14,1,50,55.00,1,4,50,0.00,0.00),(700,47,2,1,50,50.00,1,5,50,0.00,0.00),(701,47,17,1,50,50.00,1,6,50,0.00,0.00),(702,47,1,1,50,30.00,1,7,50,0.00,0.00),(703,47,20,1,50,40.00,1,8,50,0.00,0.00),(704,47,10,1,50,50.00,1,9,50,0.00,0.00),(705,47,16,1,50,60.00,1,10,50,0.00,0.00),(706,47,7,1,50,35.00,1,11,50,0.00,0.00),(707,47,22,1,50,60.00,1,12,50,0.00,0.00),(708,47,26,1,50,35.00,1,13,50,0.00,0.00),(709,47,8,1,50,50.00,1,14,50,0.00,0.00),(710,47,6,1,50,45.00,1,15,50,0.00,0.00),(711,47,15,1,50,40.00,1,16,50,0.00,0.00),(712,47,18,1,50,45.00,1,17,50,0.00,0.00),(713,47,21,1,50,55.00,1,18,50,0.00,0.00),(714,47,23,1,50,45.00,1,19,50,0.00,0.00),(715,47,24,1,50,40.00,1,20,50,0.00,0.00),(716,47,11,1,50,60.00,1,21,50,0.00,0.00),(717,47,27,1,50,60.00,1,22,50,0.00,0.00),(718,47,5,1,50,40.00,1,23,50,0.00,0.00),(719,47,28,1,50,70.00,1,24,50,0.00,0.00),(720,47,25,1,50,65.00,1,25,50,0.00,0.00),(721,48,40,2,80,100.00,1,1,80,0.00,0.00),(722,48,212,2,80,100.00,1,2,80,0.00,0.00),(723,48,34,2,80,80.00,1,3,80,0.00,0.00),(724,48,203,2,80,120.00,1,4,80,0.00,0.00),(725,48,39,2,80,120.00,1,5,80,0.00,0.00),(726,48,4,2,80,90.00,1,6,80,0.00,0.00),(727,48,33,2,80,130.00,1,7,80,0.00,0.00),(728,48,47,2,80,80.00,1,8,80,0.00,0.00),(729,48,32,2,80,140.00,1,9,80,0.00,0.00),(730,48,210,2,80,120.00,1,10,80,0.00,0.00),(731,48,54,2,80,140.00,1,11,80,0.00,0.00),(732,48,35,2,80,80.00,1,12,80,0.00,0.00),(733,48,53,2,80,90.00,1,13,80,0.00,0.00),(734,48,205,2,80,90.00,1,14,80,0.00,0.00),(735,48,201,2,80,160.00,1,15,80,0.00,0.00),(736,48,38,2,80,110.00,1,16,80,0.00,0.00),(737,48,207,2,80,35.00,1,17,80,0.00,0.00),(738,48,31,2,80,170.00,1,18,80,0.00,0.00),(739,48,202,2,80,150.00,1,19,80,0.00,0.00),(740,48,36,2,80,130.00,1,20,80,0.00,0.00),(741,48,209,2,80,180.00,1,21,80,0.00,0.00),(742,48,211,2,80,160.00,1,22,80,0.00,0.00),(743,48,42,2,80,30.00,1,23,80,0.00,0.00),(744,48,29,2,80,150.00,1,24,80,0.00,0.00),(745,48,30,2,80,160.00,1,25,80,0.00,0.00),(746,48,208,2,80,140.00,1,26,80,0.00,0.00),(747,48,44,2,80,120.00,1,27,80,0.00,0.00),(748,48,37,2,80,120.00,1,28,80,0.00,0.00),(749,48,3,1,80,80.00,1,29,80,0.00,0.00),(750,48,48,2,80,30.00,1,30,80,0.00,0.00),(751,48,51,2,80,50.00,1,31,80,0.00,0.00),(752,48,41,2,80,20.00,1,32,80,0.00,0.00),(753,48,43,2,80,150.00,1,33,80,0.00,0.00),(754,48,49,2,80,40.00,1,34,80,0.00,0.00),(755,48,45,2,80,100.00,1,35,80,0.00,0.00),(756,48,46,2,80,110.00,1,36,80,0.00,0.00),(757,48,204,2,80,130.00,1,37,80,0.00,0.00),(758,48,52,2,80,120.00,1,38,80,0.00,0.00),(759,48,206,2,80,110.00,1,39,80,0.00,0.00),(760,48,50,2,80,60.00,1,40,80,0.00,0.00),(761,49,9,1,60,44.00,1,1,60,0.00,0.00),(762,49,305,3,60,110.00,1,2,60,0.00,0.00),(763,49,302,3,60,120.00,1,3,60,0.00,0.00),(764,49,307,3,60,90.00,1,4,60,0.00,0.00),(765,49,306,3,60,50.00,1,5,60,0.00,0.00),(766,49,309,3,60,150.00,1,6,60,0.00,0.00),(767,49,308,3,60,140.00,1,7,60,0.00,0.00),(768,49,303,3,60,170.00,1,8,60,0.00,0.00),(769,49,311,3,60,18.00,1,9,60,0.00,0.00),(770,49,304,3,60,150.00,1,10,60,0.00,0.00),(771,49,312,3,60,155.00,1,11,60,0.00,0.00),(772,49,310,3,60,160.00,1,12,60,0.00,0.00),(773,49,301,3,60,130.00,1,13,60,0.00,0.00);
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (4,5,1,2,60.00),(5,6,3,1,80.00),(6,5,1,2,60.00),(7,6,3,1,80.00),(8,9,2,2,15.00),(9,9,3,2,84.00),(10,9,9,1,44.00),(11,10,2,1,15.00),(12,10,3,2,84.00),(13,11,2,4,52.50),(14,11,1,2,31.50),(15,12,21,1,60.50),(16,12,6,1,49.50),(17,13,13,1,71.50),(18,13,8,1,55.00),(19,13,17,1,55.00),(20,13,10,1,55.00),(21,14,21,2,60.50),(22,15,6,3,49.50),(23,16,17,3,55.00),(24,17,21,2,60.50),(25,18,8,1,55.00),(26,19,21,1,60.50),(27,20,6,2,49.50),(28,21,10,2,55.00),(29,22,21,1,60.50),(30,23,6,1,49.50),(31,24,21,1,60.50),(32,25,21,1,60.50),(33,26,21,1,60.50),(34,27,6,1,49.50),(35,28,8,5,55.00),(36,29,8,14,55.00),(37,29,13,26,71.50);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `address_id` int NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `payment_method` varchar(50) NOT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `order_type` varchar(50) DEFAULT 'one_time',
  `paid` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `address_id` (`address_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (5,25,13,110.00,'Pending','Cash',0.00,'2025-03-07 19:11:31','one_time',0),(6,26,14,90.00,'Completed','UPI',10.00,'2025-03-07 19:11:31','one_time',1),(9,13,5,242.00,'Completed','Cash',0.00,'2025-10-17 04:06:38','one_time',NULL),(10,13,5,183.00,'Pending','Cash',0.00,'2025-10-17 04:34:50','one_time',NULL),(11,25,13,273.00,'Pending','Cash',0.00,'2025-10-18 03:21:12','one_time',NULL),(12,13,5,110.00,'Pending','Cash',0.00,'2025-10-21 19:17:57','one_time',NULL),(13,13,5,236.50,'Pending','Cash',0.00,'2025-10-21 19:18:17','one_time',NULL),(14,13,5,121.00,'Pending','Cash',0.00,'2025-10-21 19:19:13','one_time',NULL),(15,13,5,148.50,'Pending','Cash',0.00,'2025-10-21 19:19:15','one_time',NULL),(16,13,5,165.00,'Pending','Cash',0.00,'2025-10-21 19:19:18','one_time',NULL),(17,13,5,121.00,'Pending','Cash',0.00,'2025-10-21 19:19:28','one_time',NULL),(18,13,5,55.00,'Pending','Cash',0.00,'2025-10-21 19:19:38','one_time',NULL),(19,13,5,60.50,'Pending','Cash',0.00,'2025-10-21 19:19:40','one_time',NULL),(20,13,5,99.00,'Pending','Cash',0.00,'2025-10-21 19:19:42','one_time',NULL),(21,13,5,110.00,'Pending','Cash',0.00,'2025-10-21 19:19:44','one_time',NULL),(22,13,5,60.50,'Pending','Cash',0.00,'2025-10-21 19:19:46','one_time',NULL),(23,13,5,49.50,'Pending','Cash',0.00,'2025-10-21 19:19:48','one_time',NULL),(24,13,5,60.50,'Completed','Cash',0.00,'2025-10-21 19:19:50','one_time',NULL),(25,13,5,60.50,'In Progress','Cash',0.00,'2025-10-21 19:19:52','one_time',NULL),(26,13,5,60.50,'Pending','Cash',0.00,'2025-10-21 19:19:54','one_time',NULL),(27,13,5,49.50,'In Progress','Cash',0.00,'2025-10-21 19:19:57','one_time',NULL),(28,25,13,275.00,'Pending','Cash',0.00,'2025-10-21 19:38:37','one_time',NULL),(29,13,5,2629.00,'Pending','Cash',0.00,'2025-10-22 03:50:14','one_time',NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'kk_v1'
--

--
-- Final view structure for view `customer_orders_view`
--

/*!50001 DROP VIEW IF EXISTS `customer_orders_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `customer_orders_view` AS select `c`.`customer_id` AS `customer_id`,`c`.`name` AS `customer_name`,`c`.`primary_mobile` AS `customer_phone`,`c`.`email` AS `customer_email`,`a`.`written_address` AS `address`,count(`o`.`order_id`) AS `no_of_orders` from ((`customers` `c` left join `addresses` `a` on(((`c`.`customer_id` = `a`.`customer_id`) and (`a`.`is_default` = true)))) left join `orders` `o` on((`c`.`customer_id` = `o`.`customer_id`))) group by `c`.`customer_id`,`c`.`name`,`c`.`primary_mobile`,`c`.`email`,`a`.`written_address` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-24 14:22:41
