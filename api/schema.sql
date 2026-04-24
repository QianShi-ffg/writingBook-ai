-- --------------------------------------------------------
-- 数据库初始化脚本 (WritingBook-AI)
-- --------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `writingbook_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `writingbook_db`;

-- --------------------------------------------------------
-- 表结构: Books
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Books` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT '书籍ID (UUID)',
  `title` VARCHAR(255) NOT NULL COMMENT '书名',
  `type` VARCHAR(255) NOT NULL COMMENT '类型(如修仙、玄幻)',
  `description` LONGTEXT DEFAULT NULL COMMENT '简介',
  `outline` LONGTEXT DEFAULT NULL COMMENT '一句话大纲',
  `outlineTree` LONGTEXT DEFAULT NULL COMMENT '树状细化大纲(JSON)',
  `worldview` LONGTEXT DEFAULT NULL COMMENT '世界观背景设定',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍主表';

-- --------------------------------------------------------
-- 表结构: Chapters
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Chapters` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT '章节ID (UUID)',
  `bookId` CHAR(36) NOT NULL COMMENT '所属书籍ID',
  `volume` INT DEFAULT 1 COMMENT '卷号',
  `chapter` INT DEFAULT 1 COMMENT '章号',
  `title` VARCHAR(255) NOT NULL COMMENT '章节标题',
  `content` LONGTEXT DEFAULT NULL COMMENT '章节正文',
  `summary` LONGTEXT DEFAULT NULL COMMENT '本章剧情梳理',
  `wordCount` INT DEFAULT 0 COMMENT '字数',
  `status` VARCHAR(255) DEFAULT 'draft' COMMENT '状态(draft/reviewing/completed)',
  `reviewFeedback` LONGTEXT DEFAULT NULL COMMENT '主编审核意见',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chapters_book` FOREIGN KEY (`bookId`) REFERENCES `Books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节表';

-- --------------------------------------------------------
-- 表结构: Characters
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Characters` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT '角色ID (UUID)',
  `bookId` CHAR(36) NOT NULL COMMENT '所属书籍ID',
  `name` VARCHAR(255) NOT NULL COMMENT '角色名',
  `role` VARCHAR(255) DEFAULT NULL COMMENT '角色定位(如主角团、反派)',
  `personality` TEXT DEFAULT NULL COMMENT '性格特点',
  `abilities` TEXT DEFAULT NULL COMMENT '能力/功法',
  `status` VARCHAR(255) DEFAULT NULL COMMENT '生存状态(出场/未出场/死亡)',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_characters_book` FOREIGN KEY (`bookId`) REFERENCES `Books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色设定表';

-- --------------------------------------------------------
-- 表结构: Realms
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Realms` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT '境界ID (UUID)',
  `bookId` CHAR(36) NOT NULL COMMENT '所属书籍ID',
  `level` INT DEFAULT NULL COMMENT '境界层级(1, 2, 3...)',
  `name` VARCHAR(255) NOT NULL COMMENT '境界名称',
  `description` LONGTEXT DEFAULT NULL COMMENT '境界描述',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_realms_book` FOREIGN KEY (`bookId`) REFERENCES `Books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='境界体系表';

-- --------------------------------------------------------
-- 表结构: References
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `References` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT '资料ID (UUID)',
  `bookId` CHAR(36) NOT NULL COMMENT '所属书籍ID',
  `sourceName` VARCHAR(255) NOT NULL COMMENT '资料来源/名称',
  `content` LONGTEXT DEFAULT NULL COMMENT '资料内容',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_references_book` FOREIGN KEY (`bookId`) REFERENCES `Books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资料库表';

-- --------------------------------------------------------
-- 表结构: Clues (伏笔/暗线)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Clues` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT '伏笔ID (UUID)',
  `bookId` CHAR(36) NOT NULL COMMENT '所属书籍ID',
  `title` VARCHAR(255) NOT NULL COMMENT '伏笔标题',
  `content` LONGTEXT DEFAULT NULL COMMENT '伏笔内容/详情',
  `status` VARCHAR(255) DEFAULT 'active' COMMENT '状态(active未回收/resolved已回收)',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_clues_book` FOREIGN KEY (`bookId`) REFERENCES `Books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='伏笔暗线表';

-- --------------------------------------------------------
-- 表结构: Settings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Settings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  `llmProvider` VARCHAR(255) DEFAULT NULL COMMENT 'AI服务商',
  `baseUrl` VARCHAR(255) DEFAULT NULL COMMENT '大模型接口地址',
  `apiKey` VARCHAR(255) DEFAULT NULL COMMENT '大模型密钥',
  `model` VARCHAR(255) DEFAULT NULL COMMENT '模型名称',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统全局配置表';

-- --------------------------------------------------------
-- 索引优化建议 (可选)
-- --------------------------------------------------------
CREATE INDEX `idx_chapters_book` ON `Chapters` (`bookId`);
CREATE INDEX `idx_characters_book` ON `Characters` (`bookId`);
CREATE INDEX `idx_realms_book` ON `Realms` (`bookId`);
CREATE INDEX `idx_references_book` ON `References` (`bookId`);
CREATE INDEX `idx_clues_book` ON `Clues` (`bookId`);