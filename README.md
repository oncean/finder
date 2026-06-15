# 风向标 - 本地生活美食社交小程序

> 基于地理位置的本地生活美食社交平台，让用户在群聊中实时分享美食发现，浏览系统推荐的优质店铺。

---

## 项目简介

风向标是一款面向本地生活场景的美食社交小程序，核心功能包括：

- **实时群聊**：在"吃喝玩乐"群聊中与其他用户实时交流，分享美食发现
- **风向标推荐**：浏览系统基于地理位置推荐的优质店铺和真实测评
- **店铺探索**：查看店铺详情、消费记录、真实用户评价
- **内容分享**：支持文字、图片、店铺卡片等多种消息类型

---

## 技术架构

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 客户端 | 微信小程序原生框架 | WXML + WXSS + JS |
| 网关层 | Nginx | 反向代理、SSL 终止、静态文件服务 |
| 业务层 | Node.js + NestJS | RESTful API + WebSocket 实时通信 |
| 数据层 | PostgreSQL + PostGIS | 主数据库 + 地理位置查询支持 |
| 文件存储 | 本地文件系统 | 用户上传图片、店铺封面等 |

### 系统架构

```
┌─────────────────────────────────────────────┐
│                    客户端层                   │
│           微信小程序 (WXML/WXSS/JS)           │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│               网关层 (Nginx)                 │
│      SSL 终止 / 反向代理 / 静态文件服务       │
└─────────────────────┬───────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│   API 服务     │           │  WebSocket    │
│  (NestJS)     │           │   服务        │
│               │           │               │
│ • 用户认证    │           │ • 实时消息    │
│ • 店铺/帖子   │           │ • 在线状态    │
│ • 文件上传    │           │ • 消息历史    │
└───────┬───────┘           └───────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│                  数据层                      │
│  ┌─────────────────────────────────────┐   │
│  │         PostgreSQL + PostGIS        │   │
│  │  • 用户表  • 店铺表  • 帖子表       │   │
│  │  • 消息表  • 测评表  • 群聊表       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 目录结构

```
fengxiangbiao/
├── backend/                    # 后端服务 (NestJS)
│   ├── src/
│   │   ├── common/             # 公共模块 (过滤器、拦截器、守卫)
│   │   ├── entities/           # 数据库实体定义
│   │   ├── modules/            # 业务模块
│   │   │   ├── auth/           # 认证模块 (微信登录、JWT)
│   │   │   ├── chat/           # 聊天模块
│   │   │   ├── post/           # 帖子模块
│   │   │   ├── shop/           # 店铺模块
│   │   │   └── upload/         # 文件上传模块
│   │   ├── websocket/          # WebSocket 网关 (实时通信)
│   │   ├── app.module.ts       # 根模块
│   │   └── main.ts             # 应用入口
│   ├── .env.example            # 环境变量示例
│   ├── Dockerfile              # Docker 构建文件
│   ├── docker-compose.yml      # 本地开发环境编排
│   ├── nginx.conf              # Nginx 配置
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       # 项目文档
│   ├── architecture-doc.md     # 架构设计文档
│   ├── deploy-guide.md         # 云端部署指南
│   ├── dev-steps.md            # 开发步骤指南
│   ├── mini-program-dev-doc.md # 小程序开发文档
│   └── mini-program-dev-doc.html
│
├── assets/                     # 静态资源
│   └── screenshots/            # 产品截图
│       ├── 风向标主页.jpg
│       ├── 吃喝玩乐.jpg
│       ├── 店铺详情页.jpg
│       ├── 店铺评价详情页.jpg
│       ├── 添加内容页.jpg
│       └── 页面跳转逻辑展示.jpg
│
└── README.md                   # 本文件
```

---

## 快速开始

### 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 18 LTS | 后端运行环境 |
| Docker | 24.x | 本地数据库 |
| 微信开发者工具 | 最新版 | 小程序开发调试 |

### 1. 克隆项目

```bash
git clone https://github.com/your-username/fengxiangbiao.git
cd fengxiangbiao
```

### 2. 启动本地数据库

```bash
cd backend
docker-compose up -d postgres
```

### 3. 启动后端服务

```bash
# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env
# 编辑 .env 填入你的微信小程序 AppID 和 Secret

# 启动开发服务器
npm run start:dev
```

后端服务将运行在 `http://localhost:3000`

### 4. 配置微信小程序

1. 打开微信开发者工具
2. 导入小程序项目（小程序代码目录）
3. 在 `utils/request.js` 中配置 API 地址为 `http://localhost:3000/api/v1`
4. 开启"不校验合法域名"选项（开发环境）

---

## 核心功能模块

### 认证模块 (auth)
- 微信小程序登录（code 换取 openid）
- JWT Token 生成与刷新
- 用户身份校验守卫

### 聊天模块 (chat)
- 群聊消息发送与接收
- 消息历史分页查询
- WebSocket 实时推送

### 店铺模块 (shop)
- 基于地理位置的附近店铺搜索（PostGIS）
- 店铺详情与标签展示
- 店铺评价管理

### 帖子模块 (post)
- 风向标推荐列表
- 帖子发布与详情查看
- 消费记录展示

### 上传模块 (upload)
- 图片文件上传
- 静态文件访问服务

---

## 部署指南

项目支持 Docker 一键部署，详见 [docs/deploy-guide.md](docs/deploy-guide.md)。

快速部署命令：

```bash
cd backend

# 构建并启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

---

## 技术栈版本

| 技术 | 版本 |
|------|------|
| Node.js | 18 LTS |
| NestJS | 10.x |
| TypeORM | 0.3.x |
| PostgreSQL | 15 + PostGIS |
| 微信小程序 | 基础库 2.30+ |
| Docker | 24.x |
| Nginx | 1.24 |

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/architecture-doc.md](docs/architecture-doc.md) | 系统架构设计、数据库设计、接口规范 |
| [docs/deploy-guide.md](docs/deploy-guide.md) | 云服务器部署、Docker 配置、SSL 证书 |
| [docs/dev-steps.md](docs/dev-steps.md) | 从 0 到上线的完整开发流程 |
| [docs/mini-program-dev-doc.md](docs/mini-program-dev-doc.md) | 小程序前端开发文档 |

---

## 开发团队

| 角色 | 人数 | 职责 |
|------|------|------|
| 小程序开发 | 1-2 | 前端页面、组件、交互 |
| 后端开发 | 1-2 | API、WebSocket、数据库 |
| 运维 | 1 | 部署、监控 |
| 测试 | 1 | 功能测试 |
| 产品 | 1 | 需求、验收 |
| 设计 | 1 | UI、交互设计 |

---

## 许可证

[MIT](LICENSE)
