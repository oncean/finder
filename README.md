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

## 已实现

- 聊天默认群按位置匹配：`chat_groups` 已支持中心点经纬度和覆盖半径字段，后端根据小程序传入的 `lat/lng` 计算当前位置距离哪个群组中心点最近，并只在当前位置落入该群组覆盖范围时返回群组；如果没有匹配群组，接口返回空，小程序显示“该区域暂不支持”。
- 生产环境配置改造：后端关键配置缺失时直接启动失败，不再使用默认数据库、默认 JWT、默认端口和默认上传域名。
- 小程序环境配置：API 和 WebSocket 地址已统一由 `miniprogram/utils/config.js` 管理，并按微信运行版本自动区分 `dev/test/prod`。
- 环境示例文件：已补充 `.env.development.example`、`.env.test.example`、`.env.production.example`。
- WebSocket 鉴权和心跳：连接握手阶段已校验用户 token 和群组，校验失败直接断开；连接成功后绑定用户与群组，并通过 `ping/pong` 心跳维护在线状态，超时自动清理。

---

## TODO

### 高优先级

- 登录和权限：增加管理员角色和权限点，例如超级管理员、运营、客服、只读账号。
- 登录和权限：后台敏感接口增加权限校验。
- 登录和权限：增加管理员退出登录、密码修改、密码重置和 token 过期统一处理。
- 聊天群组匹配：管理端群组配置增加地图选点，不再手动输入经纬度。
- 聊天群组匹配：小程序展示当前城市、区域识别结果和当前位置匹配状态。
- 聊天群组匹配：无覆盖区域增加“申请开通该区域”入口。
- 聊天群组匹配：用户位置变化超过一定距离后重新匹配群组。
- 聊天群组匹配：群组覆盖范围支持多边形，而不仅是圆形半径。
- 参数校验：引入 DTO 和 `class-validator`，开启全局 `ValidationPipe`。
- 参数校验：所有创建、更新接口明确字段类型，不再使用 `body: any`。
- 参数校验：校验经纬度范围，纬度 `-90 ~ 90`，经度 `-180 ~ 180`，覆盖半径必须大于 `0`。
- 参数校验：评分限制在 `0 ~ 5`，手机号、图片 URL、消息类型等字段增加统一校验。

### 中高优先级

- 上传安全：限制上传文件类型，仅允许 `jpg/png/jpeg/webp` 等图片格式。
- 上传安全：限制上传文件大小。
- 上传安全：使用文件头检测文件类型，避免只依赖扩展名。
- 上传安全：上传后生成缩略图，优化小程序图片加载。
- 上传安全：支持 OSS、COS、S3 等对象存储配置。
- 上传安全：图片 URL 统一使用正式访问域名，不直接依赖本地服务路径。
- 数据统计一致性：店铺 `reviewCount` 改为查询统计或定时聚合，避免手动维护不一致。
- 数据统计一致性：评价、评论创建和删除时统一更新关联统计。
- 数据统计一致性：保留数据修复脚本，但不得写入假数据。
- 数据统计一致性：明确推荐排序字段，例如 `recommendRank`、`rating`、`reviewCount`、`createdAt`。
- 推荐逻辑：推荐流加入位置距离。
- 推荐逻辑：加入用户浏览、点击、收藏、发送店铺卡片等行为数据。
- 推荐逻辑：后台支持配置推荐权重。
- 推荐逻辑：支持置顶、下架、推荐有效期。
- 推荐逻辑：推荐结果增加原因字段，例如“附近热门”“同类高分”。
- 小程序体验：定位失败和区域不支持拆分提示，定位失败提示开启定位权限，区域不支持提示当前区域暂未开通。
- 小程序体验：授权失败后提供重新授权或引导设置入口。
- 小程序体验：无图片时使用空状态样式，不使用假图。
- 小程序体验：增加页面级错误态和重试按钮。
- 小程序体验：封装日志工具，生产环境关闭调试日志。

### 中优先级

- 管理端体验：群组中心点配置改为地图选点。
- 管理端体验：店铺管理支持批量导入。
- 管理端体验：评价管理支持按店铺、用户、评分、时间筛选。
- 管理端体验：消息管理支持按群组、发送人、类型筛选。
- 管理端体验：删除操作显示影响范围并加强二次确认。
- 管理端体验：统一图片上传组件和上传反馈。
- 管理端体验：补全表单校验和错误提示。
- 后端结构：拆分 `AdminController`，提取 `AdminUserService`、`AdminShopService`、`AdminChatGroupService`、`AdminMessageService`。
- 后端结构：控制器只负责路由和参数，业务校验放到 service。
- 后端结构：公共格式化逻辑抽到 mapper/helper。
- 后端结构：为核心 service 增加单元测试。
- 数据库迁移：引入 TypeORM migration。
- 数据库迁移：生产环境关闭 `synchronize`。
- 数据库迁移：为 `chat_groups.center_lat`、`chat_groups.center_lng`、`chat_groups.coverage_radius` 补迁移文件。
- 数据库迁移：为常用查询字段加索引，包括 `shops.category`、`shops.city`、`shops.rating`、`comments.shop_id`、`messages.group_id`。
- WebSocket 稳定性：增加消息发送 ACK。
- WebSocket 稳定性：消息列表按 `id` 去重。
- WebSocket 稳定性：历史消息支持分页加载。

### 低优先级

- 遗留代码清理：删除未路由使用的 `Welcome`、`Admin` 页面。
- 遗留代码清理：清理模板 README、CLAUDE、docs 中与当前业务无关内容。
- 遗留代码清理：检查 `.gitignore`，避免 `.umi`、构建缓存、临时文件入库。
- 遗留代码清理：保留真正有用的测试和业务文档，删除无关模板测试。
- 日志规范：后端统一使用 Nest Logger。
- 日志规范：小程序封装 `logger`，生产环境静默。
- 日志规范：错误日志保留必要上下文，不输出 token、登录 code、用户隐私。
- 日志规范：管理端统一错误提示。

### 建议实施顺序

1. 提交当前“删除 mock + 群组范围匹配”的大改动，避免后续改动混在一起。
2. 做 DTO 参数校验和全局 `ValidationPipe`。
3. 做群组地图选点和区域不支持反馈。
4. 做上传安全和图片处理。
5. 做管理端体验增强和遗留模板清理。

---

## 许可证

[MIT](LICENSE)
