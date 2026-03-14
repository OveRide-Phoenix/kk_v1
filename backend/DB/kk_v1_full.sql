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
-- Current Database: `kk_v1`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kk_v1` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kk_v1`;

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
  `city_code` varchar(3) NOT NULL DEFAULT 'MYS',
  `pin_code` varchar(10) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `address_type` varchar(50) DEFAULT NULL,
  `route_assignment` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`address_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (5,13,'#23, Gowri Mane','Chamundipuram, Near GTR, Mysuru-76','Mysore','MYS','560076',12.28906891,76.65058537,'Home',NULL,1),(13,25,'A-1033','123 MG Road, Bangalore','Bangalore','BLR','560001',12.97160000,77.59460000,'Home','Route1',1),(14,26,'B-202','456 Residency Road, Bangalore','Bangalore','BLR','600001',13.08270000,80.27070000,'Work','Route2',1),(43,25,'B-202','2nd adddress of satish','Bangalore','BLR','560025',12.97350000,77.60900000,'Work','Route2',0),(44,25,'D-404','12 JP Nagar, Mysore','Mysore','MYS','560078',12.90630000,77.58500000,'Home 2','Route4',0),(45,25,'C-303','789 Indiranagar Main Road, Bangalore','Bangalore','BLR','560038',12.97890000,77.64120000,'Other','Route3',0),(46,64,'#37','3rd Cross, 10th Main, Adarsha Layout, Jnana Jyothi Nagar - BLR 560056','Bangalore','BLR','560056',0.00000000,0.00000000,'Home',NULL,1),(47,25,'#3','chamundipuram - mys','Mysore','MYS','560001',12.97160000,77.59460000,'Home Mys',NULL,0),(48,13,'#23, Gowri Mane','Your Bangalore address line…','Bangalore','BLR','560001',12.97159870,77.59456600,'Home',NULL,0),(49,65,'123','Test St','Mysore','MYS','570001',0.00000000,0.00000000,'Home',NULL,1),(50,66,'#3','#3, Nanda Gokulum, Mysore','Mysore','MYS','570016',12.32843545,76.89721493,'Home',NULL,1);
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
  KEY `admin_id` (`admin_id`)
) ENGINE=InnoDB AUTO_INCREMENT=715 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_logs`
--

