# 技术架构文档

## 1.架构设计

```mermaid
graph TD
  A[用户浏览器] --> B[Vue3前端应用]
  B --> C[Axios HTTP客户端]
  C --> D[Express 后端服务]
  D --> E[本地JSON文件存储]
  D --> G[AI大模型服务 (OpenAI等)]

  subgraph "前端层"
      B
      C
  end

  subgraph "后端层"
      D
      E
  end
  
  subgraph "外部服务"
      G
  end
```

## 2.技术描述

- **前端**: Vue3 + Vite + TypeScript + TailwindCSS
- **前端状态管理**: Pinia
- **前端路由**: Vue Router
- **网络请求**: Axios
- **后端框架**: Express.js (Node.js) + TypeScript
- **数据存储**: 本地 JSON 文件 (LowDB 或直接读写fs)
- **AI集成**: OpenAI API (或其他兼容的LLM API)

## 3.路由定义 (前端)

| 路由 | 用途 |
|-------|---------|
| / | 首页，显示小说列表或工作台 |
| /books | 小说管理与大纲生成 |
| /editor/:bookId | 实时写作与梳理编辑器 |
| /characters/:bookId | 人物卡片管理 |
| /worldview/:bookId | 世界观与故事概要管理 |
| /stats/:bookId | 统计看板 |
| /settings | AI大模型配置 |

## 4.API定义 (Express 后端)

### 4.1 小说与大纲管理

```
GET /api/books
POST /api/books
GET /api/books/:id
PUT /api/books/:id
```

### 4.2 写作与实时梳理

```
POST /api/writing/generate
POST /api/writing/summarize
```

### 4.3 人物与世界观

```
GET /api/characters?bookId=:id
POST /api/characters
PUT /api/characters/:id
DELETE /api/characters/:id

GET /api/worldview?bookId=:id
PUT /api/worldview/:id
```

### 4.4 章节管理

```
GET /api/chapters?bookId=:id
POST /api/chapters
PUT /api/chapters/:id
DELETE /api/chapters/:id
```

### 4.5 设置

```
GET /api/settings
PUT /api/settings
```

## 5.数据模型 (JSON 结构)

所有数据存储在后端的 `data` 目录下，例如 `data/db.json`。

```json
{
  "settings": {
    "llmProvider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4"
  },
  "books": [
    {
      "id": "book-1",
      "title": "修仙传",
      "type": "修炼",
      "outline": "主角从废柴崛起...",
      "worldview": "天圆地方，分为五大域...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "characters": [
    {
      "id": "char-1",
      "bookId": "book-1",
      "name": "张三",
      "role": "主角",
      "personality": "坚韧不拔",
      "abilities": "火系法术",
      "status": "出场",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "chapters": [
    {
      "id": "chap-1",
      "bookId": "book-1",
      "volume": 1,
      "chapter": 1,
      "title": "陨落的天才",
      "content": "正文内容...",
      "summary": "本章梳理...",
      "wordCount": 2000,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```