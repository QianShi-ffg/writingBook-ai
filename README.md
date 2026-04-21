# WritingBook-AI

WritingBook-AI 是一个基于大语言模型（LLM）驱动的全栈式小说创作辅助系统。它不仅是一个 Markdown 编辑器，更是一个懂大纲、懂设定、懂上下文的“AI 联合创作者”。从灵感火花到百万字长篇，WritingBook-AI 致力于为网文作者提供全生命周期的智能写作体验。

## ✨ 核心功能

### 1. 📖 大纲与世界观构建
- **AI 一句话生成大纲**：输入一个核心创意，AI 自动扩写为包含起承转合的详细小说大纲。
- **剧情大纲树 (Timeline)**：将长篇大纲智能拆解为树状节点（如 1-5章、6-10章），支持手动增删改，写作进度一目了然。
- **一键衍生设定**：基于大纲，并发生成**世界观背景**、**核心主角团**，若为修仙/玄幻题材，还会自动量身定制**境界修炼体系**。

### 2. ✍️ 智能沉浸式写作
- **上下文感知续写**：AI 在生成正文时，会自动读取当前大纲节点、世界观、人物卡片以及**上一章的剧情梳理**，确保情节连贯、人物不崩（OOC）。
- **流式生成与打断**：采用 SSE 流式输出，打字机效果带来极佳的反馈体验；支持随时中止生成；滚动条智能跟随（手动上翻时自动停止跟随）。
- **局部选词润色**：在正文中划选任意段落，支持一键**润色优化**、**丰富扩写**或**顺延续写**，并提供双栏对比预览。

### 3. 🧠 AI 主编与剧情推演
- **AI 主编审核**：模拟严苛的网文主编，从逻辑漏洞、人物行为、节奏爽点等维度对当前章节进行专业点评。
- **一键修改 (结果对比)**：根据主编意见，AI 自动重写本章。提供**双栏差异对比**，确认满意后再覆盖原稿，且严格限制修改后的字数防止大幅缩水。
- **编织情节 (Plot Weaver)**：卡文时，AI 可提供多种后续情节走向建议（如“神转折”、“得奇遇”），一键采纳并应用到大纲节点或正文。
- **自动剧情梳理**：每章写完或修改完后，AI 会自动提炼本章的“核心剧情点、时间地点、人物动向”（限制 600 字内），作为下一章生成的精准记忆库。

### 4. 📚 资料库与资产管理
- **动态人物卡片**：管理人物的性格、能力及出场状态。
- **境界体系**：可视化的力量等级管理。
- **参考资料室**：收集灵感素材或设定备忘，随时供 AI 写作时提取参考。

## 🛠️ 技术栈

### 前端 (Frontend)
- **核心框架**: Vue 3 (Composition API) + Vite
- **状态管理**: Pinia
- **UI 样式**: Tailwind CSS + 原生 CSS Variables
- **图标与组件**: Lucide Vue Next
- **编辑器**: `md-editor-v3` (支持 Markdown 及快捷键)
- **网络请求**: Axios (支持流式响应解析)

### 后端 (Backend)
- **核心框架**: Node.js + Express
- **数据库**: MySQL (使用 Sequelize ORM 进行关系映射)
- **AI 引擎**: 兼容 OpenAI 格式的 API 调用（可接入 DeepSeek 等任意支持该标准的大模型）
- **通信技术**: Server-Sent Events (SSE) 用于流式文本传输

## 🚀 快速开始

### 1. 环境准备
- Node.js (v16+)
- pnpm (推荐)
- MySQL 数据库

### 2. 后端配置与启动
1. 进入后端目录：`cd api`
2. 安装依赖：`pnpm install`
3. 复制环境变量文件：`cp .env.example .env`
4. 修改 `.env` 文件，填入你的 MySQL 数据库连接信息以及大模型 API Key：
   ```env
   PORT=3002
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=your_db_name
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   
   # AI 大模型配置
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-xxxxxx
   OPENAI_MODEL=deepseek-reasoner
   OPENAI_BASE_URL=https://api.deepseek.com
   ```
5. 启动后端服务（开发模式）：`pnpm run dev`

### 3. 前端配置与启动
1. 在项目根目录，安装前端依赖：`pnpm install`
2. 复制环境变量文件：`cp .env.example .env`
3. 确保 `.env` 中的 `VITE_API_BASE_URL` 指向你的后端地址：
   ```env
   VITE_API_BASE_URL=http://localhost:3002/api
   ```
4. 启动前端项目：`pnpm run dev`
5. 浏览器访问：`http://localhost:5173`

## 📦 编译打包

前端构建产物将输出到 `dist` 目录：
```bash
pnpm run build
```

后端构建产物将输出到 `api/dist` 目录：
```bash
cd api
pnpm run build
```