LOCK TABLES `admin_logs` WRITE;
/*!40000 ALTER TABLE `admin_logs` DISABLE KEYS */;
INSERT INTO `admin_logs` VALUES (7,5,'UPDATE','ITEM',40,'Menu unreleased','2025-10-21 17:39:55'),(8,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 5 items','2025-10-21 17:40:05'),(9,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 5 items','2025-10-21 17:40:08'),(10,5,'UPDATE','ITEM',40,'Menu released','2025-10-21 17:40:08'),(11,5,'UPDATE','ITEM',36,'Menu unreleased','2025-10-21 17:40:21'),(12,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 9 items','2025-10-21 17:40:27'),(13,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 9 items','2025-10-21 17:40:31'),(14,5,'UPDATE','ITEM',36,'Menu released','2025-10-21 17:40:31'),(15,5,'UPDATE','ITEM',40,'Menu unreleased','2025-10-21 17:50:17'),(16,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-21 17:50:22'),(17,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-21 17:50:23'),(18,5,'UPDATE','ITEM',40,'Menu released','2025-10-21 17:50:23'),(19,5,'UPDATE','ITEM',36,'Menu unreleased','2025-10-21 17:53:33'),(20,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 7 items','2025-10-21 17:53:41'),(21,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 7 items','2025-10-21 17:53:43'),(22,5,'UPDATE','ITEM',36,'Menu released','2025-10-21 17:53:43'),(23,5,'UPDATE','ITEM',36,'Menu unreleased','2025-10-21 17:56:35'),(24,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 8 items','2025-10-21 17:56:39'),(25,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 8 items','2025-10-21 17:56:45'),(26,5,'UPDATE','ITEM',36,'Upserted menu for 2025-10-21 (breakfast) with 8 items','2025-10-21 17:56:48'),(27,5,'UPDATE','ITEM',36,'Menu released','2025-10-21 17:56:48'),(28,5,'UPDATE','ITEM',40,'Menu unreleased','2025-10-22 00:48:49'),(29,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-22 00:49:07'),(30,5,'UPDATE','ITEM',40,'Upserted menu for 2025-10-22 (breakfast) with 6 items','2025-10-22 00:49:07'),(31,5,'UPDATE','ITEM',40,'Menu released','2025-10-22 00:49:07'),(32,5,'UPDATE','ITEM',40,'Generated production plan for 2025-10-22 (Breakfast)','2025-10-22 09:20:57'),(33,5,'UPDATE','ITEM',40,'Adjusted planned quantities for 2025-10-22 (Breakfast)','2025-10-22 09:21:12'),(34,5,'UPDATE','ITEM',40,'Generated production plan for 2025-10-22 (Breakfast)','2025-10-22 09:21:13'),(35,5,'ADD','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:50:52'),(36,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:50:52'),(37,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 10:50:52'),(38,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 10:50:58'),(39,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 10:51:05'),(40,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:13'),(41,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:14'),(42,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 10:51:14'),(43,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 10:51:29'),(44,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:40'),(45,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:44'),(46,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 10:51:44'),(47,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 10:51:44'),(48,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 11:16:13'),(49,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 0 items','2025-10-23 11:16:15'),(50,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 11:16:15'),(51,5,'UPDATE','ITEM',41,'Menu unreleased','2025-10-23 11:16:21'),(52,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 11:16:30'),(53,5,'UPDATE','ITEM',41,'Upserted menu for 2025-10-23 (breakfast) with 3 items','2025-10-23 11:16:31'),(54,5,'UPDATE','ITEM',41,'Menu released','2025-10-23 11:16:31'),(55,5,'ADD','ITEM',42,'Upserted menu for 2025-10-23 (lunch) with 3 items','2025-10-23 11:16:54'),(56,5,'UPDATE','ITEM',42,'Upserted menu for 2025-10-23 (lunch) with 3 items','2025-10-23 11:16:55'),(57,5,'UPDATE','ITEM',42,'Menu released','2025-10-23 11:16:55'),(58,5,'UPDATE','ITEM',42,'Generated production plan for 2025-10-23 (Lunch)','2025-10-23 11:17:13'),(59,5,'ADD','ITEM',43,'Upserted menu for 2025-10-23 (dinner) with 2 items','2025-10-23 11:17:25'),(60,5,'UPDATE','ITEM',43,'Upserted menu for 2025-10-23 (dinner) with 2 items','2025-10-23 11:17:26'),(61,5,'UPDATE','ITEM',43,'Menu released','2025-10-23 11:17:26'),(62,5,'UPDATE','ITEM',43,'Generated production plan for 2025-10-23 (Dinner)','2025-10-23 11:18:08'),(63,5,'UPDATE','ITEM',43,'Generated production plan for 2025-10-23 (Dinner)','2025-10-23 11:18:11'),(64,5,'UPDATE','ITEM',43,'Generated production plan for 2025-10-23 (Dinner)','2025-10-23 11:18:36'),(65,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:18:44'),(66,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:19:17'),(67,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:22:21'),(68,5,'UPDATE','ITEM',41,'Generated production plan for 2025-10-23 (Breakfast)','2025-10-23 11:22:56'),(69,5,'ADD','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 12:50:36'),(70,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 12:50:36'),(71,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 12:50:36'),(72,5,'UPDATE','ITEM',44,'Menu unreleased','2025-10-24 13:07:29'),(73,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:07:34'),(74,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:07:34'),(75,5,'UPDATE','ITEM',44,'Menu unreleased','2025-10-24 13:07:35'),(76,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:07:41'),(77,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:07:41'),(78,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:34:33'),(79,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:34:33'),(80,5,'ADD','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:34:33'),(81,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:34:33'),(82,5,'ADD','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:34:33'),(83,5,'ADD','ITEM',47,'Upserted menu for 2025-10-25 (Breakfast) with 25 items','2025-10-24 13:35:05'),(84,5,'UPDATE','ITEM',47,'Menu released','2025-10-24 13:35:05'),(85,5,'ADD','ITEM',48,'Upserted menu for 2025-10-25 (Lunch) with 40 items','2025-10-24 13:35:05'),(86,5,'UPDATE','ITEM',48,'Menu released','2025-10-24 13:35:05'),(87,5,'ADD','ITEM',49,'Upserted menu for 2025-10-25 (Dinner) with 13 items','2025-10-24 13:35:06'),(88,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:35:42'),(89,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:35:42'),(90,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:35:42'),(91,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:35:42'),(92,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:35:42'),(93,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:36:14'),(94,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (breakfast) with 1 items','2025-10-24 13:36:17'),(95,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:36:17'),(96,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:37:17'),(97,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:37:17'),(98,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:37:17'),(99,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:37:17'),(100,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:37:17'),(101,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 25 items','2025-10-24 13:40:14'),(102,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:40:14'),(103,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 40 items','2025-10-24 13:40:14'),(104,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:40:14'),(105,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 13 items','2025-10-24 13:40:14'),(106,5,'UPDATE','ITEM',44,'Upserted menu for 2025-10-24 (Breakfast) with 8 items','2025-10-24 13:42:00'),(107,5,'UPDATE','ITEM',44,'Menu released','2025-10-24 13:42:00'),(108,5,'UPDATE','ITEM',45,'Upserted menu for 2025-10-24 (Lunch) with 8 items','2025-10-24 13:42:00'),(109,5,'UPDATE','ITEM',45,'Menu released','2025-10-24 13:42:00'),(110,5,'UPDATE','ITEM',46,'Upserted menu for 2025-10-24 (Dinner) with 8 items','2025-10-24 13:42:00'),(111,5,'ADD','ITEM',50,'Upserted menu for 2025-10-24 (Breakfast) with 8 items','2025-10-24 14:41:07'),(112,5,'UPDATE','ITEM',50,'Menu released','2025-10-24 14:41:07'),(113,5,'ADD','ITEM',51,'Upserted menu for 2025-10-24 (Lunch) with 8 items','2025-10-24 14:41:07'),(114,5,'UPDATE','ITEM',51,'Menu released','2025-10-24 14:41:07'),(115,5,'ADD','ITEM',52,'Upserted menu for 2025-10-24 (Dinner) with 8 items','2025-10-24 14:41:07'),(116,5,'ADD','ITEM',53,'Upserted menu for 2025-10-24 (Breakfast) with 8 items','2025-10-24 14:41:15'),(117,5,'UPDATE','ITEM',53,'Menu released','2025-10-24 14:41:15'),(118,5,'ADD','ITEM',54,'Upserted menu for 2025-10-24 (Lunch) with 8 items','2025-10-24 14:41:15'),(119,5,'UPDATE','ITEM',54,'Menu released','2025-10-24 14:41:15'),(120,5,'ADD','ITEM',55,'Upserted menu for 2025-10-24 (Dinner) with 8 items','2025-10-24 14:41:15'),(121,5,'UPDATE','ITEM',53,'Menu unreleased','2025-10-24 17:46:28'),(122,5,'UPDATE','ITEM',53,'Upserted menu for 2025-10-24 (breakfast) with 8 items','2025-10-24 17:46:33'),(123,5,'UPDATE','ITEM',53,'Upserted menu for 2025-10-24 (breakfast) with 8 items','2025-10-24 17:46:33'),(124,5,'UPDATE','ITEM',53,'Menu released','2025-10-24 17:46:33'),(125,5,'UPDATE','ITEM',47,'Upserted menu for 2025-10-25 (breakfast) with 3 items','2025-10-24 17:48:57'),(126,5,'UPDATE','ITEM',47,'Upserted menu for 2025-10-25 (breakfast) with 3 items','2025-10-24 17:48:58'),(127,5,'UPDATE','ITEM',47,'Menu released','2025-10-24 17:48:58'),(128,5,'ADD','ITEM',56,'Upserted menu for 2025-10-24 (Breakfast) with 8 items','2025-10-24 17:49:38'),(129,5,'UPDATE','ITEM',56,'Menu released','2025-10-24 17:49:38'),(130,5,'ADD','ITEM',57,'Upserted menu for 2025-10-24 (Lunch) with 8 items','2025-10-24 17:49:38'),(131,5,'UPDATE','ITEM',57,'Menu released','2025-10-24 17:49:38'),(132,5,'ADD','ITEM',58,'Upserted menu for 2025-10-24 (Dinner) with 8 items','2025-10-24 17:49:38'),(133,5,'ADD','ITEM',59,'Upserted menu for 2025-10-24 (breakfast) with 2 items','2025-10-24 17:50:29'),(134,5,'UPDATE','ITEM',59,'Upserted menu for 2025-10-24 (breakfast) with 2 items','2025-10-24 17:50:55'),(135,5,'UPDATE','ITEM',59,'Upserted menu for 2025-10-24 (breakfast) with 2 items','2025-10-24 17:51:04'),(136,5,'UPDATE','ITEM',59,'Upserted menu for 2025-10-24 (breakfast) with 2 items','2025-10-24 17:51:18'),(137,5,'UPDATE','ITEM',59,'Menu released','2025-10-24 17:51:18'),(138,5,'UPDATE','ITEM',59,'Menu unreleased','2025-10-24 17:57:08'),(139,5,'UPDATE','ITEM',59,'Upserted menu for 2025-10-24 (breakfast) with 2 items','2025-10-24 17:57:34'),(140,5,'UPDATE','ITEM',59,'Menu released','2025-10-24 17:57:34'),(141,5,'ADD','ITEM',60,'Upserted menu for 2025-10-24 (Breakfast) with 8 items','2025-10-24 17:57:54'),(142,5,'UPDATE','ITEM',60,'Menu released','2025-10-24 17:57:54'),(143,5,'ADD','ITEM',61,'Upserted menu for 2025-10-24 (Lunch) with 8 items','2025-10-24 17:57:54'),(144,5,'UPDATE','ITEM',61,'Menu released','2025-10-24 17:57:54'),(145,5,'ADD','ITEM',62,'Upserted menu for 2025-10-24 (Dinner) with 8 items','2025-10-24 17:57:54'),(146,5,'UPDATE','ITEM',60,'Generated production plan for 2025-10-24 (Breakfast)','2025-10-24 18:01:31'),(147,5,'UPDATE','ITEM',60,'Generated production plan for 2025-10-24 (Breakfast)','2025-10-24 18:01:35'),(148,5,'UPDATE','ITEM',60,'Adjusted planned quantities for 2025-10-24 (Breakfast)','2025-10-24 18:02:37'),(149,5,'UPDATE','ITEM',60,'Adjusted planned quantities for 2025-10-24 (Breakfast)','2025-10-24 18:03:22'),(150,5,'UPDATE','ITEM',60,'Generated production plan for 2025-10-24 (Breakfast)','2025-10-24 18:05:02'),(151,5,'ADD','ITEM',63,'Upserted menu for 2025-10-24 (Breakfast) with 8 items','2025-10-24 18:08:15'),(152,5,'UPDATE','ITEM',63,'Menu released','2025-10-24 18:08:15'),(153,5,'ADD','ITEM',64,'Upserted menu for 2025-10-24 (Lunch) with 8 items','2025-10-24 18:08:15'),(154,5,'UPDATE','ITEM',64,'Menu released','2025-10-24 18:08:15'),(155,5,'ADD','ITEM',65,'Upserted menu for 2025-10-24 (Dinner) with 8 items','2025-10-24 18:08:15'),(156,5,'UPDATE','ITEM',63,'Menu unreleased','2025-10-24 18:13:24'),(157,5,'UPDATE','ITEM',63,'Upserted menu for 2025-10-24 (breakfast) with 10 items','2025-10-24 18:13:40'),(158,5,'UPDATE','ITEM',63,'Upserted menu for 2025-10-24 (breakfast) with 10 items','2025-10-24 18:13:41'),(159,5,'UPDATE','ITEM',63,'Menu released','2025-10-24 18:13:41'),(160,5,'UPDATE','ITEM',63,'Generated production plan for 2025-10-24 (Breakfast)','2025-10-24 18:14:38'),(161,5,'UPDATE','ITEM',63,'Generated production plan for 2025-10-24 (Breakfast)','2025-10-24 18:14:50'),(162,5,'UPDATE','ITEM',63,'Menu unreleased','2025-10-24 18:32:43'),(163,5,'UPDATE','ITEM',63,'Upserted menu for 2025-10-24 (breakfast) with 10 items','2025-10-24 18:33:13'),(164,5,'UPDATE','ITEM',63,'Menu released','2025-10-24 18:33:13'),(165,5,'UPDATE','ITEM',47,'Upserted menu for 2025-10-25 (Breakfast) with 8 items','2025-10-25 00:27:06'),(166,5,'UPDATE','ITEM',47,'Menu released','2025-10-25 00:27:06'),(167,5,'UPDATE','ITEM',48,'Upserted menu for 2025-10-25 (Lunch) with 8 items','2025-10-25 00:27:06'),(168,5,'UPDATE','ITEM',48,'Menu released','2025-10-25 00:27:06'),(169,5,'UPDATE','ITEM',49,'Upserted menu for 2025-10-25 (Dinner) with 8 items','2025-10-25 00:27:06'),(170,5,'ADD','ITEM',66,'Upserted menu for 2025-10-28 (Breakfast) with 8 items','2025-10-28 20:29:24'),(171,5,'UPDATE','ITEM',66,'Menu released','2025-10-28 20:29:24'),(172,5,'ADD','ITEM',67,'Upserted menu for 2025-10-28 (Lunch) with 8 items','2025-10-28 20:29:24'),(173,5,'UPDATE','ITEM',67,'Menu released','2025-10-28 20:29:24'),(174,5,'ADD','ITEM',68,'Upserted menu for 2025-10-28 (Dinner) with 8 items','2025-10-28 20:29:24'),(175,5,'UPDATE','ITEM',66,'Generated production plan for 2025-10-28 (Breakfast)','2025-10-28 20:29:29'),(176,5,'UPDATE','ITEM',67,'Generated production plan for 2025-10-28 (Lunch)','2025-10-28 20:29:31'),(177,5,'UPDATE','ITEM',66,'Menu unreleased','2025-10-28 20:45:20'),(178,5,'UPDATE','ITEM',66,'Upserted menu for 2025-10-28 (breakfast) with 8 items','2025-10-28 20:45:24'),(179,5,'UPDATE','ITEM',66,'Upserted menu for 2025-10-28 (breakfast) with 8 items','2025-10-28 20:45:24'),(180,5,'UPDATE','ITEM',66,'Menu released','2025-10-28 20:45:24'),(181,5,'ADD','ITEM',69,'Upserted menu for 2025-10-29 (Breakfast) with 8 items','2025-10-29 11:32:49'),(182,5,'UPDATE','ITEM',69,'Menu released','2025-10-29 11:32:49'),(183,5,'ADD','ITEM',70,'Upserted menu for 2025-10-29 (Lunch) with 8 items','2025-10-29 11:32:49'),(184,5,'UPDATE','ITEM',70,'Menu released','2025-10-29 11:32:49'),(185,5,'ADD','ITEM',71,'Upserted menu for 2025-10-29 (Dinner) with 8 items','2025-10-29 11:32:49'),(186,5,'UPDATE','ITEM',69,'Menu unreleased','2025-10-29 11:32:53'),(187,5,'UPDATE','ITEM',69,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 11:33:04'),(188,5,'UPDATE','ITEM',69,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 11:33:04'),(189,5,'UPDATE','ITEM',69,'Menu released','2025-10-29 11:33:04'),(190,5,'UPDATE','ITEM',69,'Menu unreleased','2025-10-29 18:24:46'),(191,5,'UPDATE','ITEM',69,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 18:24:49'),(192,5,'UPDATE','ITEM',69,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 18:24:50'),(193,5,'UPDATE','ITEM',69,'Menu released','2025-10-29 18:24:50'),(194,5,'ADD','ITEM',72,'Upserted menu for 2025-10-29 (Breakfast) with 8 items','2025-10-29 18:25:06'),(195,5,'UPDATE','ITEM',72,'Menu released','2025-10-29 18:25:06'),(196,5,'ADD','ITEM',73,'Upserted menu for 2025-10-29 (Lunch) with 8 items','2025-10-29 18:25:06'),(197,5,'UPDATE','ITEM',73,'Menu released','2025-10-29 18:25:06'),(198,5,'ADD','ITEM',74,'Upserted menu for 2025-10-29 (Dinner) with 8 items','2025-10-29 18:25:06'),(199,5,'UPDATE','ITEM',72,'Menu unreleased','2025-10-29 18:35:38'),(200,5,'UPDATE','ITEM',72,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 18:38:52'),(201,5,'UPDATE','ITEM',72,'Menu released','2025-10-29 18:38:52'),(202,5,'UPDATE','ITEM',73,'Menu unreleased','2025-10-29 18:38:54'),(203,5,'UPDATE','ITEM',73,'Upserted menu for 2025-10-29 (lunch) with 8 items','2025-10-29 18:39:01'),(204,5,'UPDATE','ITEM',73,'Menu released','2025-10-29 18:39:01'),(205,5,'UPDATE','ITEM',72,'Menu unreleased','2025-10-29 19:08:25'),(206,5,'UPDATE','ITEM',72,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 19:08:28'),(207,5,'UPDATE','ITEM',72,'Menu released','2025-10-29 19:08:28'),(208,5,'UPDATE','ITEM',72,'Menu unreleased','2025-10-29 19:10:14'),(209,5,'UPDATE','ITEM',72,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 19:10:21'),(210,5,'UPDATE','ITEM',72,'Menu released','2025-10-29 19:10:21'),(211,5,'UPDATE','ITEM',72,'Menu unreleased','2025-10-29 19:10:22'),(212,5,'UPDATE','ITEM',72,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 19:10:28'),(213,5,'UPDATE','ITEM',72,'Upserted menu for 2025-10-29 (breakfast) with 8 items','2025-10-29 19:10:29'),(214,5,'UPDATE','ITEM',72,'Menu released','2025-10-29 19:10:29'),(215,13,'ADD','ITEM',75,'Upserted menu for 2025-10-30 (Breakfast) with 8 items','2025-10-29 21:31:28'),(216,13,'UPDATE','ITEM',75,'Menu released','2025-10-29 21:31:28'),(217,13,'ADD','ITEM',76,'Upserted menu for 2025-10-30 (Lunch) with 8 items','2025-10-29 21:31:28'),(218,13,'UPDATE','ITEM',76,'Menu released','2025-10-29 21:31:28'),(219,13,'ADD','ITEM',77,'Upserted menu for 2025-10-30 (Dinner) with 8 items','2025-10-29 21:31:28'),(220,13,'UPDATE','ITEM',75,'Menu unreleased','2025-10-30 10:03:52'),(221,13,'UPDATE','ITEM',75,'Upserted menu for 2025-10-30 (breakfast) with 8 items','2025-10-30 10:03:56'),(222,13,'UPDATE','ITEM',75,'Upserted menu for 2025-10-30 (breakfast) with 8 items','2025-10-30 10:03:57'),(223,13,'UPDATE','ITEM',75,'Menu released','2025-10-30 10:03:57'),(224,13,'ADD','ITEM',78,'Upserted menu for 2025-10-31 (breakfast) with 4 items','2025-10-30 12:38:05'),(225,13,'UPDATE','ITEM',78,'Upserted menu for 2025-10-31 (breakfast) with 4 items','2025-10-30 12:38:10'),(226,13,'UPDATE','ITEM',78,'Menu released','2025-10-30 12:38:10'),(227,13,'UPDATE','ITEM',78,'Menu unreleased','2025-10-30 12:38:16'),(228,13,'UPDATE','ITEM',78,'Upserted menu for 2025-10-31 (breakfast) with 4 items','2025-10-30 12:41:15'),(229,13,'UPDATE','ITEM',78,'Upserted menu for 2025-10-31 (breakfast) with 4 items','2025-10-30 12:41:16'),(230,13,'UPDATE','ITEM',78,'Menu released','2025-10-30 12:41:16'),(231,13,'UPDATE','ITEM',78,'Generated production plan for 2025-10-31 (Breakfast)','2025-10-30 12:43:37'),(232,13,'UPDATE','ITEM',78,'Generated production plan for 2025-10-31 (Breakfast)','2025-10-30 12:43:41'),(233,13,'UPDATE','ITEM',77,'Upserted menu for 2025-10-30 (dinner) with 8 items','2025-10-30 12:43:57'),(234,13,'UPDATE','ITEM',77,'Menu released','2025-10-30 12:43:58'),(235,13,'UPDATE','ITEM',77,'Menu unreleased','2025-10-30 12:44:01'),(236,13,'ADD','ITEM',79,'Upserted menu for 2025-10-30 (Breakfast) with 8 items','2025-10-30 12:51:47'),(237,13,'UPDATE','ITEM',79,'Menu released','2025-10-30 12:51:47'),(238,13,'ADD','ITEM',80,'Upserted menu for 2025-10-30 (Lunch) with 8 items','2025-10-30 12:51:47'),(239,13,'UPDATE','ITEM',80,'Menu released','2025-10-30 12:51:47'),(240,13,'ADD','ITEM',81,'Upserted menu for 2025-10-30 (Dinner) with 8 items','2025-10-30 12:51:47'),(241,13,'ADD','ITEM',82,'Upserted menu for 2025-10-31 (Breakfast) with 8 items','2025-10-30 12:52:04'),(242,13,'UPDATE','ITEM',82,'Menu released','2025-10-30 12:52:04'),(243,13,'ADD','ITEM',83,'Upserted menu for 2025-10-31 (Lunch) with 8 items','2025-10-30 12:52:04'),(244,13,'UPDATE','ITEM',83,'Menu released','2025-10-30 12:52:04'),(245,13,'ADD','ITEM',84,'Upserted menu for 2025-10-31 (Dinner) with 8 items','2025-10-30 12:52:04'),(246,13,'ADD','ITEM',85,'Upserted menu for 2025-11-03 (Breakfast) with 8 items','2025-11-03 12:34:22'),(247,13,'UPDATE','ITEM',85,'Menu released','2025-11-03 12:34:22'),(248,13,'ADD','ITEM',86,'Upserted menu for 2025-11-03 (Lunch) with 8 items','2025-11-03 12:34:22'),(249,13,'UPDATE','ITEM',86,'Menu released','2025-11-03 12:34:22'),(250,13,'ADD','ITEM',87,'Upserted menu for 2025-11-03 (Dinner) with 8 items','2025-11-03 12:34:22'),(251,13,'UPDATE','ITEM',87,'Upserted menu for 2025-11-03 (dinner) with 8 items','2025-11-03 12:56:29'),(252,13,'UPDATE','ITEM',87,'Menu released','2025-11-03 12:56:29'),(253,13,'ADD','ITEM',88,'Upserted menu for 2025-11-03 (Breakfast) with 8 items','2025-11-03 13:05:03'),(254,13,'UPDATE','ITEM',88,'Menu released','2025-11-03 13:05:03'),(255,13,'ADD','ITEM',89,'Upserted menu for 2025-11-03 (Lunch) with 8 items','2025-11-03 13:05:03'),(256,13,'UPDATE','ITEM',89,'Menu released','2025-11-03 13:05:03'),(257,13,'ADD','ITEM',90,'Upserted menu for 2025-11-03 (Dinner) with 8 items','2025-11-03 13:05:03'),(258,13,'UPDATE','ITEM',90,'Upserted menu for 2025-11-03 (dinner) with 8 items','2025-11-03 13:05:10'),(259,13,'UPDATE','ITEM',90,'Menu released','2025-11-03 13:05:11'),(260,13,'UPDATE','ITEM',88,'Generated production plan for 2025-11-03 (Breakfast)','2025-11-03 13:05:35'),(261,13,'UPDATE','ITEM',89,'Generated production plan for 2025-11-03 (Lunch)','2025-11-03 13:05:40'),(262,13,'UPDATE','ITEM',90,'Generated production plan for 2025-11-03 (Dinner)','2025-11-03 13:05:41'),(263,13,'UPDATE','ITEM',88,'Generated production plan for 2025-11-03 (Breakfast)','2025-11-03 13:06:08'),(264,13,'ADD','ITEM',91,'Upserted menu for 2025-11-04 (Breakfast) with 8 items','2025-11-03 13:06:27'),(265,13,'UPDATE','ITEM',91,'Menu released','2025-11-03 13:06:27'),(266,13,'ADD','ITEM',92,'Upserted menu for 2025-11-04 (Lunch) with 8 items','2025-11-03 13:06:27'),(267,13,'UPDATE','ITEM',92,'Menu released','2025-11-03 13:06:27'),(268,13,'ADD','ITEM',93,'Upserted menu for 2025-11-04 (Dinner) with 8 items','2025-11-03 13:06:27'),(269,13,'UPDATE','ITEM',88,'Generated production plan for 2025-11-03 (Breakfast)','2025-11-03 13:06:36'),(270,13,'UPDATE','ITEM',91,'Generated production plan for 2025-11-04 (Breakfast)','2025-11-03 13:06:47'),(271,13,'UPDATE','ITEM',92,'Generated production plan for 2025-11-04 (Lunch)','2025-11-03 13:06:56'),(272,13,'UPDATE','ITEM',93,'Upserted menu for 2025-11-04 (dinner) with 8 items','2025-11-03 13:07:03'),(273,13,'UPDATE','ITEM',93,'Menu released','2025-11-03 13:07:03'),(274,13,'UPDATE','ITEM',88,'Menu unreleased','2025-11-03 13:35:30'),(275,13,'UPDATE','ITEM',88,'Upserted menu for 2025-11-03 (breakfast) with 8 items','2025-11-03 13:35:44'),(276,13,'UPDATE','ITEM',88,'Menu released','2025-11-03 13:35:44'),(277,13,'UPDATE','ITEM',89,'Menu unreleased','2025-11-03 13:35:46'),(278,13,'UPDATE','ITEM',89,'Upserted menu for 2025-11-03 (lunch) with 8 items','2025-11-03 13:36:09'),(279,13,'UPDATE','ITEM',89,'Upserted menu for 2025-11-03 (lunch) with 8 items','2025-11-03 13:36:12'),(280,13,'UPDATE','ITEM',89,'Menu released','2025-11-03 13:36:12'),(281,13,'UPDATE','ITEM',89,'Menu unreleased','2025-11-03 13:36:28'),(282,13,'UPDATE','ITEM',89,'Upserted menu for 2025-11-03 (lunch) with 8 items','2025-11-03 13:36:36'),(283,13,'UPDATE','ITEM',89,'Menu released','2025-11-03 13:36:36'),(284,13,'UPDATE','ITEM',89,'Menu unreleased','2025-11-03 13:38:16'),(285,13,'UPDATE','ITEM',89,'Upserted menu for 2025-11-03 (lunch) with 7 items','2025-11-03 13:38:17'),(286,13,'UPDATE','ITEM',89,'Upserted menu for 2025-11-03 (lunch) with 7 items','2025-11-03 13:38:24'),(287,13,'UPDATE','ITEM',89,'Menu released','2025-11-03 13:38:24'),(288,13,'UPDATE','ITEM',89,'Menu unreleased','2025-11-03 13:39:48'),(289,13,'UPDATE','ITEM',89,'Upserted menu for 2025-11-03 (lunch) with 8 items','2025-11-03 13:39:54'),(290,13,'UPDATE','ITEM',89,'Upserted menu for 2025-11-03 (lunch) with 8 items','2025-11-03 13:39:56'),(291,13,'UPDATE','ITEM',89,'Menu released','2025-11-03 13:39:56'),(292,13,'UPDATE','ITEM',88,'Menu unreleased','2025-11-03 13:43:57'),(293,13,'UPDATE','ITEM',88,'Upserted menu for 2025-11-03 (breakfast) with 9 items','2025-11-03 13:44:02'),(294,13,'UPDATE','ITEM',88,'Upserted menu for 2025-11-03 (breakfast) with 8 items','2025-11-03 13:44:21'),(295,13,'UPDATE','ITEM',88,'Upserted menu for 2025-11-03 (breakfast) with 8 items','2025-11-03 13:44:25'),(296,13,'UPDATE','ITEM',88,'Menu released','2025-11-03 13:44:25'),(297,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price','2025-11-03 13:58:18'),(298,13,'UPDATE','ITEM',88,'Menu unreleased','2025-11-03 13:58:37'),(299,13,'UPDATE','ITEM',88,'Upserted menu for 2025-11-03 (breakfast) with 8 items','2025-11-03 13:58:49'),(300,13,'UPDATE','ITEM',88,'Menu released','2025-11-03 13:58:49'),(301,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price','2025-11-03 14:10:30'),(302,13,'UPDATE','ITEM',88,'Menu unreleased','2025-11-03 14:10:36'),(303,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price','2025-11-03 14:12:28'),(304,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price','2025-11-03 14:16:03'),(305,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price','2025-11-03 14:25:51'),(306,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price','2025-11-03 14:28:13'),(307,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price','2025-11-03 14:28:24'),(308,13,'ADD','ITEM',94,'Upserted menu for 2025-11-08 (Breakfast) with 8 items','2025-11-08 06:46:11'),(309,13,'UPDATE','ITEM',94,'Menu released','2025-11-08 06:46:11'),(310,13,'ADD','ITEM',95,'Upserted menu for 2025-11-08 (Lunch) with 8 items','2025-11-08 06:46:11'),(311,13,'UPDATE','ITEM',95,'Menu released','2025-11-08 06:46:11'),(312,13,'ADD','ITEM',96,'Upserted menu for 2025-11-08 (Dinner) with 8 items','2025-11-08 06:46:11'),(313,13,'UPDATE','ITEM',94,'Generated production plan for 2025-11-08 (Breakfast)','2025-11-08 06:46:25'),(314,13,'UPDATE','ITEM',95,'Generated production plan for 2025-11-08 (Lunch)','2025-11-08 06:46:26'),(315,13,'UPDATE','ITEM',94,'Menu unreleased','2025-11-08 06:48:03'),(316,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price, bld_ids','2025-11-08 07:06:33'),(317,13,'UPDATE','ITEM',40,'Updated item 40: name, description, alias, category_id, uom, weight_factor, weight_uom, item_type, hsn_code, factor, quantity_portion, buffer_percentage, max_qty_breakfast, max_qty_lunch, max_qty_dinner, picture_url, breakfast_price, lunch_price, dinner_price, condiments_price, festival_price, cgst, sgst, igst, net_price, bld_ids','2025-11-08 07:06:47'),(318,13,'UPDATE','ITEM',94,'Upserted menu for 2025-11-08 (Breakfast) with 8 items','2025-11-08 07:07:03'),(319,13,'UPDATE','ITEM',94,'Menu released','2025-11-08 07:07:03'),(320,13,'UPDATE','ITEM',94,'Upserted menu for 2025-11-08 (Breakfast) with 8 items','2025-11-08 07:14:39'),(321,13,'UPDATE','ITEM',94,'Menu released','2025-11-08 07:14:39'),(322,13,'UPDATE','ITEM',95,'Upserted menu for 2025-11-08 (Lunch) with 8 items','2025-11-08 07:14:39'),(323,13,'UPDATE','ITEM',95,'Menu released','2025-11-08 07:14:39'),(324,13,'UPDATE','ITEM',96,'Upserted menu for 2025-11-08 (Dinner) with 8 items','2025-11-08 07:14:39'),(325,13,'ADD','ITEM',97,'Upserted menu for 2025-11-09 (Breakfast) with 8 items','2025-11-08 07:14:43'),(326,13,'UPDATE','ITEM',97,'Menu released','2025-11-08 07:14:43'),(327,13,'ADD','ITEM',98,'Upserted menu for 2025-11-09 (Lunch) with 8 items','2025-11-08 07:14:43'),(328,13,'UPDATE','ITEM',98,'Menu released','2025-11-08 07:14:43'),(329,13,'ADD','ITEM',99,'Upserted menu for 2025-11-09 (Dinner) with 8 items','2025-11-08 07:14:43'),(330,13,'ADD','ITEM',100,'Upserted menu for 2025-11-08 (Breakfast) with 8 items','2025-11-08 07:15:39'),(331,13,'UPDATE','ITEM',100,'Menu released','2025-11-08 07:15:39'),(332,13,'ADD','ITEM',101,'Upserted menu for 2025-11-08 (Lunch) with 8 items','2025-11-08 07:15:39'),(333,13,'UPDATE','ITEM',101,'Menu released','2025-11-08 07:15:39'),(334,13,'ADD','ITEM',102,'Upserted menu for 2025-11-08 (Dinner) with 8 items','2025-11-08 07:15:39'),(335,13,'UPDATE','ITEM',102,'Upserted menu for 2025-11-08 (Dinner) with 8 items','2025-11-08 07:15:57'),(336,13,'UPDATE','ITEM',102,'Upserted menu for 2025-11-08 (Dinner) with 8 items','2025-11-08 07:15:58'),(337,13,'UPDATE','ITEM',102,'Menu released','2025-11-08 07:15:58'),(338,13,'UPDATE','ITEM',102,'Menu unreleased','2025-11-08 07:16:00'),(339,13,'UPDATE','ITEM',102,'Upserted menu for 2025-11-08 (Dinner) with 8 items','2025-11-08 07:16:07'),(340,13,'UPDATE','ITEM',102,'Menu released','2025-11-08 07:16:07'),(341,13,'ADD','ITEM',103,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 11:25:05'),(342,13,'UPDATE','ITEM',103,'Menu released','2025-11-09 11:25:05'),(343,13,'ADD','ITEM',104,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 11:25:05'),(344,13,'UPDATE','ITEM',104,'Menu released','2025-11-09 11:25:05'),(345,13,'ADD','ITEM',105,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 11:25:05'),(346,13,'ADD','ITEM',106,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 11:54:13'),(347,13,'UPDATE','ITEM',106,'Menu released','2025-11-09 11:54:13'),(348,13,'ADD','ITEM',107,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 11:54:13'),(349,13,'UPDATE','ITEM',107,'Menu released','2025-11-09 11:54:13'),(350,13,'ADD','ITEM',108,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 11:54:13'),(351,13,'UPDATE','ITEM',106,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 11:54:23'),(352,13,'UPDATE','ITEM',107,'Generated production plan for 2025-11-09 MYS (Lunch)','2025-11-09 11:54:31'),(353,13,'UPDATE','ITEM',107,'Generated production plan for 2025-11-09 MYS (Lunch)','2025-11-09 11:54:32'),(354,13,'ADD','ITEM',109,'Upserted ONE_DAY menu for 2025-11-10 MYS (Breakfast) with 8 items','2025-11-09 11:59:39'),(355,13,'UPDATE','ITEM',109,'Menu released','2025-11-09 11:59:39'),(356,13,'ADD','ITEM',110,'Upserted ONE_DAY menu for 2025-11-10 MYS (Lunch) with 8 items','2025-11-09 11:59:39'),(357,13,'UPDATE','ITEM',110,'Menu released','2025-11-09 11:59:39'),(358,13,'ADD','ITEM',111,'Upserted ONE_DAY menu for 2025-11-10 MYS (Dinner) with 8 items','2025-11-09 11:59:39'),(359,13,'UPDATE','ITEM',109,'Generated production plan for 2025-11-10 MYS (Breakfast)','2025-11-09 11:59:58'),(360,13,'UPDATE','ITEM',106,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 12:14:53'),(361,13,'UPDATE','ITEM',106,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 13:49:21'),(362,13,'ADD','ITEM',112,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 13:49:42'),(363,13,'UPDATE','ITEM',112,'Menu released','2025-11-09 13:49:42'),(364,13,'ADD','ITEM',113,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 13:49:42'),(365,13,'UPDATE','ITEM',113,'Menu released','2025-11-09 13:49:42'),(366,13,'ADD','ITEM',114,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 13:49:42'),(367,13,'UPDATE','ITEM',112,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 13:52:05'),(368,13,'UPDATE','ITEM',113,'Generated production plan for 2025-11-09 MYS (Lunch)','2025-11-09 13:52:11'),(369,13,'UPDATE','ITEM',112,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 13:55:40'),(370,13,'ADD','ITEM',115,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 14:04:06'),(371,13,'UPDATE','ITEM',115,'Menu released','2025-11-09 14:04:06'),(372,13,'ADD','ITEM',116,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 14:04:06'),(373,13,'UPDATE','ITEM',116,'Menu released','2025-11-09 14:04:06'),(374,13,'ADD','ITEM',117,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 14:04:06'),(375,13,'ADD','ITEM',118,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 14:06:07'),(376,13,'UPDATE','ITEM',118,'Menu released','2025-11-09 14:06:07'),(377,13,'ADD','ITEM',119,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 14:06:07'),(378,13,'UPDATE','ITEM',119,'Menu released','2025-11-09 14:06:07'),(379,13,'ADD','ITEM',120,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 14:06:07'),(380,13,'UPDATE','ITEM',118,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:07:16'),(381,13,'UPDATE','ITEM',119,'Generated production plan for 2025-11-09 MYS (Lunch)','2025-11-09 14:07:31'),(382,13,'ADD','ITEM',121,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 14:07:55'),(383,13,'UPDATE','ITEM',121,'Menu released','2025-11-09 14:07:55'),(384,13,'ADD','ITEM',122,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 14:07:55'),(385,13,'UPDATE','ITEM',122,'Menu released','2025-11-09 14:07:55'),(386,13,'ADD','ITEM',123,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 14:07:55'),(387,13,'UPDATE','ITEM',121,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:10:30'),(388,13,'UPDATE','ITEM',121,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:10:35'),(389,13,'UPDATE','ITEM',121,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:10:38'),(390,13,'UPDATE','ITEM',121,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:10:42'),(391,13,'UPDATE','ITEM',121,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:10:45'),(392,13,'UPDATE','ITEM',121,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:10:47'),(393,13,'UPDATE','ITEM',121,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:11:52'),(394,13,'UPDATE','ITEM',121,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:11:56'),(395,13,'UPDATE','ITEM',121,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:13:41'),(396,13,'UPDATE','ITEM',121,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:13:43'),(397,13,'UPDATE','ITEM',121,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:14:01'),(398,13,'UPDATE','ITEM',121,'Generated production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 14:14:10'),(399,13,'ADD','ITEM',124,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 14:14:50'),(400,13,'UPDATE','ITEM',124,'Menu released','2025-11-09 14:14:50'),(401,13,'ADD','ITEM',125,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 14:14:50'),(402,13,'UPDATE','ITEM',125,'Menu released','2025-11-09 14:14:50'),(403,13,'ADD','ITEM',126,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 14:14:50'),(404,13,'ADD','ITEM',127,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 15:22:25'),(405,13,'UPDATE','ITEM',127,'Menu released','2025-11-09 15:22:25'),(406,13,'ADD','ITEM',128,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 15:22:25'),(407,13,'UPDATE','ITEM',128,'Menu released','2025-11-09 15:22:25'),(408,13,'ADD','ITEM',129,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 15:22:25'),(409,13,'UPDATE','ITEM',127,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:22:29'),(410,13,'UPDATE','ITEM',127,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:22:36'),(411,13,'UPDATE','ITEM',127,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:22:43'),(412,13,'UPDATE','ITEM',127,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:23:07'),(413,13,'UPDATE','ITEM',127,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:23:48'),(414,13,'UPDATE','ITEM',127,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:23:51'),(415,13,'UPDATE','ITEM',128,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:23:59'),(416,13,'UPDATE','ITEM',127,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:24:19'),(417,13,'UPDATE','ITEM',128,'Reopened production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:24:21'),(418,13,'ADD','ITEM',130,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 15:24:25'),(419,13,'UPDATE','ITEM',130,'Menu released','2025-11-09 15:24:25'),(420,13,'ADD','ITEM',131,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 15:24:25'),(421,13,'UPDATE','ITEM',131,'Menu released','2025-11-09 15:24:25'),(422,13,'ADD','ITEM',132,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 15:24:25'),(423,13,'UPDATE','ITEM',130,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:27:19'),(424,13,'UPDATE','ITEM',130,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:27:20'),(425,13,'UPDATE','ITEM',130,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:27:24'),(426,13,'UPDATE','ITEM',130,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:27:26'),(427,13,'UPDATE','ITEM',130,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:27:31'),(428,13,'UPDATE','ITEM',130,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:27:34'),(429,13,'UPDATE','ITEM',130,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:27:46'),(430,13,'UPDATE','ITEM',130,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:28:18'),(431,13,'UPDATE','ITEM',131,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:30:17'),(432,13,'UPDATE','ITEM',131,'Reopened production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:30:27'),(433,13,'UPDATE','ITEM',131,'Saved production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:30:37'),(434,13,'UPDATE','ITEM',131,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:30:42'),(435,13,'UPDATE','ITEM',131,'Reopened production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:30:46'),(436,13,'UPDATE','ITEM',130,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:30:48'),(437,13,'ADD','ITEM',133,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 15:38:24'),(438,13,'UPDATE','ITEM',133,'Menu released','2025-11-09 15:38:24'),(439,13,'ADD','ITEM',134,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 15:38:24'),(440,13,'UPDATE','ITEM',134,'Menu released','2025-11-09 15:38:24'),(441,13,'ADD','ITEM',135,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 15:38:24'),(442,13,'UPDATE','ITEM',133,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:38:27'),(443,13,'UPDATE','ITEM',133,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:38:37'),(444,13,'UPDATE','ITEM',133,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:38:38'),(445,13,'UPDATE','ITEM',133,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:38:44'),(446,13,'UPDATE','ITEM',133,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:38:49'),(447,13,'ADD','ITEM',136,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 15:41:35'),(448,13,'UPDATE','ITEM',136,'Menu released','2025-11-09 15:41:35'),(449,13,'ADD','ITEM',137,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 15:41:35'),(450,13,'UPDATE','ITEM',137,'Menu released','2025-11-09 15:41:35'),(451,13,'ADD','ITEM',138,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 15:41:35'),(452,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:41:45'),(453,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:41:49'),(454,13,'UPDATE','ITEM',136,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:41:51'),(455,13,'UPDATE','ITEM',136,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:41:53'),(456,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:42:00'),(457,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:42:04'),(458,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:42:06'),(459,13,'UPDATE','ITEM',136,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 15:42:11'),(460,13,'UPDATE','ITEM',137,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 15:43:30'),(461,13,'UPDATE','ITEM',136,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:00:52'),(462,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:00:58'),(463,13,'UPDATE','ITEM',136,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:00:59'),(464,13,'UPDATE','ITEM',136,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:01:01'),(465,13,'UPDATE','ITEM',136,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:01:06'),(466,13,'UPDATE','ITEM',136,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:04:05'),(467,13,'UPDATE','ITEM',136,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 16:04:12'),(468,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:04:14'),(469,13,'UPDATE','ITEM',136,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:04:15'),(470,13,'UPDATE','ITEM',136,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:19:27'),(471,13,'UPDATE','ITEM',136,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:19:28'),(472,13,'UPDATE','ITEM',136,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:19:29'),(473,13,'UPDATE','ITEM',137,'Reopened production plan for 2025-11-09 MYS (Lunch)','2025-11-09 16:19:31'),(474,13,'UPDATE','ITEM',137,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 16:19:32'),(475,13,'UPDATE','ITEM',136,'Menu unreleased','2025-11-09 16:21:10'),(476,13,'UPDATE','ITEM',136,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:21:17'),(477,13,'UPDATE','ITEM',136,'Menu released','2025-11-09 16:21:17'),(478,13,'ADD','ITEM',139,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:22:10'),(479,13,'UPDATE','ITEM',139,'Menu released','2025-11-09 16:22:10'),(480,13,'ADD','ITEM',140,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 16:22:10'),(481,13,'UPDATE','ITEM',140,'Menu released','2025-11-09 16:22:10'),(482,13,'ADD','ITEM',141,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 16:22:10'),(483,13,'UPDATE','ITEM',139,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:22:19'),(484,13,'UPDATE','ITEM',140,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 16:22:21'),(485,13,'UPDATE','ITEM',139,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:22:41'),(486,13,'ADD','ITEM',142,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:23:17'),(487,13,'UPDATE','ITEM',142,'Menu released','2025-11-09 16:23:17'),(488,13,'ADD','ITEM',143,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 16:23:17'),(489,13,'UPDATE','ITEM',143,'Menu released','2025-11-09 16:23:17'),(490,13,'ADD','ITEM',144,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 16:23:17'),(491,13,'UPDATE','ITEM',142,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:23:22'),(492,13,'UPDATE','ITEM',142,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:23:25'),(493,13,'UPDATE','ITEM',142,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:23:26'),(494,13,'UPDATE','ITEM',142,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:23:29'),(495,13,'UPDATE','ITEM',143,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 16:23:34'),(496,13,'UPDATE','ITEM',142,'Menu unreleased','2025-11-09 16:24:18'),(497,13,'UPDATE','ITEM',142,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:24:23'),(498,13,'UPDATE','ITEM',142,'Menu released','2025-11-09 16:24:23'),(499,13,'ADD','ITEM',145,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:24:56'),(500,13,'UPDATE','ITEM',145,'Menu released','2025-11-09 16:24:56'),(501,13,'ADD','ITEM',146,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 16:24:56'),(502,13,'UPDATE','ITEM',146,'Menu released','2025-11-09 16:24:56'),(503,13,'ADD','ITEM',147,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 16:24:56'),(504,13,'UPDATE','ITEM',145,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:25:09'),(505,13,'UPDATE','ITEM',146,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 16:25:13'),(506,13,'UPDATE','ITEM',145,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:27:46'),(507,13,'UPDATE','ITEM',145,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 16:28:10'),(508,13,'UPDATE','ITEM',145,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:28:13'),(509,13,'UPDATE','ITEM',145,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:28:16'),(510,13,'ADD','ITEM',148,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:30:02'),(511,13,'UPDATE','ITEM',148,'Menu released','2025-11-09 16:30:02'),(512,13,'ADD','ITEM',149,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 16:30:02'),(513,13,'UPDATE','ITEM',149,'Menu released','2025-11-09 16:30:02'),(514,13,'ADD','ITEM',150,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 16:30:02'),(515,13,'UPDATE','ITEM',148,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:30:08'),(516,13,'UPDATE','ITEM',149,'Finalized production plan for 2025-11-09 MYS (Lunch)','2025-11-09 16:30:10'),(517,13,'ADD','ITEM',151,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:33:50'),(518,13,'UPDATE','ITEM',151,'Menu released','2025-11-09 16:33:50'),(519,13,'ADD','ITEM',152,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 16:33:50'),(520,13,'UPDATE','ITEM',152,'Menu released','2025-11-09 16:33:50'),(521,13,'ADD','ITEM',153,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 16:33:50'),(522,13,'UPDATE','ITEM',151,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:34:08'),(523,13,'ADD','ITEM',154,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:35:12'),(524,13,'UPDATE','ITEM',154,'Menu released','2025-11-09 16:35:12'),(525,13,'ADD','ITEM',155,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 16:35:12'),(526,13,'UPDATE','ITEM',155,'Menu released','2025-11-09 16:35:12'),(527,13,'ADD','ITEM',156,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 16:35:12'),(528,13,'UPDATE','ITEM',154,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:35:17'),(529,13,'ADD','ITEM',157,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 16:39:42'),(530,13,'UPDATE','ITEM',157,'Menu released','2025-11-09 16:39:42'),(531,13,'ADD','ITEM',158,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 16:39:42'),(532,13,'UPDATE','ITEM',158,'Menu released','2025-11-09 16:39:42'),(533,13,'ADD','ITEM',159,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 16:39:42'),(534,13,'UPDATE','ITEM',157,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:39:45'),(535,13,'UPDATE','ITEM',157,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 16:39:56'),(536,13,'ADD','ITEM',160,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 23:11:17'),(537,13,'UPDATE','ITEM',160,'Menu released','2025-11-09 23:11:17'),(538,13,'ADD','ITEM',161,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 23:11:17'),(539,13,'UPDATE','ITEM',161,'Menu released','2025-11-09 23:11:17'),(540,13,'ADD','ITEM',162,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 23:11:17'),(541,13,'UPDATE','ITEM',160,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:11:34'),(542,13,'UPDATE','ITEM',160,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:11:50'),(543,13,'UPDATE','ITEM',160,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:11:54'),(544,13,'UPDATE','ITEM',160,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:11:59'),(545,13,'UPDATE','ITEM',160,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:16:59'),(546,13,'UPDATE','ITEM',160,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:17:05'),(547,13,'UPDATE','ITEM',160,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:17:37'),(548,13,'UPDATE','ITEM',160,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:17:43'),(549,13,'UPDATE','ITEM',160,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:17:45'),(550,13,'UPDATE','ITEM',160,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:22:24'),(551,13,'UPDATE','ITEM',160,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:22:31'),(552,13,'UPDATE','ITEM',160,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:22:32'),(553,13,'UPDATE','ITEM',160,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:22:33'),(554,13,'ADD','ITEM',163,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 23:31:52'),(555,13,'UPDATE','ITEM',163,'Menu released','2025-11-09 23:31:52'),(556,13,'ADD','ITEM',164,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 23:31:52'),(557,13,'UPDATE','ITEM',164,'Menu released','2025-11-09 23:31:52'),(558,13,'ADD','ITEM',165,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 23:31:53'),(559,13,'UPDATE','ITEM',163,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:31:56'),(560,13,'UPDATE','ITEM',163,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:32:37'),(561,13,'UPDATE','ITEM',163,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:32:43'),(562,13,'UPDATE','ITEM',163,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:32:50'),(563,13,'UPDATE','ITEM',163,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:33:09'),(564,13,'UPDATE','ITEM',163,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:33:26'),(565,13,'UPDATE','ITEM',163,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:33:31'),(566,13,'UPDATE','ITEM',163,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:02'),(567,13,'UPDATE','ITEM',163,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:08'),(568,13,'UPDATE','ITEM',163,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:09'),(569,13,'UPDATE','ITEM',163,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:22'),(570,13,'UPDATE','ITEM',163,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:24'),(571,13,'UPDATE','ITEM',163,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:33'),(572,13,'UPDATE','ITEM',163,'Saved production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:36'),(573,13,'UPDATE','ITEM',163,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:42'),(574,13,'ADD','ITEM',166,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 23:40:54'),(575,13,'UPDATE','ITEM',166,'Menu released','2025-11-09 23:40:54'),(576,13,'ADD','ITEM',167,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 23:40:54'),(577,13,'UPDATE','ITEM',167,'Menu released','2025-11-09 23:40:54'),(578,13,'ADD','ITEM',168,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 23:40:54'),(579,13,'UPDATE','ITEM',166,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:40:58'),(580,13,'ADD','ITEM',169,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 23:42:54'),(581,13,'UPDATE','ITEM',169,'Menu released','2025-11-09 23:42:54'),(582,13,'ADD','ITEM',170,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 23:42:54'),(583,13,'UPDATE','ITEM',170,'Menu released','2025-11-09 23:42:54'),(584,13,'ADD','ITEM',171,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 23:42:54'),(585,13,'ADD','ITEM',172,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 23:43:27'),(586,13,'UPDATE','ITEM',172,'Menu released','2025-11-09 23:43:27'),(587,13,'ADD','ITEM',173,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 23:43:27'),(588,13,'UPDATE','ITEM',173,'Menu released','2025-11-09 23:43:27'),(589,13,'ADD','ITEM',174,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 23:43:27'),(590,13,'UPDATE','ITEM',172,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 23:43:39'),(591,13,'UPDATE','ITEM',172,'Menu released','2025-11-09 23:43:39'),(592,13,'UPDATE','ITEM',172,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:44:19'),(593,13,'ADD','ITEM',175,'Upserted ONE_DAY menu for 2025-11-09 MYS (Breakfast) with 8 items','2025-11-09 23:46:54'),(594,13,'UPDATE','ITEM',175,'Menu released','2025-11-09 23:46:54'),(595,13,'ADD','ITEM',176,'Upserted ONE_DAY menu for 2025-11-09 MYS (Lunch) with 8 items','2025-11-09 23:46:54'),(596,13,'UPDATE','ITEM',176,'Menu released','2025-11-09 23:46:54'),(597,13,'ADD','ITEM',177,'Upserted ONE_DAY menu for 2025-11-09 MYS (Dinner) with 8 items','2025-11-09 23:46:54'),(598,13,'UPDATE','ITEM',175,'Finalized production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:47:52'),(599,13,'UPDATE','ITEM',175,'Reopened production plan for 2025-11-09 MYS (Breakfast)','2025-11-09 23:48:15'),(600,13,'UPDATE','ITEM',175,'Adjusted max quantities for 2025-11-09 MYS (Breakfast)','2025-11-09 23:48:21'),(601,13,'ADD','ITEM',178,'Upserted ONE_DAY menu for 2025-11-10 MYS (Breakfast) with 8 items','2025-11-10 09:33:51'),(602,13,'UPDATE','ITEM',178,'Menu released','2025-11-10 09:33:51'),(603,13,'ADD','ITEM',179,'Upserted ONE_DAY menu for 2025-11-10 MYS (Lunch) with 8 items','2025-11-10 09:33:51'),(604,13,'UPDATE','ITEM',179,'Menu released','2025-11-10 09:33:51'),(605,13,'ADD','ITEM',180,'Upserted ONE_DAY menu for 2025-11-10 MYS (Dinner) with 8 items','2025-11-10 09:33:51'),(606,13,'UPDATE','ITEM',178,'Finalized production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:33:56'),(607,13,'UPDATE','ITEM',178,'Reopened production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:34:25'),(608,13,'UPDATE','ITEM',178,'Adjusted max quantities for 2025-11-10 MYS (Breakfast)','2025-11-10 09:34:28'),(609,13,'UPDATE','ITEM',178,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:35:40'),(610,13,'UPDATE','ITEM',178,'Finalized production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:35:42'),(611,13,'UPDATE','ITEM',178,'Reopened production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:35:57'),(612,13,'UPDATE','ITEM',178,'Adjusted max quantities for 2025-11-10 MYS (Breakfast)','2025-11-10 09:36:02'),(613,13,'UPDATE','ITEM',178,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:36:04'),(614,13,'UPDATE','ITEM',178,'Finalized production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:36:07'),(615,13,'UPDATE','ITEM',178,'Reopened production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:36:08'),(616,13,'UPDATE','ITEM',178,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:36:08'),(617,13,'UPDATE','ITEM',178,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:36:18'),(618,13,'ADD','ITEM',181,'Upserted ONE_DAY menu for 2025-11-10 MYS (Breakfast) with 8 items','2025-11-10 09:37:07'),(619,13,'UPDATE','ITEM',181,'Menu released','2025-11-10 09:37:07'),(620,13,'ADD','ITEM',182,'Upserted ONE_DAY menu for 2025-11-10 MYS (Lunch) with 8 items','2025-11-10 09:37:07'),(621,13,'UPDATE','ITEM',182,'Menu released','2025-11-10 09:37:07'),(622,13,'ADD','ITEM',183,'Upserted ONE_DAY menu for 2025-11-10 MYS (Dinner) with 8 items','2025-11-10 09:37:07'),(623,13,'UPDATE','ITEM',181,'Adjusted max quantities for 2025-11-10 MYS (Breakfast)','2025-11-10 09:37:15'),(624,13,'UPDATE','ITEM',181,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:37:50'),(625,13,'UPDATE','ITEM',181,'Finalized production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:37:52'),(626,13,'UPDATE','ITEM',181,'Reopened production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:38:29'),(627,13,'UPDATE','ITEM',181,'Adjusted max quantities for 2025-11-10 MYS (Breakfast)','2025-11-10 09:38:38'),(628,13,'UPDATE','ITEM',181,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:38:41'),(629,13,'UPDATE','ITEM',181,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:38:48'),(630,13,'UPDATE','ITEM',181,'Finalized production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:38:50'),(631,13,'ADD','ITEM',184,'Upserted ONE_DAY menu for 2025-11-10 MYS (Breakfast) with 8 items','2025-11-10 09:38:53'),(632,13,'UPDATE','ITEM',184,'Menu released','2025-11-10 09:38:53'),(633,13,'ADD','ITEM',185,'Upserted ONE_DAY menu for 2025-11-10 MYS (Lunch) with 8 items','2025-11-10 09:38:53'),(634,13,'UPDATE','ITEM',185,'Menu released','2025-11-10 09:38:53'),(635,13,'ADD','ITEM',186,'Upserted ONE_DAY menu for 2025-11-10 MYS (Dinner) with 8 items','2025-11-10 09:38:53'),(636,13,'UPDATE','ITEM',184,'Adjusted max quantities for 2025-11-10 MYS (Breakfast)','2025-11-10 09:39:14'),(637,13,'UPDATE','ITEM',184,'Saved production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:39:50'),(638,13,'UPDATE','ITEM',184,'Finalized production plan for 2025-11-10 MYS (Breakfast)','2025-11-10 09:39:51'),(639,13,'ADD','ITEM',314,'Created item 314','2025-11-15 19:25:00'),(640,13,'ADD','CATEGORY',5,'Created category 5','2025-11-16 12:28:27'),(641,13,'DELETE','CATEGORY',5,'Deleted category 5','2025-11-16 12:28:30'),(642,13,'ADD','ITEM',187,'Upserted ONE_DAY menu for 2025-11-21 MYS (Breakfast) with 8 items','2025-11-21 09:04:41'),(643,13,'UPDATE','ITEM',187,'Menu released','2025-11-21 09:04:41'),(644,13,'ADD','ITEM',188,'Upserted ONE_DAY menu for 2025-11-21 MYS (Lunch) with 8 items','2025-11-21 09:04:41'),(645,13,'UPDATE','ITEM',188,'Menu released','2025-11-21 09:04:41'),(646,13,'ADD','ITEM',189,'Upserted ONE_DAY menu for 2025-11-21 MYS (Dinner) with 8 items','2025-11-21 09:04:41'),(647,13,'UPDATE','ITEM',187,'Upserted ONE_DAY menu for 2025-11-21 MYS (Breakfast) with 8 items','2025-11-21 09:05:07'),(648,13,'UPDATE','ITEM',187,'Menu released','2025-11-21 09:05:07'),(649,13,'UPDATE','ITEM',188,'Upserted ONE_DAY menu for 2025-11-21 MYS (Lunch) with 8 items','2025-11-21 09:05:07'),(650,13,'UPDATE','ITEM',188,'Menu released','2025-11-21 09:05:07'),(651,13,'UPDATE','ITEM',189,'Upserted ONE_DAY menu for 2025-11-21 MYS (Dinner) with 8 items','2025-11-21 09:05:07'),(652,13,'UPDATE','ITEM',187,'Upserted ONE_DAY menu for 2025-11-21 MYS (Breakfast) with 8 items','2025-11-21 09:07:33'),(653,13,'UPDATE','ITEM',187,'Menu released','2025-11-21 09:07:33'),(654,13,'UPDATE','ITEM',188,'Upserted ONE_DAY menu for 2025-11-21 MYS (Lunch) with 8 items','2025-11-21 09:07:33'),(655,13,'UPDATE','ITEM',188,'Menu released','2025-11-21 09:07:33'),(656,13,'UPDATE','ITEM',189,'Upserted ONE_DAY menu for 2025-11-21 MYS (Dinner) with 8 items','2025-11-21 09:07:33'),(657,13,'UPDATE','ITEM',187,'Upserted ONE_DAY menu for 2025-11-21 MYS (Breakfast) with 8 items','2025-11-21 09:09:19'),(658,13,'UPDATE','ITEM',187,'Menu released','2025-11-21 09:09:19'),(659,13,'UPDATE','ITEM',188,'Upserted ONE_DAY menu for 2025-11-21 MYS (Lunch) with 8 items','2025-11-21 09:09:19'),(660,13,'UPDATE','ITEM',188,'Menu released','2025-11-21 09:09:19'),(661,13,'UPDATE','ITEM',189,'Upserted ONE_DAY menu for 2025-11-21 MYS (Dinner) with 8 items','2025-11-21 09:09:19'),(662,13,'ADD','ITEM',190,'Upserted CONDIMENTS menu for MYS MYS (Condiments) with 6 items','2025-11-21 09:09:19'),(663,13,'UPDATE','ITEM',190,'Menu released','2025-11-21 09:09:19'),(664,13,'ADD','ITEM',191,'Upserted ONE_DAY menu for 2025-12-05 MYS (Breakfast) with 8 items','2025-12-05 19:54:21'),(665,13,'UPDATE','ITEM',191,'Menu released','2025-12-05 19:54:21'),(666,13,'ADD','ITEM',192,'Upserted ONE_DAY menu for 2025-12-05 MYS (Lunch) with 8 items','2025-12-05 19:54:21'),(667,13,'UPDATE','ITEM',192,'Menu released','2025-12-05 19:54:21'),(668,13,'ADD','ITEM',193,'Upserted ONE_DAY menu for 2025-12-05 MYS (Dinner) with 8 items','2025-12-05 19:54:21'),(669,13,'UPDATE','ITEM',190,'Upserted CONDIMENTS menu for MYS MYS (Condiments) with 6 items','2025-12-05 19:54:21'),(670,13,'UPDATE','ITEM',190,'Menu released','2025-12-05 19:54:21'),(671,13,'ADD','ITEM',194,'Upserted ONE_DAY menu for 2026-01-03 MYS (Breakfast) with 8 items','2026-01-03 15:53:18'),(672,13,'UPDATE','ITEM',194,'Menu released','2026-01-03 15:53:18'),(673,13,'ADD','ITEM',195,'Upserted ONE_DAY menu for 2026-01-03 MYS (Lunch) with 8 items','2026-01-03 15:53:18'),(674,13,'UPDATE','ITEM',195,'Menu released','2026-01-03 15:53:18'),(675,13,'ADD','ITEM',196,'Upserted ONE_DAY menu for 2026-01-03 MYS (Dinner) with 8 items','2026-01-03 15:53:18'),(676,13,'UPDATE','ITEM',190,'Upserted CONDIMENTS menu for MYS MYS (Condiments) with 6 items','2026-01-03 15:53:18'),(677,13,'UPDATE','ITEM',190,'Menu released','2026-01-03 15:53:18'),(678,13,'UPDATE','ITEM',195,'Menu unreleased','2026-01-03 15:53:49'),(679,13,'UPDATE','ITEM',195,'Upserted ONE_DAY menu for 2026-01-03 MYS (Lunch) with 8 items','2026-01-03 15:53:51'),(680,13,'UPDATE','ITEM',195,'Menu released','2026-01-03 15:53:51'),(681,13,'UPDATE','ITEM',194,'Menu unreleased','2026-01-03 15:54:33'),(682,13,'UPDATE','ITEM',194,'Upserted ONE_DAY menu for 2026-01-03 MYS (Breakfast) with 9 items','2026-01-03 15:54:45'),(683,13,'UPDATE','ITEM',194,'Menu released','2026-01-03 15:54:45'),(684,13,'UPDATE','ITEM',194,'Finalized production plan for 2026-01-03 MYS (Breakfast)','2026-01-03 15:55:31'),(685,13,'UPDATE','ITEM',194,'Reopened production plan for 2026-01-03 MYS (Breakfast)','2026-01-03 15:56:14'),(686,13,'UPDATE','ITEM',194,'Saved production plan for 2026-01-03 MYS (Breakfast)','2026-01-03 15:56:22'),(687,13,'UPDATE','ITEM',194,'Finalized production plan for 2026-01-03 MYS (Breakfast)','2026-01-03 15:56:33'),(688,13,'UPDATE','ITEM',194,'Menu unreleased','2026-01-03 15:57:52'),(689,13,'UPDATE','ITEM',194,'Upserted ONE_DAY menu for 2026-01-03 MYS (Breakfast) with 9 items','2026-01-03 15:57:57'),(690,13,'UPDATE','ITEM',194,'Menu released','2026-01-03 15:57:57'),(691,13,'UPDATE','ITEM',195,'Finalized production plan for 2026-01-03 MYS (Lunch)','2026-01-03 16:14:21'),(692,13,'ADD','ITEM',197,'Upserted ONE_DAY menu for 2026-01-15 MYS (Breakfast) with 8 items','2026-01-15 16:33:56'),(693,13,'UPDATE','ITEM',197,'Menu released','2026-01-15 16:33:56'),(694,13,'ADD','ITEM',198,'Upserted ONE_DAY menu for 2026-01-15 MYS (Lunch) with 8 items','2026-01-15 16:33:56'),(695,13,'UPDATE','ITEM',198,'Menu released','2026-01-15 16:33:56'),(696,13,'ADD','ITEM',199,'Upserted ONE_DAY menu for 2026-01-15 MYS (Dinner) with 8 items','2026-01-15 16:33:56'),(697,13,'UPDATE','ITEM',190,'Upserted CONDIMENTS menu for MYS MYS (Condiments) with 6 items','2026-01-15 16:33:56'),(698,13,'UPDATE','ITEM',190,'Menu released','2026-01-15 16:33:56'),(699,13,'ADD','ITEM',200,'Upserted ONE_DAY menu for 2026-01-27 MYS (Breakfast) with 8 items','2026-01-27 15:22:52'),(700,13,'UPDATE','ITEM',200,'Menu released','2026-01-27 15:22:52'),(701,13,'ADD','ITEM',201,'Upserted ONE_DAY menu for 2026-01-27 MYS (Lunch) with 8 items','2026-01-27 15:22:52'),(702,13,'UPDATE','ITEM',201,'Menu released','2026-01-27 15:22:52'),(703,13,'ADD','ITEM',202,'Upserted ONE_DAY menu for 2026-01-27 MYS (Dinner) with 8 items','2026-01-27 15:22:52'),(704,13,'UPDATE','ITEM',190,'Upserted CONDIMENTS menu for MYS MYS (Condiments) with 6 items','2026-01-27 15:22:52'),(705,13,'UPDATE','ITEM',190,'Menu released','2026-01-27 15:22:52'),(706,13,'UPDATE','ITEM',200,'Upserted ONE_DAY menu for 2026-01-27 MYS (Breakfast) with 8 items','2026-01-27 15:52:28'),(707,13,'UPDATE','ITEM',200,'Menu released','2026-01-27 15:52:28'),(708,13,'UPDATE','ITEM',201,'Upserted ONE_DAY menu for 2026-01-27 MYS (Lunch) with 8 items','2026-01-27 15:52:28'),(709,13,'UPDATE','ITEM',201,'Menu released','2026-01-27 15:52:28'),(710,13,'UPDATE','ITEM',202,'Upserted ONE_DAY menu for 2026-01-27 MYS (Dinner) with 8 items','2026-01-27 15:52:28'),(711,13,'UPDATE','ITEM',190,'Upserted CONDIMENTS menu for MYS MYS (Condiments) with 6 items','2026-01-27 15:52:28'),(712,13,'UPDATE','ITEM',190,'Menu released','2026-01-27 15:52:28'),(713,13,'UPDATE','ITEM',200,'Finalized production plan for 2026-01-27 MYS (Breakfast)','2026-01-27 20:32:40'),(714,13,'UPDATE','ITEM',201,'Finalized production plan for 2026-01-27 MYS (Lunch)','2026-01-27 20:32:43');
/*!40000 ALTER TABLE `admin_logs` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
-- Table structure for table `plated_items`
--

DROP TABLE IF EXISTS `plated_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plated_items` (
  `plated_item_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`plated_item_id`),
  UNIQUE KEY `uk_plated_items_item_id` (`item_id`),
  CONSTRAINT `fk_plated_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plated_item_components`
--

DROP TABLE IF EXISTS `plated_item_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plated_item_components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plated_item_id` int NOT NULL,
  `component_item_id` int NOT NULL,
  `quantity` decimal(10,3) NOT NULL DEFAULT '1.000',
  `sort_order` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_plated_item_components_plated_item_id` (`plated_item_id`),
  KEY `idx_plated_item_components_component_item_id` (`component_item_id`),
  CONSTRAINT `fk_plated_item_components_component` FOREIGN KEY (`component_item_id`) REFERENCES `items` (`item_id`),
  CONSTRAINT `fk_plated_item_components_parent` FOREIGN KEY (`plated_item_id`) REFERENCES `plated_items` (`plated_item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `constants`
--

DROP TABLE IF EXISTS `constants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `constants` (
  `constant_id` int NOT NULL AUTO_INCREMENT,
  `constant_code` varchar(50) NOT NULL,
  `constant_type` varchar(20) NOT NULL,
  `constant_value` decimal(5,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`constant_id`),
  UNIQUE KEY `constant_code` (`constant_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `constants`
--

LOCK TABLES `constants` WRITE;
/*!40000 ALTER TABLE `constants` DISABLE KEYS */;
INSERT INTO `constants` VALUES (1,'GET10','coupon',10.00,1,'10% off coupon','2026-01-27 10:03:10','2026-01-27 10:24:09'),(2,'CGST','tax',18.00,1,'Central GST','2026-01-27 10:03:10','2026-01-27 10:03:10'),(3,'SGST','tax',18.00,1,'State GST','2026-01-27 10:03:10','2026-01-27 10:03:10');
/*!40000 ALTER TABLE `constants` ENABLE KEYS */;
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
  `roles` json DEFAULT NULL,
  `admin_password_hash` varchar(255) DEFAULT NULL,
  `admin_is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `primary_mobile` (`primary_mobile`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (13,'Sanjay D','9108254344','9880962761','Shashank S','Shashank S','Daily','shashanksrao@gmail.com','2025-03-05 15:07:22',1,'[1, 2]','$2b$12$togjzHD04OtMRDgvKa2DR.k49xb8r5gy0gFHlQpprpVWabyeCYYDe',1),(25,NULL,'9845266160','9876501234','Satish BN','Gowramma','Daily','sat@example.com','2025-03-07 19:09:29',0,'[]',NULL,1),(26,NULL,'9123456789','9867543210','Sneha Rao','Sneha Rao','Monthly','sneha@example.com','2025-03-07 19:09:29',0,NULL,'$2b$12$BKZGEVFi5zLyGavkK887fuVhLqRp1zI.ACW7IIfIbpRWuD9hiQrpO',1),(64,'Shashank','9886345228','9886345228','Naren','Naren','Daily','naren@gmail.com','2025-10-30 06:59:23',0,'[4]',NULL,1),(65,NULL,'9876543210',NULL,'Test Admin','Test Admin','Daily',NULL,'2025-11-21 03:52:37',0,NULL,NULL,1),(66,'9108254344','9632880358',NULL,'Pranav','Pranav','Daily','pranav.rovers@gmail.com','2026-01-03 10:21:46',0,'[1]','$2b$12$OTCgcnYUxE2JfNr.BaEnn.MLfjLeKyoTmgeCpyG5Cj3MZh6gRUFzK',1);
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
-- Table structure for table `item_bld_map`
--

DROP TABLE IF EXISTS `item_bld_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_bld_map` (
  `item_id` int NOT NULL,
  `bld_id` int NOT NULL,
  PRIMARY KEY (`item_id`,`bld_id`),
  KEY `bld_id` (`bld_id`),
  CONSTRAINT `item_bld_map_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `item_bld_map_ibfk_2` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_bld_map`
--

LOCK TABLES `item_bld_map` WRITE;
/*!40000 ALTER TABLE `item_bld_map` DISABLE KEYS */;
INSERT INTO `item_bld_map` VALUES (1,1),(2,1),(5,1),(6,1),(7,1),(8,1),(10,1),(11,1),(12,1),(13,1),(14,1),(15,1),(16,1),(17,1),(18,1),(19,1),(20,1),(21,1),(22,1),(23,1),(24,1),(25,1),(26,1),(27,1),(28,1),(3,2),(4,2),(29,2),(30,2),(31,2),(32,2),(33,2),(34,2),(35,2),(36,2),(37,2),(38,2),(39,2),(40,2),(41,2),(42,2),(43,2),(44,2),(45,2),(46,2),(47,2),(48,2),(49,2),(50,2),(51,2),(52,2),(53,2),(54,2),(201,2),(202,2),(203,2),(204,2),(205,2),(206,2),(207,2),(208,2),(209,2),(210,2),(211,2),(212,2),(9,3),(301,3),(302,3),(303,3),(304,3),(305,3),(306,3),(307,3),(308,3),(309,3),(310,3),(311,3),(312,3),(314,4),(315,4),(316,4),(317,4),(318,4),(319,4);
/*!40000 ALTER TABLE `item_bld_map` ENABLE KEYS */;
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
  `uom_customer` varchar(50) NOT NULL,
  `unit_packing` decimal(10,3) DEFAULT NULL,
  `uom_packing` varchar(50) DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `hsn_code` varchar(50) DEFAULT NULL,
  `uom_production` varchar(50) DEFAULT NULL,
  `packing_to_production_rate` decimal(10,6) DEFAULT '1.000000',
  `buffer_percentage` decimal(5,2) DEFAULT NULL,
  `max_qty_breakfast` int DEFAULT NULL,
  `max_qty_lunch` int DEFAULT NULL,
  `max_qty_dinner` int DEFAULT NULL,
  `max_qty_condiments` int DEFAULT NULL,
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
  PRIMARY KEY (`item_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=320 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (1,'Idli','Soft rice cakes','idli',1,'plate',1.000,'pcs','Food','1234',1.000,2,5.00,50,50,50,NULL,'idli.jpg',30.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,31.50),(2,'Dosa','Crispy rice pancake','dosa',1,'piece',1.000,'pcs','Food','1235',1.000,1,5.00,50,50,50,NULL,'dosa.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,52.50),(3,'Rice & Sambar','Steamed rice with Sambar','rice_sambar',1,'plate',1.000,'pcs','Food','1236',1.000,1,5.00,50,50,50,NULL,'rice_sambar.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,84.00),(4,'Chapati & Curry','Whole wheat chapati with curry','chapati_curry',2,'plate',1.000,'pcs','Food','1237',1.000,2,5.00,50,50,50,NULL,'chapati_curry.jpg',NULL,90.00,NULL,NULL,NULL,5.00,5.00,0.00,94.50),(5,'Upma','Savory semolina porridge','upma',1,'plate',1.000,'pcs','Food','1240',1.000,1,5.00,50,50,50,NULL,'upma.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00),(6,'Pongal','Rice and lentil dish','pongal',1,'bowl',1.000,'pcs','Food','1241',1.000,1,5.00,50,50,50,NULL,'pongal.jpg',45.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,49.50),(7,'Medu Vada','Crispy lentil doughnut','medu_vada',1,'piece',1.000,'pcs','Food','1242',1.000,1,5.00,50,50,50,NULL,'medu_vada.jpg',35.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,38.50),(8,'Pesarattu','Green gram pancake','pesarattu',1,'plate',1.000,'pcs','Food','1243',1.000,1,5.00,50,50,50,NULL,'pesarattu.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00),(9,'Curd Rice','Rice in yogurt','curd_rice',1,'plate',1.000,'pcs','Food','1244',1.000,1,5.00,50,50,50,NULL,'curd_rice.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00),(10,'Lemon Rice','Rice with lemon and spices','lemon_rice',1,'plate',1.000,'pcs','Food','1245',1.000,1,5.00,50,50,50,NULL,'lemon_rice.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00),(11,'Tomato Rice','Rice cooked with tomato gravy','tomato_rice',1,'plate',1.000,'pcs','Food','1246',1.000,1,5.00,50,50,50,NULL,'tomato_rice.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00),(12,'Bisi Bele Bath','Spicy rice–lentil dish','bisi_bele_bath',1,'bowl',1.000,'pcs','Food','1247',1.000,1,5.00,50,50,50,NULL,'bisi_bele_bath.jpg',70.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,77.00),(13,'Avial','Mixed vegetable stew','avial',1,'plate',1.000,'pcs','Food','1248',1.000,1,5.00,50,50,50,NULL,'avial.jpg',65.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,71.50),(14,'Cabbage Thoran','Stir-fried cabbage with coconut','cabbage_thoran',1,'plate',1.000,'pcs','Food','1249',1.000,1,5.00,50,50,50,NULL,'cabbage_thoran.jpg',55.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,60.50),(15,'Poori','Deep-fried bread','poori',1,'piece',1.000,'pcs','Food','1250',1.000,1,5.00,50,50,50,NULL,'poori.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00),(16,'Masala Dosa','Rice pancake with potato filling','masala_dosa',1,'piece',1.000,'pcs','Food','1251',1.000,1,5.00,50,50,50,NULL,'masala_dosa.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00),(17,'Idiyappam','Steamed rice noodles','idiyappam',1,'plate',1.000,'pcs','Food','1252',1.000,1,5.00,50,50,50,NULL,'idiyappam.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00),(18,'Puttu','Steamed rice cake','puttu',1,'plate',1.000,'pcs','Food','1253',1.000,1,5.00,50,50,50,NULL,'puttu.jpg',45.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,49.50),(19,'Appam','Fermented rice pancake','appam',1,'piece',1.000,'pcs','Food','1254',1.000,1,5.00,50,50,50,NULL,'appam.jpg',50.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,55.00),(20,'Kesari Bath','Sweet semolina pudding','kesari_bath',1,'plate',1.000,'pcs','Food','1255',1.000,1,5.00,50,50,50,NULL,'kesari_bath.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00),(21,'Rava Dosa','Semolina crepe','rava_dosa',1,'piece',1.000,'pcs','Food','1256',1.000,1,5.00,50,50,50,NULL,'rava_dosa.jpg',55.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,60.50),(22,'Onion Uttapam','Savory rice pancake with onion','onion_uttapam',1,'piece',1.000,'pcs','Food','1257',1.000,1,5.00,50,50,50,NULL,'onion_uttapam.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00),(23,'Rava Idli','Steamed semolina cakes','rava_idli',1,'piece',1.000,'pcs','Food','1258',1.000,1,5.00,50,50,50,NULL,'rava_idli.jpg',45.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,49.50),(24,'Semiya Upma','Vermicelli porridge','semiya_upma',1,'plate',1.000,'pcs','Food','1259',1.000,1,5.00,50,50,50,NULL,'semiya_upma.jpg',40.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,44.00),(25,'Vegetable Uttapam','Rice pancake with veggies','veg_uttapam',1,'piece',1.000,'pcs','Food','1260',1.000,1,5.00,50,50,50,NULL,'veg_uttapam.jpg',65.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,71.50),(26,'Paniyaram','Savory rice dumplings','paniyaram',1,'piece',1.000,'pcs','Food','1261',1.000,1,5.00,50,50,50,NULL,'paniyaram.jpg',35.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,38.50),(27,'Tomato Uthappam','Rice pancake with tomato','tomato_uthappam',1,'piece',1.000,'pcs','Food','1262',1.000,1,5.00,50,50,50,NULL,'tomato_uthappam.jpg',60.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,66.00),(28,'Vegetable Dosa','Rice pancake with veggies','veg_dosa',1,'piece',1.000,'pcs','Food','1263',1.000,1,5.00,50,50,50,NULL,'veg_dosa.jpg',70.00,NULL,NULL,NULL,NULL,5.00,5.00,0.00,77.00),(29,'Palak Paneer','Spinach with cottage cheese','palak_paneer',2,'plate',1.000,'pcs','Food','1264',1.000,1,5.00,50,50,50,NULL,'palak_paneer.jpg',NULL,150.00,NULL,NULL,NULL,5.00,5.00,0.00,165.00),(30,'Paneer Butter Masala','Cottage cheese in tomato gravy','paneer_butter_masala',2,'plate',1.000,'pcs','Food','1265',1.000,1,5.00,50,50,50,NULL,'paneer_butter_masala.jpg',NULL,160.00,NULL,NULL,NULL,5.00,5.00,0.00,176.00),(31,'Malai Kofta','Vegetable dumplings in gravy','malai_kofta',2,'plate',1.000,'pcs','Food','1266',1.000,1,5.00,50,50,50,NULL,'malai_kofta.jpg',NULL,170.00,NULL,NULL,NULL,5.00,5.00,0.00,187.00),(32,'Dal Makhani','Creamy black lentils','dal_makhani',2,'bowl',1.000,'pcs','Food','1267',1.000,1,5.00,50,50,50,NULL,'dal_makhani.jpg',NULL,140.00,NULL,NULL,NULL,5.00,5.00,0.00,154.00),(33,'Chole Bhature','Spicy chickpeas with fried bread','chole_bhature',2,'plate',1.000,'pcs','Food','1268',1.000,1,5.00,50,50,50,NULL,'chole_bhature.jpg',NULL,130.00,NULL,NULL,NULL,5.00,5.00,0.00,143.00),(34,'Aloo Paratha','Stuffed potato bread','aloo_paratha',2,'piece',1.000,'pcs','Food','1269',1.000,1,5.00,50,50,50,NULL,'aloo_paratha.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,88.00),(35,'Gobi Paratha','Stuffed cauliflower bread','gobi_paratha',2,'piece',1.000,'pcs','Food','1270',1.000,1,5.00,50,50,50,NULL,'gobi_paratha.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,88.00),(36,'Mix Veg Curry','Mixed vegetables in gravy','mix_veg_curry',2,'plate',1.000,'pcs','Food','1271',1.000,1,5.00,50,50,50,NULL,'mix_veg_curry.jpg',NULL,130.00,NULL,NULL,NULL,5.00,5.00,0.00,143.00),(37,'Rajma','Red kidney bean curry','rajma',2,'bowl',1.000,'pcs','Food','1272',1.000,1,5.00,50,50,50,NULL,'rajma.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00),(38,'Kadhi Pakora','Yogurt curry with fritters','kadhi_pakora',2,'bowl',1.000,'pcs','Food','1273',1.000,1,5.00,50,50,50,NULL,'kadhi_pakora.jpg',NULL,110.00,NULL,NULL,NULL,5.00,5.00,0.00,121.00),(39,'Bhindi Masala','Spiced okra','bhindi_masala',2,'plate',1.000,'pcs','Food','1274',1.000,1,5.00,50,50,50,NULL,'bhindi_masala.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00),(40,'Aloo Gobi','Potato & cauliflower','aloo_gobi',2,'plate',1.000,'pcs','Food','1275',1.000,1,5.00,50,40,30,NULL,'aloo_gobi.jpg',NULL,100.00,NULL,NULL,NULL,5.00,5.00,0.00,110.00),(41,'Tandoori Roti','Clay-oven flatbread','tandoori_roti',2,'piece',1.000,'pcs','Food','1276',1.000,1,5.00,50,50,50,NULL,'tandoori_roti.jpg',NULL,20.00,NULL,NULL,NULL,5.00,5.00,0.00,22.00),(42,'Naan','Leavened flatbread','naan',2,'piece',1.000,'pcs','Food','1277',1.000,1,5.00,50,50,50,NULL,'naan.jpg',NULL,30.00,NULL,NULL,NULL,5.00,5.00,0.00,33.00),(43,'Veg Biryani','Spiced rice with vegetables','veg_biryani',2,'plate',1.000,'pcs','Food','1278',1.000,1,5.00,50,50,50,NULL,'veg_biryani.jpg',NULL,150.00,NULL,NULL,NULL,5.00,5.00,0.00,165.00),(44,'Pea Pulao','Rice with green peas','pea_pulao',2,'plate',1.000,'pcs','Food','1279',1.000,1,5.00,50,50,50,NULL,'pea_pulao.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00),(45,'Veg Fried Rice','Stir-fried rice & veggies','veg_fried_rice',2,'plate',1.000,'pcs','Food','1280',1.000,1,5.00,50,50,50,NULL,'veg_fried_rice.jpg',NULL,100.00,NULL,NULL,NULL,5.00,5.00,0.00,110.00),(46,'Veg Hakka Noodles','China-style stir-fried noodles','veg_hakka_noodles',2,'plate',1.000,'pcs','Food','1281',1.000,1,5.00,50,50,50,NULL,'veg_hakka_noodles.jpg',NULL,110.00,NULL,NULL,NULL,5.00,5.00,0.00,121.00),(47,'Corn Chaat','Spiced corn snack','corn_chaat',2,'bowl',1.000,'pcs','Food','1282',1.000,1,5.00,50,50,50,NULL,'corn_chaat.jpg',NULL,80.00,NULL,NULL,NULL,5.00,5.00,0.00,88.00),(48,'Samosa','Fried pastry with potato filling','samosa',2,'piece',1.000,'pcs','Food','1283',1.000,1,5.00,50,50,50,NULL,'samosa.jpg',NULL,30.00,NULL,NULL,NULL,5.00,5.00,0.00,33.00),(49,'Veg Cutlet','Spiced vegetable patty','veg_cutlet',2,'piece',1.000,'pcs','Food','1284',1.000,1,5.00,50,50,50,NULL,'veg_cutlet.jpg',NULL,40.00,NULL,NULL,NULL,5.00,5.00,0.00,44.00),(50,'Veg Sandwich','Mixed veggie sandwich','veg_sandwich',2,'piece',1.000,'pcs','Food','1285',1.000,1,5.00,50,50,50,NULL,'veg_sandwich.jpg',NULL,60.00,NULL,NULL,NULL,5.00,5.00,0.00,66.00),(51,'Spring Roll','Vegetable filled roll','spring_roll',2,'piece',1.000,'pcs','Food','1286',1.000,1,5.00,50,50,50,NULL,'spring_roll.jpg',NULL,50.00,NULL,NULL,NULL,5.00,5.00,0.00,55.00),(52,'Veg Manchurian','Chinese-style veggie balls','veg_manchurian',2,'plate',1.000,'pcs','Food','1287',1.000,1,5.00,50,50,50,NULL,'veg_manchurian.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,132.00),(53,'Hara Bhara Kabab','Spinach & peas kebab','hara_bhara_kabab',2,'piece',1.000,'pcs','Food','1288',1.000,1,5.00,50,50,50,NULL,'hara_bhara_kabab.jpg',NULL,90.00,NULL,NULL,NULL,5.00,5.00,0.00,99.00),(54,'Dhaba Dal','Spiced lentils, street style','dhaba_dal',2,'bowl',1.000,'pcs','Food','1289',1.000,1,5.00,50,50,50,NULL,'dhaba_dal.jpg',NULL,140.00,NULL,NULL,NULL,5.00,5.00,0.00,154.00),(201,'Kadai Paneer','Paneer cooked with capsicum & spices','kadai_paneer',2,'plate',1.000,'pcs','Food','1290',1.000,1,5.00,50,50,50,NULL,'kadai_paneer.jpg',NULL,160.00,NULL,NULL,NULL,5.00,5.00,0.00,168.00),(202,'Matar Paneer','Peas and paneer in tomato-onion gravy','matar_paneer',2,'plate',1.000,'pcs','Food','1291',1.000,1,5.00,50,50,50,NULL,'matar_paneer.jpg',NULL,150.00,NULL,NULL,NULL,5.00,5.00,0.00,157.50),(203,'Baingan Bharta','Smoked mashed eggplant curry','baingan_bharta',2,'plate',1.000,'pcs','Food','1292',1.000,1,5.00,50,50,50,NULL,'baingan_bharta.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,126.00),(204,'Veg Korma','Mixed veg in rich coconut-cashew gravy','veg_korma',2,'plate',1.000,'pcs','Food','1293',1.000,1,5.00,50,50,50,NULL,'veg_korma.jpg',NULL,130.00,NULL,NULL,NULL,5.00,5.00,0.00,136.50),(205,'Jeera Rice','Fragrant cumin tempered basmati rice','jeera_rice',2,'plate',1.000,'pcs','Food','1294',1.000,1,5.00,50,50,50,NULL,'jeera_rice.jpg',NULL,90.00,NULL,NULL,NULL,5.00,5.00,0.00,94.50),(206,'Veg Pulao','Basmati rice cooked with mixed vegetables','veg_pulao',2,'plate',1.000,'pcs','Food','1295',1.000,1,5.00,50,50,50,NULL,'veg_pulao.jpg',NULL,110.00,NULL,NULL,NULL,5.00,5.00,0.00,115.50),(207,'Lachha Paratha','Layered flaky whole wheat paratha','lachha_paratha',2,'piece',1.000,'pcs','Food','1296',1.000,1,5.00,50,50,50,NULL,'lachha_paratha.jpg',NULL,35.00,NULL,NULL,NULL,5.00,5.00,0.00,36.75),(208,'Paneer Tikka','Marinated paneer grilled in tandoor','paneer_tikka',2,'plate',1.000,'pcs','Food','1297',1.000,1,5.00,50,50,50,NULL,'paneer_tikka.jpg',NULL,140.00,NULL,NULL,NULL,5.00,5.00,0.00,147.00),(209,'Mix Veg Thali','Assorted veg curries, bread & rice','mix_veg_thali',2,'plate',1.000,'pcs','Food','1298',1.000,1,5.00,50,50,50,NULL,'mix_veg_thali.jpg',NULL,180.00,NULL,NULL,NULL,5.00,5.00,0.00,189.00),(210,'Dal Tadka','Yellow lentils tempered with ghee & spices','dal_tadka',2,'bowl',1.000,'pcs','Food','1299',1.000,1,5.00,50,50,50,NULL,'dal_tadka.jpg',NULL,120.00,NULL,NULL,NULL,5.00,5.00,0.00,126.00),(211,'Mushroom Masala','Button mushrooms in spicy gravy','mushroom_masala',2,'plate',1.000,'pcs','Food','1300',1.000,1,5.00,50,50,50,NULL,'mushroom_masala.jpg',NULL,160.00,NULL,NULL,NULL,5.00,5.00,0.00,168.00),(212,'Aloo Jeera','Potatoes tossed with cumin & spices','aloo_jeera',2,'plate',1.000,'pcs','Food','1301',1.000,1,5.00,50,50,50,NULL,'aloo_jeera.jpg',NULL,100.00,NULL,NULL,NULL,5.00,5.00,0.00,105.00),(301,'Veg Kurma','South-Indian style mixed veg kurma','veg_kurma_din',3,'plate',1.000,'pcs','Food','1302',1.000,1,5.00,50,50,50,NULL,'veg_kurma_din.jpg',NULL,NULL,130.00,NULL,NULL,5.00,5.00,0.00,136.50),(302,'Ghee Rice','Aromatic basmati rice cooked in ghee','ghee_rice',3,'plate',1.000,'pcs','Food','1303',1.000,1,5.00,50,50,50,NULL,'ghee_rice.jpg',NULL,NULL,120.00,NULL,NULL,5.00,5.00,0.00,126.00),(303,'Paneer Tikka Masala','Grilled paneer in rich tomato gravy','paneer_tikka_masala',3,'plate',1.000,'pcs','Food','1304',1.000,1,5.00,50,50,50,NULL,'paneer_tikka_masala.jpg',NULL,NULL,170.00,NULL,NULL,5.00,5.00,0.00,178.50),(304,'Veg Handi','Mixed vegetables slow-cooked in handi','veg_handi',3,'plate',1.000,'pcs','Food','1305',1.000,1,5.00,50,50,50,NULL,'veg_handi.jpg',NULL,NULL,150.00,NULL,NULL,5.00,5.00,0.00,157.50),(305,'Dal Fry','Toor dal tempered with garlic & spices','dal_fry',3,'bowl',1.000,'pcs','Food','1306',1.000,1,5.00,50,50,50,NULL,'dal_fry.jpg',NULL,NULL,110.00,NULL,NULL,5.00,5.00,0.00,115.50),(306,'Mixed Veg Raita','Curd with cucumber, onion & spices','mixed_veg_raita',3,'bowl',1.000,'pcs','Food','1307',1.000,1,5.00,50,50,50,NULL,'mixed_veg_raita.jpg',NULL,NULL,50.00,NULL,NULL,5.00,5.00,0.00,52.50),(307,'Hot & Sour Soup (Veg)','Spicy-tangy veg soup','hot_sour_soup_veg',3,'bowl',1.000,'pcs','Food','1308',1.000,1,5.00,50,50,50,NULL,'hot_sour_soup_veg.jpg',NULL,NULL,90.00,NULL,NULL,5.00,5.00,0.00,94.50),(308,'Paneer Bhurji','Scrambled paneer with spices','paneer_bhurji',3,'plate',1.000,'pcs','Food','1309',1.000,1,5.00,50,50,50,NULL,'paneer_bhurji.jpg',NULL,NULL,140.00,NULL,NULL,5.00,5.00,0.00,147.00),(309,'Mushroom Do Pyaza','Mushrooms with double onions','mushroom_do_pyaza',3,'plate',1.000,'pcs','Food','1310',1.000,1,5.00,50,50,50,NULL,'mushroom_do_pyaza.jpg',NULL,NULL,150.00,NULL,NULL,5.00,5.00,0.00,157.50),(310,'Veg Kofta Curry','Vegetable dumplings in tomato-onion gravy','veg_kofta_curry',3,'plate',1.000,'pcs','Food','1311',1.000,1,5.00,50,50,50,NULL,'veg_kofta_curry.jpg',NULL,NULL,160.00,NULL,NULL,5.00,5.00,0.00,168.00),(311,'Tawa Chapati','Soft whole wheat chapati','tawa_chapati',3,'piece',1.000,'pcs','Food','1312',1.000,1,5.00,50,50,50,NULL,'tawa_chapati.jpg',NULL,NULL,18.00,NULL,NULL,5.00,5.00,0.00,18.90),(312,'Veg Hyderabadi','Spicy Hyderabadi-style mixed veg curry','veg_hyderabadi',3,'plate',1.000,'pcs','Food','1313',1.000,1,5.00,50,50,50,NULL,'veg_hyderabadi.jpg',NULL,NULL,155.00,NULL,NULL,5.00,5.00,0.00,162.75),(314,'Congress Kadlekai','Roasted Peanuts','congress-kadlekai',3,'packets',1.000,'kg',NULL,NULL,1.000,0,0.00,0,0,0,100,NULL,0.00,0.00,0.00,133.00,0.00,0.00,0.00,0.00,0.00),(315,'Saarin Pudi','Classic spiced rasam powder',NULL,NULL,'Jar',NULL,NULL,'Condiments',NULL,1.000,NULL,NULL,NULL,NULL,NULL,80,NULL,NULL,NULL,NULL,55.00,NULL,NULL,NULL,NULL,55.00),(316,'Chutney Pudi','Roasted lentil & spice chutney powder',NULL,NULL,'Jar',NULL,NULL,'Condiments',NULL,1.000,NULL,NULL,NULL,NULL,NULL,100,NULL,NULL,NULL,NULL,60.00,NULL,NULL,NULL,NULL,60.00),(317,'Congress Mixture','Crunchy peanut mixture',NULL,NULL,'Pack',NULL,NULL,'Condiments',NULL,1.000,NULL,NULL,NULL,NULL,NULL,120,NULL,NULL,NULL,NULL,70.00,NULL,NULL,NULL,NULL,70.00),(318,'Tomato Thokku','Slow-cooked tomato relish',NULL,NULL,'Jar',NULL,NULL,'Condiments',NULL,1.000,NULL,NULL,NULL,NULL,NULL,60,NULL,NULL,NULL,NULL,95.00,NULL,NULL,NULL,NULL,95.00),(319,'Puliyogare Gojju','Tamarind-spice paste for puliyogare',NULL,NULL,'Jar',NULL,NULL,'Condiments',NULL,1.000,NULL,NULL,NULL,NULL,NULL,90,NULL,NULL,NULL,NULL,110.00,NULL,NULL,NULL,NULL,110.00);
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `legacy_combo_map`
--

DROP TABLE IF EXISTS `legacy_combo_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legacy_combo_map` (
  `legacy_item_id` int NOT NULL,
  `combo_id` int NOT NULL,
  `migrated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`legacy_item_id`),
  KEY `fk_legacy_combo` (`combo_id`),
  CONSTRAINT `fk_legacy_combo` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `legacy_combo_map`
--

LOCK TABLES `legacy_combo_map` WRITE;
/*!40000 ALTER TABLE `legacy_combo_map` DISABLE KEYS */;
/*!40000 ALTER TABLE `legacy_combo_map` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `menu_id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `is_festival` tinyint(1) NOT NULL DEFAULT '0',
  `is_released` tinyint(1) NOT NULL DEFAULT '0',
  `period_type` enum('one_day','subscription','all_days') DEFAULT NULL,
  `city_code` varchar(3) NOT NULL DEFAULT 'MYS',
  `bld_id` int NOT NULL,
  `is_production_generated` tinyint(1) DEFAULT '0',
  `menu_type` varchar(20) NOT NULL DEFAULT 'ONE_DAY',
  PRIMARY KEY (`menu_id`),
  KEY `fk_menu_bld` (`bld_id`),
  CONSTRAINT `fk_menu_bld` FOREIGN KEY (`bld_id`) REFERENCES `bld` (`bld_id`)
) ENGINE=InnoDB AUTO_INCREMENT=203 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES (1,'2025-03-08',0,0,NULL,'MYS',1,0,'ONE_DAY'),(2,'2025-03-08',0,0,NULL,'MYS',2,0,'ONE_DAY'),(3,'2025-03-08',0,0,NULL,'MYS',3,0,'ONE_DAY'),(4,'2025-06-15',0,0,'one_day','MYS',1,0,'ONE_DAY'),(5,'2025-06-16',0,0,'one_day','MYS',1,0,'ONE_DAY'),(6,'2025-06-15',0,0,'subscription','MYS',2,0,'ONE_DAY'),(7,'2025-06-18',1,0,NULL,'MYS',1,0,'ONE_DAY'),(8,'2025-06-02',0,0,'one_day','MYS',1,0,'ONE_DAY'),(10,'2025-07-24',0,0,'one_day','MYS',2,0,'ONE_DAY'),(11,'2025-07-02',0,0,'one_day','MYS',1,0,'ONE_DAY'),(12,'2025-07-01',0,0,'one_day','MYS',1,0,'ONE_DAY'),(13,'2025-07-30',0,0,'one_day','MYS',1,0,'ONE_DAY'),(14,'2025-07-29',0,0,'one_day','MYS',1,0,'ONE_DAY'),(15,'2025-08-19',0,0,'one_day','MYS',2,0,'ONE_DAY'),(16,'2025-06-04',0,0,'one_day','MYS',1,0,'ONE_DAY'),(17,'2025-06-04',0,0,'one_day','MYS',3,0,'ONE_DAY'),(18,'2025-06-09',0,0,'one_day','MYS',1,0,'ONE_DAY'),(19,'2025-07-14',0,0,'one_day','MYS',1,0,'ONE_DAY'),(20,'2025-07-05',0,0,'one_day','MYS',1,0,'ONE_DAY'),(21,'2025-08-04',0,0,'one_day','MYS',1,0,'ONE_DAY'),(22,'2025-08-05',0,0,'one_day','MYS',1,0,'ONE_DAY'),(23,'2025-08-06',0,0,'one_day','MYS',1,0,'ONE_DAY'),(24,'2025-10-06',0,1,'one_day','MYS',1,0,'ONE_DAY'),(25,'2025-10-06',0,1,'one_day','MYS',2,0,'ONE_DAY'),(26,'2025-10-08',0,1,'one_day','MYS',2,0,'ONE_DAY'),(27,'2025-10-08',0,1,'one_day','MYS',3,0,'ONE_DAY'),(28,'2025-10-15',0,1,'one_day','MYS',1,0,'ONE_DAY'),(29,'2025-10-16',0,1,'one_day','MYS',1,1,'ONE_DAY'),(30,'2025-10-16',0,1,'one_day','MYS',2,0,'ONE_DAY'),(31,'2025-10-17',0,1,'one_day','MYS',1,1,'ONE_DAY'),(32,'2025-10-17',0,1,'one_day','MYS',2,1,'ONE_DAY'),(33,'2025-10-17',0,1,'one_day','MYS',3,1,'ONE_DAY'),(34,'2025-10-18',0,1,'one_day','MYS',1,1,'ONE_DAY'),(35,'2025-10-18',0,1,'one_day','MYS',3,1,'ONE_DAY'),(36,'2025-10-21',0,1,'one_day','MYS',1,1,'ONE_DAY'),(37,'2025-10-21',0,0,'one_day','MYS',2,0,'ONE_DAY'),(38,'2025-10-21',0,0,'one_day','MYS',3,0,'ONE_DAY'),(39,'2025-10-21',0,1,'one_day','MYS',4,0,'ONE_DAY'),(40,'2025-10-22',0,1,'one_day','MYS',1,1,'ONE_DAY'),(41,'2025-10-23',0,1,'one_day','MYS',1,1,'ONE_DAY'),(42,'2025-10-23',0,1,'one_day','MYS',2,1,'ONE_DAY'),(43,'2025-10-23',0,1,'one_day','MYS',3,1,'ONE_DAY'),(47,'2025-10-25',0,1,'one_day','MYS',1,0,'ONE_DAY'),(48,'2025-10-25',0,1,'one_day','MYS',2,0,'ONE_DAY'),(49,'2025-10-25',0,0,'one_day','MYS',3,0,'ONE_DAY'),(63,'2025-10-24',0,1,'one_day','MYS',1,1,'ONE_DAY'),(64,'2025-10-24',0,1,'one_day','MYS',2,0,'ONE_DAY'),(65,'2025-10-24',0,0,'one_day','MYS',3,0,'ONE_DAY'),(66,'2025-10-28',0,1,'one_day','MYS',1,1,'ONE_DAY'),(67,'2025-10-28',0,1,'one_day','MYS',2,1,'ONE_DAY'),(68,'2025-10-28',0,0,'one_day','MYS',3,0,'ONE_DAY'),(72,'2025-10-29',0,1,'one_day','MYS',1,0,'ONE_DAY'),(73,'2025-10-29',0,1,'one_day','MYS',2,0,'ONE_DAY'),(74,'2025-10-29',0,0,'one_day','MYS',3,0,'ONE_DAY'),(79,'2025-10-30',0,1,'one_day','MYS',1,0,'ONE_DAY'),(80,'2025-10-30',0,1,'one_day','MYS',2,0,'ONE_DAY'),(81,'2025-10-30',0,0,'one_day','MYS',3,0,'ONE_DAY'),(82,'2025-10-31',0,1,'one_day','MYS',1,0,'ONE_DAY'),(83,'2025-10-31',0,1,'one_day','MYS',2,0,'ONE_DAY'),(84,'2025-10-31',0,0,'one_day','MYS',3,0,'ONE_DAY'),(88,'2025-11-03',0,0,'one_day','MYS',1,1,'ONE_DAY'),(89,'2025-11-03',0,1,'one_day','MYS',2,1,'ONE_DAY'),(90,'2025-11-03',0,1,'one_day','MYS',3,1,'ONE_DAY'),(91,'2025-11-04',0,1,'one_day','MYS',1,1,'ONE_DAY'),(92,'2025-11-04',0,1,'one_day','MYS',2,1,'ONE_DAY'),(93,'2025-11-04',0,1,'one_day','MYS',3,0,'ONE_DAY'),(175,'2025-11-09',0,1,'one_day','MYS',1,0,'ONE_DAY'),(176,'2025-11-09',0,1,'one_day','MYS',2,0,'ONE_DAY'),(177,'2025-11-09',0,0,'one_day','MYS',3,0,'ONE_DAY'),(187,'2025-11-21',0,1,'one_day','MYS',1,0,'ONE_DAY'),(188,'2025-11-21',0,1,'one_day','MYS',2,0,'ONE_DAY'),(189,'2025-11-21',0,0,'one_day','MYS',3,0,'ONE_DAY'),(190,NULL,0,1,NULL,'MYS',4,0,'CONDIMENTS'),(191,'2025-12-05',0,1,'one_day','MYS',1,0,'ONE_DAY'),(192,'2025-12-05',0,1,'one_day','MYS',2,0,'ONE_DAY'),(193,'2025-12-05',0,0,'one_day','MYS',3,0,'ONE_DAY'),(194,'2026-01-03',0,1,'one_day','MYS',1,1,'ONE_DAY'),(195,'2026-01-03',0,1,'one_day','MYS',2,1,'ONE_DAY'),(196,'2026-01-03',0,0,'one_day','MYS',3,0,'ONE_DAY'),(197,'2026-01-15',0,1,'one_day','MYS',1,0,'ONE_DAY'),(198,'2026-01-15',0,1,'one_day','MYS',2,0,'ONE_DAY'),(199,'2026-01-15',0,0,'one_day','MYS',3,0,'ONE_DAY'),(200,'2026-01-27',0,1,'one_day','MYS',1,1,'ONE_DAY'),(201,'2026-01-27',0,1,'one_day','MYS',2,1,'ONE_DAY'),(202,'2026-01-27',0,0,'one_day','MYS',3,0,'ONE_DAY');
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
  `max_qty` int DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=2813 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,1,1,1,50,30.00,1,1,0,0.00,0.00),(2,1,2,1,40,50.00,1,2,0,0.00,0.00),(3,2,3,1,60,80.00,1,1,0,0.00,0.00),(4,2,4,2,50,90.00,1,2,0,0.00,0.00),(13,6,4,3,80,120.00,1,1,0,0.00,0.00),(14,6,5,3,60,150.00,0,2,0,0.00,0.00),(15,7,6,4,50,140.00,1,1,0,0.00,0.00),(16,7,7,4,30,100.00,0,2,0,0.00,0.00),(25,8,1,1,12,31.50,0,1,0,0.00,0.00),(26,8,2,1,1,52.50,0,1,0,0.00,0.00),(27,8,5,1,1,44.00,0,1,0,0.00,0.00),(53,10,3,1,1,84.00,0,1,0,0.00,0.00),(54,10,29,2,1,165.00,0,1,0,0.00,0.00),(55,10,30,2,1,176.00,0,1,0,0.00,0.00),(56,10,4,2,1,94.50,0,1,0,0.00,0.00),(57,11,1,1,1,31.50,0,1,0,0.00,0.00),(58,11,2,1,1,52.50,0,1,0,0.00,0.00),(59,11,5,1,1,44.00,0,1,0,0.00,0.00),(60,5,1,2,100,30.00,1,1,0,0.00,0.00),(61,5,2,2,50,40.00,0,2,0,0.00,0.00),(62,12,1,1,1,31.50,0,1,0,0.00,0.00),(63,12,2,1,1,52.50,0,1,0,0.00,0.00),(64,12,7,1,1,38.50,0,1,0,0.00,0.00),(65,13,1,1,1555,31.50,0,1,0,0.00,0.00),(66,14,2,1,444,52.50,0,1,0,0.00,0.00),(67,15,3,1,33,84.00,0,1,0,0.00,0.00),(68,15,4,2,1,94.50,0,1,0,0.00,0.00),(71,4,1,2,3000,30.00,1,1,0,0.00,0.00),(72,4,2,2,50,40.00,0,2,0,0.00,0.00),(91,17,9,1,10,44.00,0,1,10,0.00,0.00),(92,16,1,1,19,31.50,0,1,22,0.00,0.00),(93,16,2,1,27,52.50,0,2,17,0.00,0.00),(94,16,6,1,6,49.50,0,3,6,0.00,0.00),(95,18,1,1,50,31.50,0,1,50,0.00,0.00),(96,18,5,1,1,44.00,0,1,1,0.00,0.00),(97,18,27,1,1,66.00,0,1,1,0.00,0.00),(129,20,1,1,10,31.50,0,1,1,0.00,0.00),(130,20,8,1,10,55.00,0,1,1,0.00,0.00),(131,20,14,1,10,60.50,0,1,1,0.00,0.00),(132,20,15,1,10,44.00,0,1,1,0.00,0.00),(139,19,2,1,7,52.50,0,1,7,0.00,0.00),(140,19,8,1,0,55.00,0,1,0,0.00,0.00),(141,19,13,1,3,71.50,0,1,3,0.00,0.00),(142,21,1,1,100,31.50,0,1,100,0.00,0.00),(143,21,2,1,1,52.50,0,1,1,0.00,0.00),(144,22,1,1,1,31.50,0,1,1,0.00,0.00),(146,23,1,1,1,31.50,0,1,1,0.00,0.00),(224,24,2,1,7,52.50,0,1,7,0.00,0.00),(225,24,8,1,5,55.00,0,1,5,0.00,0.00),(226,24,13,1,4,71.50,0,1,4,0.00,0.00),(227,24,17,1,3,55.00,0,1,3,0.00,0.00),(235,25,36,2,10,143.00,0,1,10,0.00,0.00),(236,25,40,2,8,110.00,0,1,8,0.00,0.00),(237,25,48,2,10,33.00,0,1,10,0.00,0.00),(238,25,41,2,91,22.00,0,1,91,0.00,0.00),(239,25,212,2,99,105.00,0,1,99,0.00,0.00),(240,25,46,2,33,121.00,0,1,33,0.00,0.00),(241,25,50,2,13,66.00,0,1,13,0.00,0.00),(254,26,4,2,100,94.50,0,1,0,0.00,0.00),(255,26,36,2,50,143.00,0,1,50,0.00,0.00),(256,26,48,2,50,33.00,0,1,50,0.00,0.00),(257,26,41,2,100,22.00,0,1,100,0.00,0.00),(268,27,301,3,50,136.50,0,1,50,0.00,0.00),(269,27,305,3,50,115.50,0,1,50,0.00,0.00),(270,27,309,3,25,157.50,0,1,25,0.00,0.00),(271,27,310,3,50,168.00,0,1,50,0.00,0.00),(272,27,302,3,50,126.00,0,5,50,0.00,0.00),(273,27,311,3,100,18.90,0,5,100,0.00,0.00),(286,28,10,1,100,55.00,0,1,0,0.00,0.00),(287,28,14,1,50,60.50,0,1,50,0.00,0.00),(288,28,18,1,45,49.50,0,1,45,0.00,0.00),(313,29,8,1,200,55.00,0,1,0,0.00,0.00),(314,29,13,1,150,71.50,0,1,150,0.00,0.00),(315,29,17,1,50,55.00,0,1,50,0.00,0.00),(321,30,36,2,150,143.00,0,1,150,0.00,0.00),(322,30,40,2,100,110.00,0,1,100,0.00,0.00),(323,30,48,2,50,33.00,0,1,50,0.00,0.00),(324,30,37,2,100,132.00,0,1,100,0.00,0.00),(325,30,31,2,50,187.00,0,1,50,0.00,0.00),(349,32,3,1,150,84.00,0,1,146,30.00,180.00),(350,32,4,2,100,94.50,0,1,100,20.00,120.00),(352,33,9,1,200,44.00,0,1,199,20.00,220.00),(384,31,2,NULL,150,15.00,0,1,0,0.00,0.00),(385,31,3,NULL,100,30.00,0,2,100,0.00,0.00),(386,31,15,1,100,44.00,0,3,100,0.00,0.00),(387,31,19,1,100,55.00,0,3,100,0.00,0.00),(388,31,23,1,100,49.50,0,3,100,0.00,0.00),(389,31,27,1,100,66.00,0,3,100,0.00,0.00),(390,31,8,1,100,55.00,0,7,100,0.00,0.00),(397,34,2,1,110,52.50,0,1,96,10.00,120.00),(398,34,1,1,150,31.50,0,2,148,15.00,165.00),(399,34,12,1,200,77.00,0,3,200,20.00,220.00),(404,35,305,3,14,115.50,0,1,14,1.00,15.00),(405,35,301,3,21,136.50,0,2,21,1.00,22.00),(406,35,9,1,144,44.00,0,3,144,7.00,151.00),(407,35,304,3,15,157.50,0,4,15,1.00,16.00),(473,37,41,2,1,22.00,0,1,1,0.00,0.00),(474,37,45,2,1,110.00,0,2,1,0.00,0.00),(475,37,49,2,1,44.00,0,3,1,0.00,0.00),(476,37,53,2,1,99.00,0,4,1,0.00,0.00),(479,38,310,3,1,168.00,0,1,1,0.00,0.00),(480,38,311,3,1,18.90,0,2,1,0.00,0.00),(557,36,23,1,100,49.50,0,1,100,0.00,0.00),(558,36,20,1,50,44.00,0,2,50,0.00,0.00),(559,36,16,1,150,66.00,0,3,150,0.00,0.00),(560,36,6,1,50,49.50,0,4,50,0.00,0.00),(561,36,5,1,50,44.00,0,5,50,0.00,0.00),(562,36,1,1,150,31.50,0,6,150,0.00,0.00),(563,36,2,1,75,52.50,0,7,75,0.00,0.00),(564,36,18,1,1,49.50,0,8,1,0.00,0.00),(571,40,8,1,21,55.00,0,1,0,0.00,21.00),(572,40,13,1,1,71.50,0,2,18,0.00,1.00),(573,40,17,1,1,55.00,0,3,47,0.00,1.00),(574,40,21,1,1,60.50,0,4,41,0.00,1.00),(575,40,6,1,1,49.50,0,5,493,0.00,1.00),(576,40,10,1,1,55.00,0,6,48,0.00,1.00),(601,41,8,1,100,55.00,0,1,100,0.00,100.00),(602,41,13,1,100,71.50,0,2,100,0.00,100.00),(603,41,17,1,95,55.00,0,3,95,0.00,95.00),(607,42,41,2,110,22.00,0,1,100,10.00,110.00),(608,42,33,2,110,143.00,0,2,100,10.00,110.00),(609,42,37,2,105,132.00,0,3,95,10.00,105.00),(612,43,309,3,105,157.50,0,1,100,5.00,105.00),(613,43,310,3,89,168.00,0,2,85,4.00,89.00),(1170,64,40,2,80,100.00,1,1,80,0.00,0.00),(1171,64,212,2,80,100.00,1,2,80,0.00,0.00),(1172,64,34,2,80,80.00,1,3,80,0.00,0.00),(1173,64,203,2,80,120.00,1,4,80,0.00,0.00),(1174,64,39,2,80,120.00,1,5,80,0.00,0.00),(1175,64,4,2,80,90.00,1,6,80,0.00,0.00),(1176,64,33,2,80,130.00,1,7,80,0.00,0.00),(1177,64,47,2,80,80.00,1,8,80,0.00,0.00),(1178,65,9,1,60,44.00,1,1,60,0.00,0.00),(1179,65,305,3,60,110.00,1,2,60,0.00,0.00),(1180,65,302,3,60,120.00,1,3,60,0.00,0.00),(1181,65,307,3,60,90.00,1,4,60,0.00,0.00),(1182,65,306,3,60,50.00,1,5,60,0.00,0.00),(1183,65,309,3,60,150.00,1,6,60,0.00,0.00),(1184,65,308,3,60,140.00,1,7,60,0.00,0.00),(1185,65,303,3,60,170.00,1,8,60,0.00,0.00),(1206,63,19,1,53,50.00,1,1,50,0.00,0.00),(1207,63,13,1,53,65.00,1,2,50,0.00,0.00),(1208,63,12,1,53,70.00,1,3,50,0.00,0.00),(1209,63,14,1,53,55.00,1,4,50,0.00,0.00),(1210,63,2,1,53,50.00,1,5,50,0.00,0.00),(1211,63,17,1,53,50.00,1,6,50,0.00,0.00),(1212,63,1,1,53,30.00,1,7,50,0.00,0.00),(1213,63,20,1,53,40.00,1,8,50,0.00,0.00),(1214,63,15,1,151,44.00,0,9,144,0.00,0.00),(1215,63,26,1,151,38.50,0,10,144,0.00,0.00),(1216,47,19,1,50,50.00,1,1,42,0.00,0.00),(1217,47,13,1,50,65.00,1,2,50,0.00,0.00),(1218,47,12,1,50,70.00,1,3,50,0.00,0.00),(1219,47,14,1,50,55.00,1,4,47,0.00,0.00),(1220,47,2,1,50,50.00,1,5,50,0.00,0.00),(1221,47,17,1,50,50.00,1,6,50,0.00,0.00),(1222,47,1,1,50,30.00,1,7,50,0.00,0.00),(1223,47,20,1,50,40.00,1,8,50,0.00,0.00),(1224,48,40,2,80,100.00,1,1,80,0.00,0.00),(1225,48,212,2,80,100.00,1,2,80,0.00,0.00),(1226,48,34,2,80,80.00,1,3,80,0.00,0.00),(1227,48,203,2,80,120.00,1,4,80,0.00,0.00),(1228,48,39,2,80,120.00,1,5,80,0.00,0.00),(1229,48,4,2,80,90.00,1,6,80,0.00,0.00),(1230,48,33,2,80,130.00,1,7,80,0.00,0.00),(1231,48,47,2,80,80.00,1,8,80,0.00,0.00),(1232,49,9,1,60,44.00,1,1,60,0.00,0.00),(1233,49,305,3,60,110.00,1,2,60,0.00,0.00),(1234,49,302,3,60,120.00,1,3,60,0.00,0.00),(1235,49,307,3,60,90.00,1,4,60,0.00,0.00),(1236,49,306,3,60,50.00,1,5,60,0.00,0.00),(1237,49,309,3,60,150.00,1,6,60,0.00,0.00),(1238,49,308,3,60,140.00,1,7,60,0.00,0.00),(1239,49,303,3,60,170.00,1,8,60,0.00,0.00),(1248,67,40,2,84,100.00,1,1,80,4.00,84.00),(1249,67,212,2,84,100.00,1,2,80,4.00,84.00),(1250,67,34,2,84,80.00,1,3,80,4.00,84.00),(1251,67,203,2,84,120.00,1,4,80,4.00,84.00),(1252,67,39,2,84,120.00,1,5,80,4.00,84.00),(1253,67,4,2,84,90.00,1,6,80,4.00,84.00),(1254,67,33,2,84,130.00,1,7,80,4.00,84.00),(1255,67,47,2,84,80.00,1,8,80,4.00,84.00),(1256,68,9,1,60,44.00,1,1,60,0.00,0.00),(1257,68,305,3,60,110.00,1,2,60,0.00,0.00),(1258,68,302,3,60,120.00,1,3,60,0.00,0.00),(1259,68,307,3,60,90.00,1,4,60,0.00,0.00),(1260,68,306,3,60,50.00,1,5,60,0.00,0.00),(1261,68,309,3,60,150.00,1,6,60,0.00,0.00),(1262,68,308,3,60,140.00,1,7,60,0.00,0.00),(1263,68,303,3,60,170.00,1,8,60,0.00,0.00),(1272,66,19,1,53,50.00,1,1,0,0.00,0.00),(1273,66,13,1,53,65.00,1,2,50,0.00,0.00),(1274,66,12,1,53,70.00,1,3,50,0.00,0.00),(1275,66,14,1,53,55.00,1,4,50,0.00,0.00),(1276,66,2,1,53,50.00,1,5,50,0.00,0.00),(1277,66,17,1,53,50.00,1,6,50,0.00,0.00),(1278,66,1,1,53,30.00,1,7,50,0.00,0.00),(1279,66,20,1,53,40.00,1,8,50,0.00,0.00),(1352,74,9,1,60,44.00,1,1,60,0.00,0.00),(1353,74,305,3,60,110.00,1,2,60,0.00,0.00),(1354,74,302,3,60,120.00,1,3,60,0.00,0.00),(1355,74,307,3,60,90.00,1,4,60,0.00,0.00),(1356,74,306,3,60,50.00,1,5,60,0.00,0.00),(1357,74,309,3,60,150.00,1,6,60,0.00,0.00),(1358,74,308,3,60,140.00,1,7,60,0.00,0.00),(1359,74,303,3,60,170.00,1,8,60,0.00,0.00),(1368,73,40,2,80,100.00,1,1,80,0.00,0.00),(1369,73,212,2,80,100.00,1,2,80,0.00,0.00),(1370,73,34,2,80,80.00,1,3,80,0.00,0.00),(1371,73,203,2,80,120.00,1,4,80,0.00,0.00),(1372,73,39,2,80,120.00,1,5,80,0.00,0.00),(1373,73,4,2,80,90.00,1,6,80,0.00,0.00),(1374,73,33,2,80,130.00,1,7,80,0.00,0.00),(1375,73,47,2,80,80.00,1,8,80,0.00,0.00),(1400,72,19,1,50,50.00,1,1,50,0.00,0.00),(1401,72,13,1,50,65.00,1,2,0,0.00,0.00),(1402,72,12,1,50,70.00,1,3,50,0.00,0.00),(1403,72,14,1,50,55.00,1,4,50,0.00,0.00),(1404,72,2,1,50,50.00,1,5,50,0.00,0.00),(1405,72,17,1,50,50.00,1,6,50,0.00,0.00),(1406,72,1,1,50,30.00,1,7,48,0.00,0.00),(1407,72,20,1,50,40.00,1,8,50,0.00,0.00),(1472,79,19,1,50,50.00,1,1,50,0.00,0.00),(1473,79,13,1,50,65.00,1,2,50,0.00,0.00),(1474,79,12,1,50,70.00,1,3,50,0.00,0.00),(1475,79,14,1,50,55.00,1,4,50,0.00,0.00),(1476,79,2,1,50,50.00,1,5,50,0.00,0.00),(1477,79,17,1,50,50.00,1,6,50,0.00,0.00),(1478,79,1,1,50,30.00,1,7,50,0.00,0.00),(1479,79,20,1,50,40.00,1,8,50,0.00,0.00),(1480,80,40,2,80,100.00,1,1,80,0.00,0.00),(1481,80,212,2,80,100.00,1,2,80,0.00,0.00),(1482,80,34,2,80,80.00,1,3,80,0.00,0.00),(1483,80,203,2,80,120.00,1,4,80,0.00,0.00),(1484,80,39,2,80,120.00,1,5,80,0.00,0.00),(1485,80,4,2,80,90.00,1,6,80,0.00,0.00),(1486,80,33,2,80,130.00,1,7,80,0.00,0.00),(1487,80,47,2,80,80.00,1,8,80,0.00,0.00),(1488,81,9,1,60,44.00,1,1,60,0.00,0.00),(1489,81,305,3,60,110.00,1,2,60,0.00,0.00),(1490,81,302,3,60,120.00,1,3,60,0.00,0.00),(1491,81,307,3,60,90.00,1,4,60,0.00,0.00),(1492,81,306,3,60,50.00,1,5,60,0.00,0.00),(1493,81,309,3,60,150.00,1,6,60,0.00,0.00),(1494,81,308,3,60,140.00,1,7,60,0.00,0.00),(1495,81,303,3,60,170.00,1,8,60,0.00,0.00),(1496,82,19,1,65,50.00,1,1,65,0.00,0.00),(1497,82,13,1,65,65.00,1,2,65,0.00,0.00),(1498,82,12,1,65,70.00,1,3,65,0.00,0.00),(1499,82,14,1,65,55.00,1,4,65,0.00,0.00),(1500,82,2,1,65,50.00,1,5,65,0.00,0.00),(1501,82,17,1,65,50.00,1,6,65,0.00,0.00),(1502,82,1,1,65,30.00,1,7,65,0.00,0.00),(1503,82,20,1,65,40.00,1,8,65,0.00,0.00),(1504,83,40,2,80,100.00,1,1,80,0.00,0.00),(1505,83,212,2,80,100.00,1,2,80,0.00,0.00),(1506,83,34,2,80,80.00,1,3,80,0.00,0.00),(1507,83,203,2,80,120.00,1,4,80,0.00,0.00),(1508,83,39,2,80,120.00,1,5,80,0.00,0.00),(1509,83,4,2,80,90.00,1,6,80,0.00,0.00),(1510,83,33,2,80,130.00,1,7,80,0.00,0.00),(1511,83,47,2,80,80.00,1,8,80,0.00,0.00),(1512,84,9,1,60,44.00,1,1,60,0.00,0.00),(1513,84,305,3,60,110.00,1,2,60,0.00,0.00),(1514,84,302,3,60,120.00,1,3,60,0.00,0.00),(1515,84,307,3,60,90.00,1,4,60,0.00,0.00),(1516,84,306,3,60,50.00,1,5,60,0.00,0.00),(1517,84,309,3,60,150.00,1,6,60,0.00,0.00),(1518,84,308,3,60,140.00,1,7,60,0.00,0.00),(1519,84,303,3,60,170.00,1,8,60,0.00,0.00),(1576,90,9,1,53,44.00,1,1,50,3.00,53.00),(1577,90,305,3,53,110.00,1,2,50,3.00,53.00),(1578,90,302,3,53,120.00,1,3,50,3.00,53.00),(1579,90,307,3,53,90.00,1,4,50,3.00,53.00),(1580,90,306,3,53,50.00,1,5,50,3.00,53.00),(1581,90,309,3,53,150.00,1,6,50,3.00,53.00),(1582,90,308,3,53,140.00,1,7,50,3.00,53.00),(1583,90,303,3,53,170.00,1,8,50,3.00,53.00),(1584,91,19,1,53,50.00,1,1,50,3.00,53.00),(1585,91,13,1,53,65.00,1,2,50,3.00,53.00),(1586,91,12,1,53,70.00,1,3,50,3.00,53.00),(1587,91,14,1,53,55.00,1,4,50,3.00,53.00),(1588,91,2,1,53,50.00,1,5,50,3.00,53.00),(1589,91,17,1,53,50.00,1,6,50,3.00,53.00),(1590,91,1,1,53,30.00,1,7,50,3.00,53.00),(1591,91,20,1,53,40.00,1,8,50,3.00,53.00),(1592,92,40,2,53,100.00,1,1,50,3.00,53.00),(1593,92,212,2,53,100.00,1,2,50,3.00,53.00),(1594,92,34,2,53,80.00,1,3,50,3.00,53.00),(1595,92,203,2,53,120.00,1,4,50,3.00,53.00),(1596,92,39,2,53,120.00,1,5,50,3.00,53.00),(1597,92,4,2,53,90.00,1,6,50,3.00,53.00),(1598,92,33,2,53,130.00,1,7,50,3.00,53.00),(1599,92,47,2,53,80.00,1,8,50,3.00,53.00),(1608,93,9,1,50,44.00,1,1,50,0.00,0.00),(1609,93,305,3,50,110.00,1,2,50,0.00,0.00),(1610,93,302,3,50,120.00,1,3,50,0.00,0.00),(1611,93,307,3,50,90.00,1,4,50,0.00,0.00),(1612,93,306,3,50,50.00,1,5,50,0.00,0.00),(1613,93,309,3,50,150.00,1,6,50,0.00,0.00),(1614,93,308,3,50,140.00,1,7,50,0.00,0.00),(1615,93,303,3,50,170.00,1,8,50,0.00,0.00),(1670,89,212,2,53,100.00,1,2,50,0.00,0.00),(1671,89,34,2,53,80.00,1,3,50,0.00,0.00),(1672,89,203,2,53,120.00,1,4,50,0.00,0.00),(1673,89,39,2,53,120.00,1,5,50,0.00,0.00),(1674,89,4,2,53,90.00,1,6,50,0.00,0.00),(1675,89,33,2,53,130.00,1,7,50,0.00,0.00),(1676,89,47,2,53,80.00,1,8,50,0.00,0.00),(1677,89,40,2,30,110.00,0,8,30,0.00,0.00),(1703,88,19,1,53,50.00,1,1,50,0.00,0.00),(1704,88,13,1,53,65.00,1,2,50,0.00,0.00),(1705,88,12,1,53,70.00,1,3,50,0.00,0.00),(1706,88,14,1,53,55.00,1,4,50,0.00,0.00),(1707,88,2,1,53,50.00,1,5,50,0.00,0.00),(1708,88,17,1,53,50.00,1,6,50,0.00,0.00),(1709,88,1,1,53,30.00,1,7,50,0.00,0.00),(1710,88,20,1,53,40.00,1,8,50,0.00,0.00),(2439,175,19,1,150,50.00,1,1,105,8.00,158.00),(2440,175,13,1,50,65.00,0,2,50,3.00,53.00),(2441,175,12,1,50,70.00,0,3,50,3.00,53.00),(2442,175,14,1,50,55.00,0,4,50,3.00,53.00),(2443,175,2,1,50,50.00,0,5,50,3.00,53.00),(2444,175,17,1,50,50.00,0,6,50,3.00,53.00),(2445,175,1,1,50,30.00,0,7,50,3.00,53.00),(2446,175,20,1,50,40.00,0,8,50,3.00,53.00),(2447,176,40,2,40,100.00,1,1,40,0.00,0.00),(2448,176,212,2,50,100.00,0,2,50,0.00,0.00),(2449,176,34,2,50,80.00,0,3,50,0.00,0.00),(2450,176,203,2,50,120.00,0,4,50,0.00,0.00),(2451,176,39,2,50,120.00,0,5,50,0.00,0.00),(2452,176,4,2,50,90.00,0,6,50,0.00,0.00),(2453,176,33,2,50,130.00,0,7,50,0.00,0.00),(2454,176,47,2,50,80.00,0,8,50,0.00,0.00),(2455,177,9,1,50,44.00,0,1,50,0.00,0.00),(2456,177,305,3,50,110.00,0,2,50,0.00,0.00),(2457,177,302,3,50,120.00,0,3,50,0.00,0.00),(2458,177,307,3,50,90.00,0,4,50,0.00,0.00),(2459,177,306,3,50,50.00,0,5,50,0.00,0.00),(2460,177,309,3,50,150.00,0,6,50,0.00,0.00),(2461,177,308,3,50,140.00,0,7,50,0.00,0.00),(2462,177,303,3,50,170.00,0,8,50,0.00,0.00),(2607,187,19,1,50,50.00,1,1,45,0.00,0.00),(2608,187,13,1,50,65.00,0,2,44,0.00,0.00),(2609,187,12,1,50,70.00,0,3,45,0.00,0.00),(2610,187,14,1,50,55.00,0,4,41,0.00,0.00),(2611,187,2,1,50,50.00,0,5,43,0.00,0.00),(2612,187,17,1,50,50.00,0,6,46,0.00,0.00),(2613,187,1,1,50,30.00,0,7,39,0.00,0.00),(2614,187,20,1,50,40.00,0,8,48,0.00,0.00),(2615,188,40,2,40,100.00,1,1,34,0.00,0.00),(2616,188,212,2,50,100.00,0,2,47,0.00,0.00),(2617,188,34,2,50,80.00,0,3,46,0.00,0.00),(2618,188,203,2,50,120.00,0,4,45,0.00,0.00),(2619,188,39,2,50,120.00,0,5,46,0.00,0.00),(2620,188,4,2,50,90.00,0,6,44,0.00,0.00),(2621,188,33,2,50,130.00,0,7,43,0.00,0.00),(2622,188,47,2,50,80.00,0,8,41,0.00,0.00),(2623,189,9,1,50,44.00,0,1,50,0.00,0.00),(2624,189,305,3,50,110.00,0,2,50,0.00,0.00),(2625,189,302,3,50,120.00,0,3,50,0.00,0.00),(2626,189,307,3,50,90.00,0,4,50,0.00,0.00),(2627,189,306,3,50,50.00,0,5,50,0.00,0.00),(2628,189,309,3,50,150.00,0,6,50,0.00,0.00),(2629,189,308,3,50,140.00,0,7,50,0.00,0.00),(2630,189,303,3,50,170.00,0,8,50,0.00,0.00),(2637,191,19,1,50,50.00,1,1,50,0.00,0.00),(2638,191,13,1,50,65.00,0,2,50,0.00,0.00),(2639,191,12,1,50,70.00,0,3,50,0.00,0.00),(2640,191,14,1,50,55.00,0,4,50,0.00,0.00),(2641,191,2,1,50,50.00,0,5,50,0.00,0.00),(2642,191,17,1,50,50.00,0,6,50,0.00,0.00),(2643,191,1,1,50,30.00,0,7,50,0.00,0.00),(2644,191,20,1,50,40.00,0,8,50,0.00,0.00),(2645,192,40,2,40,100.00,1,1,40,0.00,0.00),(2646,192,212,2,50,100.00,0,2,50,0.00,0.00),(2647,192,34,2,50,80.00,0,3,50,0.00,0.00),(2648,192,203,2,50,120.00,0,4,50,0.00,0.00),(2649,192,39,2,50,120.00,0,5,50,0.00,0.00),(2650,192,4,2,50,90.00,0,6,50,0.00,0.00),(2651,192,33,2,50,130.00,0,7,50,0.00,0.00),(2652,192,47,2,50,80.00,0,8,50,0.00,0.00),(2653,193,9,1,50,44.00,0,1,50,0.00,0.00),(2654,193,305,3,50,110.00,0,2,50,0.00,0.00),(2655,193,302,3,50,120.00,0,3,50,0.00,0.00),(2656,193,307,3,50,90.00,0,4,50,0.00,0.00),(2657,193,306,3,50,50.00,0,5,50,0.00,0.00),(2658,193,309,3,50,150.00,0,6,50,0.00,0.00),(2659,193,308,3,50,140.00,0,7,50,0.00,0.00),(2660,193,303,3,50,170.00,0,8,50,0.00,0.00),(2683,196,9,1,50,44.00,0,1,50,0.00,0.00),(2684,196,305,3,50,110.00,0,2,50,0.00,0.00),(2685,196,302,3,50,120.00,0,3,50,0.00,0.00),(2686,196,307,3,50,90.00,0,4,50,0.00,0.00),(2687,196,306,3,50,50.00,0,5,50,0.00,0.00),(2688,196,309,3,50,150.00,0,6,50,0.00,0.00),(2689,196,308,3,50,140.00,0,7,50,0.00,0.00),(2690,196,303,3,50,170.00,0,8,50,0.00,0.00),(2697,195,40,2,40,100.00,1,1,35,2.00,42.00),(2698,195,212,2,50,100.00,0,2,49,3.00,53.00),(2699,195,34,2,50,80.00,0,3,50,3.00,53.00),(2700,195,203,2,50,120.00,0,4,47,3.00,53.00),(2701,195,39,2,50,120.00,0,5,48,3.00,53.00),(2702,195,4,2,50,90.00,0,6,46,3.00,53.00),(2703,195,33,2,50,130.00,0,7,50,3.00,53.00),(2704,195,47,2,50,80.00,0,8,48,3.00,53.00),(2714,194,19,1,50,50.00,1,1,5,0.00,0.00),(2715,194,13,1,50,65.00,0,2,47,0.00,0.00),(2716,194,12,1,50,70.00,0,3,49,0.00,0.00),(2717,194,14,1,50,55.00,0,4,48,0.00,0.00),(2718,194,2,1,50,50.00,0,5,45,0.00,0.00),(2719,194,17,1,50,50.00,0,6,50,0.00,0.00),(2720,194,1,1,50,30.00,0,7,50,0.00,0.00),(2721,194,20,1,50,40.00,0,8,50,0.00,0.00),(2722,194,16,1,50,60.00,0,9,44,0.00,0.00),(2723,197,19,1,50,50.00,1,1,50,0.00,0.00),(2724,197,13,1,50,65.00,0,2,50,0.00,0.00),(2725,197,12,1,50,70.00,0,3,50,0.00,0.00),(2726,197,14,1,50,55.00,0,4,50,0.00,0.00),(2727,197,2,1,50,50.00,0,5,50,0.00,0.00),(2728,197,17,1,50,50.00,0,6,50,0.00,0.00),(2729,197,1,1,50,30.00,0,7,50,0.00,0.00),(2730,197,20,1,50,40.00,0,8,50,0.00,0.00),(2731,198,40,2,40,100.00,1,1,40,0.00,0.00),(2732,198,212,2,50,100.00,0,2,50,0.00,0.00),(2733,198,34,2,50,80.00,0,3,50,0.00,0.00),(2734,198,203,2,50,120.00,0,4,50,0.00,0.00),(2735,198,39,2,50,120.00,0,5,50,0.00,0.00),(2736,198,4,2,50,90.00,0,6,50,0.00,0.00),(2737,198,33,2,50,130.00,0,7,50,0.00,0.00),(2738,198,47,2,50,80.00,0,8,50,0.00,0.00),(2739,199,9,1,50,44.00,0,1,50,0.00,0.00),(2740,199,305,3,50,110.00,0,2,50,0.00,0.00),(2741,199,302,3,50,120.00,0,3,50,0.00,0.00),(2742,199,307,3,50,90.00,0,4,50,0.00,0.00),(2743,199,306,3,50,50.00,0,5,50,0.00,0.00),(2744,199,309,3,50,150.00,0,6,50,0.00,0.00),(2745,199,308,3,50,140.00,0,7,50,0.00,0.00),(2746,199,303,3,50,170.00,0,8,50,0.00,0.00),(2783,200,19,1,50,50.00,1,1,46,3.00,53.00),(2784,200,13,1,50,65.00,0,2,50,3.00,53.00),(2785,200,12,1,50,70.00,0,3,50,3.00,53.00),(2786,200,14,1,50,55.00,0,4,50,3.00,53.00),(2787,200,2,1,50,50.00,0,5,48,3.00,53.00),(2788,200,17,1,50,50.00,0,6,41,3.00,53.00),(2789,200,1,1,50,30.00,0,7,50,3.00,53.00),(2790,200,20,1,50,40.00,0,8,48,3.00,53.00),(2791,201,40,2,40,100.00,1,1,33,2.00,42.00),(2792,201,212,2,50,100.00,0,2,50,3.00,53.00),(2793,201,34,2,50,80.00,0,3,50,3.00,53.00),(2794,201,203,2,50,120.00,0,4,45,3.00,53.00),(2795,201,39,2,50,120.00,0,5,50,3.00,53.00),(2796,201,4,2,50,90.00,0,6,48,3.00,53.00),(2797,201,33,2,50,130.00,0,7,46,3.00,53.00),(2798,201,47,2,50,80.00,0,8,46,3.00,53.00),(2799,202,9,1,50,44.00,0,1,50,0.00,0.00),(2800,202,305,3,50,110.00,0,2,50,0.00,0.00),(2801,202,302,3,50,120.00,0,3,50,0.00,0.00),(2802,202,307,3,50,90.00,0,4,50,0.00,0.00),(2803,202,306,3,50,50.00,0,5,50,0.00,0.00),(2804,202,309,3,50,150.00,0,6,50,0.00,0.00),(2805,202,308,3,50,140.00,0,7,50,0.00,0.00),(2806,202,303,3,50,170.00,0,8,50,0.00,0.00),(2807,190,316,NULL,100,60.00,1,1,100,0.00,0.00),(2808,190,314,3,100,133.00,0,2,100,0.00,0.00),(2809,190,317,NULL,120,70.00,0,3,120,0.00,0.00),(2810,190,319,NULL,90,110.00,0,4,90,0.00,0.00),(2811,190,315,NULL,80,55.00,0,5,80,0.00,0.00),(2812,190,318,NULL,60,95.00,0,6,60,0.00,0.00);
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
) ENGINE=InnoDB AUTO_INCREMENT=461 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (439,252,2,1,50.00),(440,252,47,1,80.00),(441,253,33,2,130.00),(442,254,203,1,120.00),(443,254,17,2,50.00),(444,254,40,2,100.00),(445,255,203,1,120.00),(446,256,17,1,50.00),(447,256,47,3,80.00),(448,257,17,3,50.00),(449,257,19,1,50.00),(450,258,17,3,50.00),(451,258,33,2,130.00),(452,259,203,3,120.00),(453,259,40,2,100.00),(454,260,19,2,50.00),(455,261,4,2,90.00),(456,261,40,2,100.00),(457,261,20,2,40.00),(458,262,40,1,100.00),(459,263,2,1,50.00),(460,263,19,1,50.00);
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
  `cgst` decimal(10,2) DEFAULT '0.00',
  `sgst` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `order_type` varchar(50) DEFAULT 'one_time',
  `paid` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `address_id` (`address_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=264 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (252,65,49,176.80,'On the Way (Payment Due)','Cash',0.00,23.40,23.40,'2026-01-27 01:47:00','one_time',0),(253,25,44,353.60,'On the Way','Card',0.00,46.80,46.80,'2026-01-27 03:37:00','one_time',1),(254,65,49,571.20,'On the Way','Card',0.00,75.60,75.60,'2026-01-27 02:09:00','one_time',1),(255,66,50,163.20,'On the Way (Payment Due)','Cash',0.00,21.60,21.60,'2026-01-27 03:21:00','one_time',0),(256,25,44,394.40,'On the Way','Card',0.00,52.20,52.20,'2026-01-27 06:33:00','one_time',1),(257,25,44,272.00,'On the Way','Card',0.00,36.00,36.00,'2026-01-27 03:22:00','one_time',1),(258,13,5,557.60,'On the Way','Card',0.00,73.80,73.80,'2026-01-27 03:02:00','one_time',1),(259,65,49,761.60,'On the Way','Card',0.00,100.80,100.80,'2026-01-27 01:41:00','one_time',1),(260,13,5,136.00,'On the Way (Payment Due)','Cash',0.00,18.00,18.00,'2026-01-27 04:27:00','one_time',0),(261,25,44,625.60,'On the Way','Card',0.00,82.80,82.80,'2026-01-27 02:56:00','one_time',1),(262,25,44,136.00,'On the Way','Card',0.00,18.00,18.00,'2026-01-27 06:10:00','one_time',1),(263,66,50,136.00,'On the Way','UPI',0.00,18.00,18.00,'2026-01-27 05:45:00','one_time',1);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Administrator','Full platform administrator with all permissions.',1,'2025-10-29 15:34:19'),(2,'developer','Developer','Developer / technical tooling access.',1,'2025-10-29 15:34:19'),(4,'partner','Agent/Partner','asfd',0,'2025-10-30 07:18:02');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kk_v1'
--

--
-- Dumping routines for database 'kk_v1'
--

--
-- Current Database: `kk_v1`
--

USE `kk_v1`;

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

-- Dump completed on 2026-02-21 13:10:10
