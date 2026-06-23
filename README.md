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
├── miniprogram/                # 微信小程序前端
│   ├── pages/                  # 页面
│   │   ├── chat/               # 吃喝玩乐（群聊页）
│   │   ├── feed/               # 风向标（推荐页）
│   │   ├── post-detail/        # 帖子详情页
│   │   ├── shop-detail/        # 店铺详情页
│   │   ├── shop-select/        # 选择店铺页
│   │   └── photo-select/       # 选择照片页
│   ├── components/             # 公共组件
│   │   ├── shop-card/          # 店铺卡片
│   │   ├── ai-summary/         # AI 总结标签
│   │   ├── message-item/       # 消息条目
│   │   ├── feed-card/          # 风向标推荐卡片
│   │   ├── chat-input/         # 聊天输入框
│   │   ├── add-sheet/          # 添加内容弹窗
│   │   └── consume-record/     # 消费记录
│   ├── utils/                  # 工具层
│   │   ├── request.js          # HTTP 请求封装
│   │   ├── websocket.js        # WebSocket 封装
│   │   ├── storage.js          # 本地存储封装
│   │   └── location.js         # 定位相关工具
│   ├── services/               # 服务层
│   │   ├── auth.js             # 认证服务
│   │   ├── chat.js             # 聊天服务
│   │   ├── shop.js             # 店铺服务
│   │   ├── post.js             # 帖子服务
│   │   └── upload.js           # 上传服务
│   └── store/                  # 状态管理
│       └── index.js
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

### 4. 配置并启动小程序

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 填入你的小程序 AppID
4. 在 `miniprogram/utils/request.js` 中配置 API 地址为 `http://localhost:3000/api/v1`
5. 开启"不校验合法域名"选项（开发环境）
6. 点击编译，即可在模拟器中预览

**小程序页面说明：**

| 页面 | 路径 | 功能 |
|------|------|------|
| 吃喝玩乐 | `pages/chat/chat` | 群聊页面，实时消息、发送文字/图片/店铺卡片 |
| 风向标 | `pages/feed/feed` | 推荐列表，基于地理位置的店铺推荐 |
| 帖子详情 | `pages/post-detail/post-detail` | 帖子详情、图片预览、相关推荐 |
| 店铺详情 | `pages/shop-detail/shop-detail` | 店铺信息、AI 总结、用户评价 |
| 选择店铺 | `pages/shop-select/shop-select` | 搜索并选择店铺发送到群聊 |
| 选择照片 | `pages/photo-select/photo-select` | 选择照片发送到群聊 |

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

## 前端架构

### 小程序目录结构

```
miniprogram/
├── app.js                      # 应用入口，全局登录状态管理
├── app.json                    # 全局配置，页面路由、TabBar、组件注册
├── app.wxss                    # 全局样式，通用工具类
├── pages/                      # 页面
│   ├── chat/                   # 吃喝玩乐 - 群聊页
│   │   ├── chat.js             # 页面逻辑：消息加载、WebSocket、发送消息
│   │   ├── chat.wxml           # 页面结构：消息列表、输入框、添加弹窗
│   │   └── chat.wxss           # 页面样式
│   ├── feed/                   # 风向标 - 推荐页
│   │   ├── feed.js             # 页面逻辑：推荐列表、下拉刷新、上拉加载
│   │   ├── feed.wxml           # 页面结构：推荐卡片列表
│   │   └── feed.wxss           # 页面样式
│   ├── post-detail/            # 帖子详情页
│   ├── shop-detail/            # 店铺详情页
│   ├── shop-select/            # 选择店铺页
│   └── photo-select/           # 选择照片页
├── components/                 # 公共组件
│   ├── shop-card/              # 店铺卡片（可复用）
│   ├── ai-summary/             # AI 总结标签（好评/差评）
│   ├── message-item/           # 消息条目（文字/图片/店铺卡片）
│   ├── feed-card/              # 风向标推荐卡片
│   ├── chat-input/             # 聊天输入框
│   ├── add-sheet/              # 添加内容弹窗（店铺/照片）
│   └── consume-record/         # 消费记录展示
├── utils/                      # 工具层
│   ├── request.js              # HTTP 请求封装（含 Token、错误处理）
│   ├── websocket.js            # WebSocket 封装（连接、重连、心跳）
│   ├── storage.js              # 本地存储封装
│   └── location.js             # 定位、距离计算、导航
├── services/                   # 服务层（API 调用）
│   ├── auth.js                 # 认证：登录、获取用户信息
│   ├── chat.js                 # 聊天：群聊信息、消息历史、发送消息
│   ├── shop.js                 # 店铺：列表、详情、评价
│   ├── post.js                 # 帖子：推荐、详情、相关推荐
│   └── upload.js               # 上传：图片上传
└── store/                      # 状态管理
    └── index.js                # 轻量级 Store（订阅/发布模式）
```

### 组件说明

| 组件 | 用途 | 接收参数 |
|------|------|---------|
| `shop-card` | 展示店铺基本信息和 AI 总结 | `shop` 对象，`showSummary`，`showDistance` |
| `ai-summary` | 展示 AI 提炼的好评/差评标签 | `summary` 对象（`positive`、`negative`、`averageCost`） |
| `message-item` | 展示单条消息（左/右布局） | `message` 对象，`isSelf` |
| `feed-card` | 展示风向标推荐帖子 | `post` 对象 |
| `chat-input` | 聊天输入框和发送按钮 | `placeholder` |
| `add-sheet` | 底部弹窗，选择添加内容类型 | `visible` |
| `consume-record` | 展示消费金额、商家、时间 | `record` 对象 |

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
