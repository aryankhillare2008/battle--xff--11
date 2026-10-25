-- battleffx11 MySQL Database Schema
CREATE DATABASE IF NOT EXISTS battleff_db;
USE battleff_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  ff_uid VARCHAR(30) NOT NULL,
  ign VARCHAR(50) NOT NULL,
  wallet DECIMAL(10,2) DEFAULT 0.00,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  mode ENUM('Solo', 'Duo', 'Squad', 'Clash Squad') NOT NULL,
  map ENUM('Bermuda', 'Purgatory', 'Kalahari', 'NeXTerra') NOT NULL,
  entry_fee DECIMAL(10,2) NOT NULL,
  prize_pool DECIMAL(10,2) NOT NULL,
  per_kill DECIMAL(10,2) NOT NULL,
  total_slots INT NOT NULL,
  filled_slots INT DEFAULT 0,
  start_time DATETIME NOT NULL,
  status ENUM('upcoming', 'live', 'completed') DEFAULT 'upcoming',
  room_id VARCHAR(50),
  room_pass VARCHAR(50),
  winner VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('deposit', 'withdrawal', 'entry_fee', 'prize_won') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('success', 'pending', 'failed') DEFAULT 'success',
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
