# 风向标小程序架构设计文档

> 本地生活美食社交类小程序 — 全栈架构设计与开发指南
>
> 版本 1.0 | 2026-06-15

---

## 目录

- [一、系统概述](#一系统概述)
- [二、架构总览](#二架构总览)
- [三、前端架构](#三前端架构)
- [四、后端架构](#四后端架构)
- [五、数据层架构](#五数据层架构)
- [六、实时通信架构](#六实时通信架构)
- [七、AI 服务架构](#七ai-服务架构)
- [八、部署与运维](#八部署与运维)
- [九、开发流程](#九开发流程)
- [十、安全设计](#十安全设计)

---

## 一、系统概述

风向标是一款基于地理位置的本地生活美食社交小程序，核心场景包括：用户在"吃喝玩乐"群聊中实时分享美食发现，在"风向标"页面浏览系统推荐的优质店铺，查看店铺详情与真实测评。

系统采用最小化架构，仅包含必要组件：

- 实时群聊（单群 200+ 在线用户）
- 基于地理位置的店铺推荐
- 图片上传与存储
- 消费记录等敏感数据的展示

---

## 二、架构总览

### 2.1 技术选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 客户端 | 微信小程序原生框架 | WXML + WXSS + JS，微信生态原生体验 |
| 网关层 | Nginx | 反向代理、SSL 终止 |
| 业务层 | Node.js (NestJS) | RESTful API + WebSocket 服务 |
| 数据层 | PostgreSQL + 本地存储 | 主数据库 + 图片本地存储 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌─────────────┐  ┌─────────────────────┐                  │
│  │  微信小程序  │  │      第三方服务      │                  │
│  │  (WXML/WXSS)│  │  微信支付/地图/推送   │                  │
│  └──────┬──────┘  └──────────┬──────────┘                  │
└─────────┼────────────────────┼──────────────────────────────┘
          │                    │
          └────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────────────┐
│               网关层 (Nginx)                                   │
│         SSL 终止 / 反向代理 / 请求路由                          │
└───────────────────┼─────────────────────────────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
┌─────────▼─────────┐ ┌───────▼────────┐
│   业务 API 服务    │ │  WebSocket 服务  │
│  (Node.js/NestJS) │ │  (Node.js/WS)   │
│                   │ │                 │
│ • 用户认证        │ │ • 实时消息      │
│ • 店铺/帖子 CRUD  │ │ • 在线状态      │
│ • 文件上传        │ │ • 消息历史      │
│ • 地理位置计算    │ │                 │
└─────────┬─────────┘ └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│              数据层                      │
│  ┌─────────────────────────────────┐   │
│  │         PostgreSQL              │   │
│  │         (主数据库)               │   │
│  │                                 │   │
│  │ • 用户表    • 店铺表            │   │
│  │ • 帖子表    • 消息表            │   │
│  │ • 测评表    • 群聊表            │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │         本地文件存储              │   │
│  │                                 │   │
│  │ • 用户上传图片                  │   │
│  │ • 店铺封面图                    │   │
│  │ • 测评配图                      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 2.3 服务拆分

| 服务名 | 职责 | 技术栈 | 部署方式 |
|--------|------|--------|---------|
| api-service | 统一业务 API | Node.js / NestJS | Docker |
| ws-service | WebSocket 实时通信 | Node.js / ws | Docker |

---

## 三、前端架构

### 3.1 小程序架构

采用微信小程序原生框架，结合自研轻量级状态管理方案。

#### 目录结构

```
miniprogram/
├── app.js                  // 应用入口：初始化、登录态检查
├── app.json                // 全局配置
├── app.wxss                // 全局样式
│
├── pages/                  // 页面层
│   ├── chat/               // 吃喝玩乐（群聊）
│   ├── feed/               // 风向标（推荐）
│   ├── post-detail/        // 帖子详情
│   ├── shop-detail/        // 店铺详情
│   ├── shop-select/        // 选择店铺
│   └── photo-select/       // 选择照片
│
├── components/             // 组件层
│   ├── shop-card/          // 店铺卡片（复用）
│   ├── summary-tags/       // 总结标签（手动配置）
│   ├── consume-record/     // 消费记录
│   ├── message-item/       // 消息条目
│   ├── chat-input/         // 聊天输入框
│   ├── add-sheet/          // 添加内容弹窗
│   └── feed-card/          // 风向标推荐卡片
│
├── utils/                  // 工具层
│   ├── request.js          // HTTP 请求封装
│   ├── websocket.js        // WebSocket 封装
│   ├── storage.js          // 本地存储封装
│   └── location.js         // 定位相关工具
│
├── services/               // API 服务层（按模块组织）
│   ├── auth.js
│   ├── chat.js
│   ├── shop.js
│   ├── post.js
│   └── upload.js
│
├── store/                  // 状态管理层
│   ├── index.js            // Store 入口
│   ├── userStore.js        // 用户状态
│   ├── chatStore.js        // 聊天状态
│   └── shopStore.js        // 店铺状态
│
└── static/                 // 静态资源
    ├── images/
    └── icons/
```

#### 状态管理设计

采用基于发布订阅模式的轻量级 Store，避免引入过重的外部库。

```javascript
// store/index.js
class Store {
  constructor() {
    this.state = {};
    this.listeners = {};
  }

  set(key, value) {
    this.state[key] = value;
    this.notify(key);
  }

  get(key) {
    return this.state[key];
  }

  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
  }

  notify(key) {
    (this.listeners[key] || []).forEach(cb => cb(this.state[key]));
  }
}

module.exports = new Store();
```

#### 请求封装

```javascript
// utils/request.js
const BASE_URL = 'https://api.fengxiangbiao.com/api/v1';

class Request {
  constructor() {
    this.baseURL = BASE_URL;
  }

  async request(options) {
    const token = wx.getStorageSync('access_token');
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.baseURL + options.url,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 401) {
            // Token 过期，刷新或重新登录
            this.handleAuthError();
            return;
          }
          if (res.data.code !== 0) {
            wx.showToast({ title: res.data.message, icon: 'none' });
            reject(res.data);
            return;
          }
          resolve(res.data.data);
        },
        fail: reject
      });
    });
  }

  get(url, data) { return this.request({ url, method: 'GET', data }); }
  post(url, data) { return this.request({ url, method: 'POST', data }); }
  put(url, data) { return this.request({ url, method: 'PUT', data }); }
  delete(url, data) { return this.request({ url, method: 'DELETE', data }); }
}

module.exports = new Request();
```

### 3.2 页面状态管理

每个页面采用统一的 Page 基类模式，封装通用逻辑：

```javascript
// utils/base-page.js
class BasePage {
  constructor() {
    this.data = {};
    this.store = require('./store/index.js');
  }

  setState(newState) {
    this.setData(newState);
  }

  // 订阅 Store 变化
  subscribeStore(key, handler) {
    this.store.subscribe(key, handler.bind(this));
  }
}

module.exports = BasePage;
```

### 3.3 组件设计

#### 店铺卡片组件（shop-card）

```
properties:
  - shopId: string        // 店铺 ID
  - showSummary: boolean   // 是否显示 AI 总结
  - showDistance: boolean  // 是否显示距离

events:
  - onTap: 点击卡片
  - onNavigate: 点击导航
```

#### 总结标签组件（summary-tags）

```
properties:
  - tags: array           // 标签数组 [{label, type}]
  - reviewCount: number   // 测评人数

type: 'positive' | 'negative'
```

标签数据由运营人员在管理后台手动配置，存储于数据库中，无需 AI 服务。

---

## 四、后端架构

### 4.1 API 服务（Node.js + NestJS）

采用 NestJS 框架，利用其模块化、依赖注入、装饰器等特性组织代码。

#### 项目结构

```
backend/
├── src/
│   ├── main.ts              // 应用入口
│   ├── app.module.ts        // 根模块
│   │
│   ├── modules/             // 业务模块
│   │   ├── auth/            // 认证模块
│   │   ├── user/            // 用户模块
│   │   ├── chat/            // 聊天模块
│   │   ├── shop/            // 店铺模块
│   │   ├── post/            // 帖子模块
│   │   └── upload/          // 上传模块
│   │
│   ├── common/              // 公共模块
│   │   ├── filters/         // 异常过滤器
│   │   ├── interceptors/    // 拦截器
│   │   ├── guards/          // 守卫
│   │   ├── decorators/      // 装饰器
│   │   └── utils/           // 工具函数
│   │
│   ├── config/              // 配置
│   ├── database/            // 数据库
│   └── websocket/           // WebSocket 网关
│
├── test/                    // 测试
├── docker-compose.yml       // 本地开发环境
└── Dockerfile               // 构建镜像
```

#### 核心模块设计

**认证模块（auth）**

```typescript
// auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto) {
    // 1. 用 code 向微信服务器换取 openid
    // 2. 查询或创建用户
    // 3. 生成 JWT token
    // 4. 返回 token + 用户信息
  }

  @Post('refresh')
  async refreshToken(@Body('refreshToken') token: string) {
    // 刷新 access_token
  }
}
```

**店铺模块（shop）**

```typescript
// shop.service.ts
@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>
  ) {}

  async findNearby(lat: number, lng: number, radius: number) {
    // 使用 PostgreSQL 地理查询（PostGIS）
    const shops = await this.shopRepo
      .createQueryBuilder('shop')
      .where(
        `ST_DWithin(
          shop.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lat, lng, radius }
      )
      .orderBy(
        `ST_Distance(
          shop.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'ASC'
      )
      .getMany();

    return shops;
  }
}
```

### 4.2 中间件与拦截器

```typescript
// 统一响应格式
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map(data => ({
        code: 0,
        message: 'ok',
        data
      }))
    );
  }
}

// 异常处理
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      code: status,
      message: exception instanceof Error ? exception.message : '服务器错误',
      data: null
    });
  }
}
```

---

## 五、数据层架构

### 5.1 数据库设计（PostgreSQL）

#### 用户表（users）

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid VARCHAR(64) UNIQUE NOT NULL,
  unionid VARCHAR(64),
  nickname VARCHAR(64),
  avatar VARCHAR(255),
  phone VARCHAR(20),
  location JSONB,              -- {lat, lng, city}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_openid ON users(openid);
```

#### 店铺表（shops）

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  category VARCHAR(32),        -- 美食/景点/娱乐
  address VARCHAR(255),
  location GEOGRAPHY(POINT),   -- PostGIS 地理坐标
  cover_image VARCHAR(255),
  phone VARCHAR(20),
  business_hours VARCHAR(64),
  rating DECIMAL(2,1) DEFAULT 5.0,
  review_count INT DEFAULT 0,
  summary_tags JSONB,          -- {positive:[], negative:[], averageCost}
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shops_location ON shops USING GIST(location);
CREATE INDEX idx_shops_category ON shops(category);
```

#### 消息表（messages）

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(16) NOT NULL,   -- text/image/shop_card
  content TEXT,
  shop_card JSONB,             -- 店铺卡片数据
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_group_created ON messages(group_id, created_at DESC);
```

#### 帖子表（posts）

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(128) NOT NULL,
  content TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  images JSONB,                 -- ["url1", "url2"]
  cover_image VARCHAR(255),
  consume_record JSONB,         -- 消费记录
  review_count INT DEFAULT 0,
  is_recommended BOOLEAN DEFAULT FALSE,
  recommend_rank INT,
  location VARCHAR(128),
  event_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_recommended ON posts(is_recommended, recommend_rank);
CREATE INDEX idx_posts_shop ON posts(shop_id);
```

### 5.2 无缓存策略

最小化架构不使用 Redis 缓存，所有数据直接从 PostgreSQL 查询。为弥补性能，采取以下措施：

- 数据库查询优化：合理使用索引、避免 N+1 查询
- 连接池配置：根据并发量调整连接池大小
- 分页查询：列表接口强制分页，单页不超过 20 条
- 轻量字段：接口返回只包含必要字段，避免大字段传输

### 5.3 数据一致性

无缓存层，数据一致性由数据库事务保证：

- 写操作使用数据库事务，确保原子性
- 读操作直接查询数据库，无缓存一致性问题
- 对于并发场景，使用数据库行级锁或乐观锁

---

## 六、实时通信架构

### 6.1 WebSocket 服务设计

采用独立 WebSocket 服务，与 HTTP API 服务分离，便于横向扩展。

#### 连接管理

```
┌─────────────────┐
│   微信小程序   │
│  (WebSocket)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Nginx (WS)    │────▶│  WS 服务实例 1   │
│   反向代理       │     │  (Node.js/ws)   │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │ PostgreSQL  │
                        │ 消息持久化   │
                        └─────────────┘
```

WebSocket 服务采用单机内存管理在线状态，无需 Redis。单实例可支撑 10000+ 并发连接，满足初期需求。

#### 消息协议

```typescript
// 客户端 → 服务端
interface ClientMessage {
  type: 'message' | 'ping' | 'ack' | 'typing';
  data: {
    groupId?: string;
    msgType?: 'text' | 'image' | 'shop_card';
    content?: string;
    messageId?: string;
  };
}

// 服务端 → 客户端
interface ServerMessage {
  type: 'message' | 'pong' | 'online_count' | 'error';
  data: {
    id?: string;
    sender?: UserInfo;
    type?: string;
    content?: string;
    createdAt?: string;
    count?: number;
    error?: string;
  };
}
```

#### 群聊消息流程

```
1. 用户 A 发送消息
   → WS 服务接收
   → 验证用户权限（是否在群聊中）
   → 写入 PostgreSQL
   → 直接广播给内存中维护的该群聊所有在线连接

2. 用户 B 收到消息
   → WS 推送
   → 前端渲染
   → 发送 ack 确认
```

单机内存维护在线连接映射：`Map<groupId, Set<socket>>`。

#### 在线状态管理

```typescript
// 使用内存 Map 管理在线用户（单机模式）
class OnlineManager {
  private onlineUsers = new Map<string, Set<string>>();  // groupId -> Set<userId>
  private socketMap = new Map<string, { userId: string; groupId: string }>();

  userOnline(groupId: string, userId: string, socketId: string) {
    if (!this.onlineUsers.has(groupId)) {
      this.onlineUsers.set(groupId, new Set());
    }
    this.onlineUsers.get(groupId).add(userId);
    this.socketMap.set(socketId, { userId, groupId });

    // 广播在线人数更新
    const count = this.onlineUsers.get(groupId).size;
    this.broadcast(groupId, { type: 'online_count', data: { count } });
  }

  userOffline(socketId: string) {
    const info = this.socketMap.get(socketId);
    if (!info) return;

    const users = this.onlineUsers.get(info.groupId);
    if (users) {
      users.delete(info.userId);
      if (users.size === 0) {
        this.onlineUsers.delete(info.groupId);
      }
    }
    this.socketMap.delete(socketId);
  }
}
```

### 6.2 消息持久化与历史查询

- 消息实时写入 PostgreSQL，保证数据不丢失
- 消息表按 `group_id + created_at` 建立复合索引，支持高效分页查询
- 无 Redis 缓存，历史消息直接从数据库查询

---

## 七、标签服务（替代 AI 层）

### 7.1 设计思路

最小化架构不引入 AI 服务。店铺标签由运营人员在管理后台手动配置，存储于数据库中。

标签数据结构：

```json
{
  "positive": ["重油重辣", "人均22/人"],
  "negative": ["太酸了"],
  "averageCost": 22
}
```

### 7.2 管理后台功能

- 店铺列表管理：增删改查店铺信息
- 标签配置：为每个店铺设置优缺点标签、人均消费
- 推荐管理：设置风向标推荐榜单

### 7.3 数据初始化

```sql
-- 初始化店铺标签
UPDATE shops SET summary_tags = '{
  "positive": ["重油重辣", "人均22/人"],
  "negative": ["太酸了"],
  "averageCost": 22
}'::jsonb WHERE id = 'shop_001';
```

---

## 八、部署与运维

### 8.1 Docker 部署

```dockerfile
# Dockerfile (API 服务)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      - postgres

  websocket:
    build: ./websocket-service
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  postgres:
    image: postgis/postgis:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./uploads:/app/uploads
    environment:
      - POSTGRES_DB=fengxiangbiao
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./uploads:/app/uploads

volumes:
  postgres_data:
```

### 8.2 CI/CD 流程

```
开发者提交代码
    │
    ▼
┌─────────────┐
│ GitLab CI   │
│ / GitHub    │
│ Actions     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 代码检查    │
│ ESLint/TSLint│
│ 单元测试     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 构建镜像    │
│ docker build │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 推送镜像    │
│ 阿里云 ACR  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 部署到 K8s  │
│ 滚动更新    │
└─────────────┘
```

### 8.3 监控告警

最小化架构不引入 Prometheus/Grafana。采用以下轻量级监控方案：

- **日志监控**：使用 `winston` 或 `pino` 记录应用日志，按级别分类
- **健康检查**：提供 `/health` 接口，返回服务状态
- **数据库监控**：PostgreSQL 慢查询日志（log_min_duration_statement = 1000ms）
- **服务器监控**：使用 `pm2` 或 `systemd` 管理进程，自带基础监控

| 指标 | 采集方式 | 告警方式 |
|------|---------|---------|
| 服务存活 | HTTP 健康检查 | 企业微信/钉钉机器人 |
| 错误日志 | 日志文件 | 定时脚本扫描 |
| 磁盘空间 | 系统命令 | 告警通知 |
| 数据库慢查询 | PostgreSQL 日志 | 定时分析 |

---

## 九、开发流程

### 9.1 环境搭建

```bash
# 1. 克隆项目
git clone https://github.com/fengxiangbiao/miniprogram.git
cd miniprogram

# 2. 启动后端服务（Docker）
cd backend
docker-compose up -d

# 3. 启动小程序开发
# 使用微信开发者工具打开 miniprogram 目录
# 配置 app.json 中的 request 合法域名
```

### 9.2 开发顺序

| 阶段 | 内容 | 预计工期 |
|------|------|---------|
| 第一阶段 | 项目搭建、用户登录、数据库设计 | 3 天 |
| 第二阶段 | 吃喝玩乐页面（聊天、消息、WebSocket） | 5 天 |
| 第三阶段 | 风向标页面（推荐列表、帖子详情） | 4 天 |
| 第四阶段 | 店铺详情、选择店铺/照片 | 3 天 |
| 第五阶段 | 标签配置、消费记录、分享功能 | 3 天 |
| 第六阶段 | 测试、优化、上线 | 3 天 |

### 9.3 测试策略

| 测试类型 | 工具 | 覆盖范围 |
|---------|------|---------|
| 单元测试 | Jest | Service、Util 层 |
| 集成测试 | Jest + Supertest | API 接口 |
| E2E 测试 | 微信开发者工具 | 小程序核心流程 |
| 性能测试 | k6 / Artillery | API 压测、WebSocket 并发 |
| 安全测试 | OWASP ZAP | 常见漏洞扫描 |

---

## 十、安全设计

### 10.1 认证与授权

- 采用 JWT 方案，access_token 有效期 2 小时，refresh_token 有效期 7 天
- Token 存储于数据库，支持主动失效（用户退出登录）
- 敏感操作（如发布内容）需校验用户身份

### 10.2 数据安全

- 消费记录等敏感数据采用 AES 加密存储
- 数据库连接使用 SSL
- 定期备份数据库（每日全量 + 实时增量）

### 10.3 接口安全

- 全局限流：单 IP 100 次/分钟
- 接口限流：登录 5 次/分钟，发送消息 30 次/分钟
- 防重放攻击：请求头携带时间戳，服务端校验（5 分钟内有效）
- 参数校验：所有入参使用 DTO + class-validator 校验

### 10.4 内容安全

- 用户发布内容先经过敏感词过滤（本地词库）
- 人工审核后台对举报内容处理
- 消费记录等敏感信息仅本人可见

---

## 附录

### A. 技术栈版本

| 技术 | 版本 |
|------|------|
| 微信小程序 | 基础库 2.30+ |
| Node.js | 18 LTS |
| NestJS | 10.x |
| PostgreSQL | 15 + PostGIS |
| Docker | 24.x |
| Nginx | 1.24 |

### B. 域名规划

| 环境 | 域名 |
|------|------|
| 开发 | `dev-api.fengxiangbiao.com` |
| 测试 | `test-api.fengxiangbiao.com` |
| 生产 | `api.fengxiangbiao.com` |
| WebSocket | `ws.fengxiangbiao.com` |
| 静态资源 | `cdn.fengxiangbiao.com` |

### C. 团队分工

| 角色 | 人数 | 职责 |
|------|------|------|
| 小程序开发 | 1-2 | 前端页面、组件、交互 |
| 后端开发 | 1-2 | API、WebSocket、数据库 |
| 运维 | 1 | 部署、监控 |
| 测试 | 1 | 功能测试 |
| 产品 | 1 | 需求、验收 |
| 设计 | 1 | UI、交互设计 |
