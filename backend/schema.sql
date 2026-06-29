-- Finder 数据库初始化脚本 (MySQL 8.0+)
-- 执行前请先创建数据库: CREATE DATABASE fengxiangbiao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ID 统一使用应用层生成的 Snowflake ID，数据库类型为 BIGINT。

USE finder;

-- 1. users 表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  openid VARCHAR(64) UNIQUE NULL,
  unionid VARCHAR(64) NULL,
  username VARCHAR(64) NULL,
  password VARCHAR(255) NULL,
  nickname VARCHAR(64) NULL,
  avatar VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  location JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. shops 表
CREATE TABLE IF NOT EXISTS shops (
  id BIGINT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(32) NULL,
  address VARCHAR(255) NULL,
  location JSON NULL,
  city VARCHAR(32) NULL,
  cover_image VARCHAR(255) NULL,
  logo VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  business_hours VARCHAR(64) NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  review_count INT NOT NULL DEFAULT 0,
  summary_tags JSON NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city (city),
  INDEX idx_category (category),
  INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. chat_groups 表
CREATE TABLE IF NOT EXISTS chat_groups (
  id BIGINT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  city VARCHAR(32) NULL,
  district VARCHAR(32) NULL,
  center_lat DOUBLE NULL,
  center_lng DOUBLE NULL,
  coverage_radius INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. comments 表
CREATE TABLE IF NOT EXISTS comments (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT NOT NULL,
  author_id BIGINT NULL,
  title VARCHAR(128) NULL,
  content TEXT NULL,
  images JSON NULL,
  rating INT NULL,
  consume_record JSON NULL,
  like_count INT NOT NULL DEFAULT 0,
  is_fengxiangbiao BOOLEAN NOT NULL DEFAULT FALSE,
  fengxiangbiao_rank INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shop_id (shop_id),
  INDEX idx_author_id (author_id),
  INDEX idx_is_fengxiangbiao (is_fengxiangbiao),
  INDEX idx_fengxiangbiao_rank (fengxiangbiao_rank),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. messages 表
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT PRIMARY KEY,
  group_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  type VARCHAR(16) NOT NULL,
  content TEXT NULL,
  shop_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_id (group_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_shop_id (shop_id),
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. chat_online_users 表
CREATE TABLE IF NOT EXISTS chat_online_users (
  id BIGINT PRIMARY KEY,
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  last_active_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_user (group_id, user_id),
  INDEX idx_group_id (group_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. admins 表
CREATE TABLE IF NOT EXISTS admins (
  id BIGINT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(64) NULL,
  avatar VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  permissions JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化默认管理员：admin / 1qaz-2wsx
-- password 为 bcrypt hash，应用登录时通过 bcrypt.compare 校验。
INSERT IGNORE INTO admins (id, username, password, nickname, permissions)
VALUES (
  1,
  'admin',
  '$2b$10$EqGm8uNJqKMxGJnUOwQ3MuvqNaOCXERtXdOsR4w.LGqfmKzLE5n/K',
  '管理员',
  JSON_ARRAY('all')
);
