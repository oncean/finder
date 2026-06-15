# 风向标小程序开发步骤

> 最小化架构 — 从 0 到上线的完整开发流程
>
> 版本 1.0 | 2026-06-15

---

## 目录

- [一、环境搭建](#一环境搭建)
- [二、数据库设计与初始化](#二数据库设计与初始化)
- [三、后端开发](#三后端开发)
- [四、前端开发](#四前端开发)
- [五、联调测试](#五联调测试)
- [六、部署上线](#六部署上线)
- [七、迭代优化](#七迭代优化)

---

## 一、环境搭建

### 1.1 开发环境准备

| 工具 | 版本 | 用途 | 下载地址 |
|------|------|------|---------|
| Node.js | 18 LTS | 后端运行环境 | https://nodejs.org |
| 微信开发者工具 | 最新版 | 小程序开发调试 | https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html |
| Git | 任意 | 版本控制 | https://git-scm.com |
| VS Code | 最新版 | 代码编辑器 | https://code.visualstudio.com |
| Docker Desktop | 最新版 | 本地数据库 | https://www.docker.com/products/docker-desktop |

### 1.2 创建项目目录

```bash
# 创建工作区
mkdir -p fengxiangbiao/{backend,websocket,miniprogram}
cd fengxiangbiao

# 初始化 Git 仓库
git init
git remote add origin https://github.com/your-team/fengxiangbiao.git
```

### 1.3 启动本地数据库

```bash
# 创建 docker-compose.yml（仅用于本地开发）
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: fengxiangbiao
      POSTGRES_USER: app
      POSTGRES_PASSWORD: dev123456
    volumes:
      - postgres_dev:/var/lib/postgresql/data

volumes:
  postgres_dev:
EOF

# 启动数据库
docker-compose -f docker-compose.dev.yml up -d

# 验证连接
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U app
```

### 1.4 注册微信小程序

1. 访问[微信公众平台](https://mp.weixin.qq.com/)注册小程序账号
2. 获取 AppID（开发 → 开发设置 → 开发者 ID）
3. 配置服务器域名（后续部署后填写）

---

## 二、数据库设计与初始化

### 2.1 设计表结构

```sql
-- 创建数据库（如未自动创建）
CREATE DATABASE fengxiangbiao;

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid VARCHAR(64) UNIQUE NOT NULL,
  unionid VARCHAR(64),
  nickname VARCHAR(64),
  avatar VARCHAR(255),
  phone VARCHAR(20),
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 群聊表
CREATE TABLE chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) NOT NULL,
  city VARCHAR(32),
  district VARCHAR(32),
  online_count INT DEFAULT 0,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息表
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(16) NOT NULL CHECK (type IN ('text', 'image', 'shop_card')),
  content TEXT,
  shop_card JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_group_created ON messages(group_id, created_at DESC);

-- 店铺表
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  category VARCHAR(32),
  address VARCHAR(255),
  location GEOGRAPHY(POINT),
  cover_image VARCHAR(255),
  phone VARCHAR(20),
  business_hours VARCHAR(64),
  rating DECIMAL(2,1) DEFAULT 5.0,
  review_count INT DEFAULT 0,
  summary_tags JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_shops_location ON shops USING GIST(location);

-- 帖子表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(128) NOT NULL,
  content TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  images JSONB,
  cover_image VARCHAR(255),
  consume_record JSONB,
  review_count INT DEFAULT 0,
  is_recommended BOOLEAN DEFAULT FALSE,
  recommend_rank INT,
  location VARCHAR(128),
  event_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_posts_recommended ON posts(is_recommended, recommend_rank);

-- 测评表
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  author_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(128),
  content TEXT,
  images JSONB,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  consume_record JSONB,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_shop ON reviews(shop_id, created_at DESC);
```

### 2.2 初始化测试数据

```sql
-- 插入测试群聊
INSERT INTO chat_groups (id, name, city, district, online_count) VALUES
('group_001', '南京市玄武区美食群', '南京市', '玄武区', 200);

-- 插入测试店铺
INSERT INTO shops (id, name, category, address, location, cover_image, summary_tags) VALUES
('shop_001', '南京盐水鸭', '美食', '南京市玄武区中山路1号', 
 'SRID=4326;POINT(118.7969 32.0603)', '/uploads/shop1.jpg',
 '{"positive": ["重油重辣", "人均22/人"], "negative": ["太酸了"], "averageCost": 22}'::jsonb);

-- 插入测试帖子
INSERT INTO posts (id, title, content, author_id, shop_id, cover_image, is_recommended, recommend_rank, location) VALUES
('post_001', '南京这家店味道真不错', '味道和环境真的非常不错，适合打卡就餐...', 
 'user_001', 'shop_001', '/uploads/post1.jpg', TRUE, 1, '南京市玄武区/距您300米');
```

---

## 三、后端开发

### 3.1 创建 NestJS 项目

```bash
cd backend

# 安装 NestJS CLI
npm install -g @nestjs/cli

# 创建项目
nest new fengxiangbiao-api --strict

# 安装依赖
cd fengxiangbiao-api
npm install @nestjs/typeorm typeorm pg @nestjs/websockets @nestjs/platform-ws
npm install class-validator class-transformer
npm install jsonwebtoken axios
npm install -D @types/jsonwebtoken
```

### 3.2 项目结构

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   └── database.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   └── dto/
│   │   │       └── login.dto.ts
│   │   ├── user/
│   │   ├── chat/
│   │   ├── shop/
│   │   ├── post/
│   │   └── upload/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── shop.entity.ts
│   │   ├── post.entity.ts
│   │   ├── message.entity.ts
│   │   └── review.entity.ts
│   ├── common/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── guards/
│   └── websocket/
│       ├── chat.gateway.ts
│       └── chat.module.ts
├── test/
├── package.json
├── tsconfig.json
└── Dockerfile
```

### 3.3 核心代码实现

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  app.setGlobalPrefix('api/v1');
  
  await app.listen(3000);
  console.log('API服务运行在: http://localhost:3000');
}
bootstrap();
```

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ChatModule } from './modules/chat/chat.module';
import { ShopModule } from './modules/shop/shop.module';
import { PostModule } from './modules/post/post.module';
import { UploadModule } from './modules/upload/upload.module';
import { ChatGateway } from './websocket/chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: 'app',
      password: process.env.DB_PASSWORD || 'dev123456',
      database: 'fengxiangbiao',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // 开发环境使用，生产环境关闭
    }),
    AuthModule,
    UserModule,
    ChatModule,
    ShopModule,
    PostModule,
    UploadModule,
  ],
  providers: [ChatGateway],
})
export class AppModule {}
```

**auth.controller.ts**

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.code);
  }
}
```

**auth.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private httpService: HttpService,
  ) {}

  async login(code: string) {
    // 1. 向微信服务器换取 openid
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    
    const { data } = await this.httpService.axiosRef.get(url);
    const { openid, session_key } = data;
    
    if (!openid) {
      throw new Error('微信登录失败');
    }
    
    // 2. 查询或创建用户
    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      user = this.userRepo.create({ openid });
      await this.userRepo.save(user);
    }
    
    // 3. 生成 JWT
    const token = jwt.sign(
      { userId: user.id, openid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return { token, user };
  }
}
```

**chat.gateway.ts**

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

@WebSocketGateway({
  path: '/ws/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients = new Map<string, WebSocket>();
  private onlineUsers = new Map<string, Set<string>>();

  handleConnection(client: WebSocket) {
    console.log('客户端连接');
  }

  handleDisconnect(client: WebSocket) {
    // 清理离线用户
    for (const [socketId, ws] of this.clients.entries()) {
      if (ws === client) {
        this.clients.delete(socketId);
        break;
      }
    }
  }

  @SubscribeMessage('join')
  handleJoin(client: WebSocket, payload: { groupId: string; userId: string }) {
    const { groupId, userId } = payload;
    
    if (!this.onlineUsers.has(groupId)) {
      this.onlineUsers.set(groupId, new Set());
    }
    this.onlineUsers.get(groupId).add(userId);
    
    // 广播在线人数
    this.broadcast(groupId, {
      type: 'online_count',
      data: { count: this.onlineUsers.get(groupId).size }
    });
  }

  @SubscribeMessage('message')
  handleMessage(client: WebSocket, payload: { groupId: string; type: string; content: string }) {
    // 保存到数据库（省略）
    
    // 广播消息
    this.broadcast(payload.groupId, {
      type: 'message',
      data: payload
    });
  }

  private broadcast(groupId: string, message: any) {
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}
```

### 3.4 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

---

## 四、前端开发

### 4.1 创建小程序项目

```bash
cd miniprogram

# 使用微信开发者工具创建项目
# 或命令行初始化
mkdir -p fengxiangbiao-miniprogram
cd fengxiangbiao-miniprogram
```

### 4.2 项目结构

```
miniprogram/
├── app.js
├── app.json
├── app.wxss
├── pages/
│   ├── chat/
│   │   ├── chat.js
│   │   ├── chat.wxml
│   │   ├── chat.wxss
│   │   └── chat.json
│   ├── feed/
│   ├── post-detail/
│   ├── shop-detail/
│   ├── shop-select/
│   └── photo-select/
├── components/
│   ├── shop-card/
│   ├── summary-tags/
│   ├── consume-record/
│   ├── message-item/
│   ├── chat-input/
│   ├── add-sheet/
│   └── feed-card/
├── utils/
│   ├── request.js
│   ├── websocket.js
│   ├── storage.js
│   └── location.js
├── services/
│   ├── auth.js
│   ├── chat.js
│   ├── shop.js
│   ├── post.js
│   └── upload.js
├── store/
│   ├── index.js
│   ├── userStore.js
│   ├── chatStore.js
│   └── shopStore.js
└── static/
    ├── images/
    └── icons/
```

### 4.3 核心代码实现

**app.json**

```json
{
  "pages": [
    "pages/feed/feed",
    "pages/chat/chat",
    "pages/post-detail/post-detail",
    "pages/shop-detail/shop-detail",
    "pages/shop-select/shop-select",
    "pages/photo-select/photo-select"
  ],
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/chat/chat",
        "text": "吃喝玩乐",
        "iconPath": "static/icons/chat.png",
        "selectedIconPath": "static/icons/chat-active.png"
      },
      {
        "pagePath": "pages/feed/feed",
        "text": "风向标",
        "iconPath": "static/icons/feed.png",
        "selectedIconPath": "static/icons/feed-active.png"
      }
    ],
    "selectedColor": "#a3e635",
    "backgroundColor": "#ffffff"
  },
  "window": {
    "navigationBarBackgroundColor": "#1a1a2e",
    "navigationBarTextStyle": "white"
  },
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于推荐附近美食"
    }
  }
}
```

**utils/request.js**

```javascript
const BASE_URL = 'http://localhost:3000/api/v1';

class Request {
  constructor() {
    this.baseURL = BASE_URL;
  }

  request(options) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      
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
            wx.navigateTo({ url: '/pages/login/login' });
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
}

module.exports = new Request();
```

**pages/chat/chat.js**

```javascript
const request = require('../../utils/request');

Page({
  data: {
    messages: [],
    inputValue: '',
    groupId: 'group_001',
    onlineCount: 0
  },

  onLoad() {
    this.loadMessages();
    this.connectWebSocket();
  },

  async loadMessages() {
    const messages = await request.get('/chat/messages', {
      groupId: this.data.groupId
    });
    this.setData({ messages });
  },

  connectWebSocket() {
    const ws = wx.connectSocket({
      url: 'ws://localhost:3000/ws/chat'
    });

    ws.onMessage((res) => {
      const data = JSON.parse(res.data);
      if (data.type === 'message') {
        this.setData({
          messages: [...this.data.messages, data.data]
        });
      } else if (data.type === 'online_count') {
        this.setData({ onlineCount: data.data.count });
      }
    });
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value });
  },

  async sendMessage() {
    const content = this.data.inputValue;
    if (!content.trim()) return;

    await request.post('/chat/message/send', {
      groupId: this.data.groupId,
      type: 'text',
      content
    });

    this.setData({ inputValue: '' });
  }
});
```

**pages/feed/feed.js**

```javascript
const request = require('../../utils/request');

Page({
  data: {
    recommendations: [],
    location: null
  },

  onLoad() {
    this.getLocation();
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: { lat: res.latitude, lng: res.longitude }
        });
        this.loadRecommendations();
      }
    });
  },

  async loadRecommendations() {
    const { location } = this.data;
    const recommendations = await request.get('/feed/recommendations', {
      lat: location.lat,
      lng: location.lng
    });
    this.setData({ recommendations });
  },

  onTapPost(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    });
  }
});
```

### 4.4 页面 WXML 示例

**pages/chat/chat.wxml**

```xml
<view class="chat-page">
  <!-- 顶部信息栏 -->
  <view class="header">
    <text class="location">南京市玄武区</text>
    <text class="online">{{onlineCount}}人在线</text>
  </view>

  <!-- 消息列表 -->
  <scroll-view class="message-list" scroll-y>
    <block wx:for="{{messages}}" wx:key="id">
      <view class="message-item {{item.sender.id === userId ? 'self' : ''}}">
        <image class="avatar" src="{{item.sender.avatar}}" />
        <view class="content">
          <text class="nickname">{{item.sender.nickname}}</text>
          <view class="bubble">
            <text wx:if="{{item.type === 'text'}}">{{item.content}}</text>
            <image wx:if="{{item.type === 'image'}}" src="{{item.content}}" mode="widthFix" />
            <shop-card wx:if="{{item.type === 'shop_card'}}" shop="{{item.shopCard}}" />
          </view>
        </view>
      </view>
    </block>
  </scroll-view>

  <!-- 输入框 -->
  <view class="input-bar">
    <button class="plus-btn" bindtap="showAddSheet">+</button>
    <input 
      class="input" 
      value="{{inputValue}}" 
      bindinput="onInputChange"
      placeholder="说点什么..."
    />
    <button class="send-btn" bindtap="sendMessage">发送</button>
  </view>
</view>
```

---

## 五、联调测试

### 5.1 本地启动服务

```bash
# 终端 1：启动数据库
docker-compose -f docker-compose.dev.yml up -d

# 终端 2：启动后端 API
cd backend/fengxiangbiao-api
npm run start:dev

# 终端 3：启动 WebSocket（如分离部署）
npm run start:ws
```

### 5.2 配置小程序开发环境

```javascript
// utils/request.js（开发环境）
const BASE_URL = 'http://localhost:3000/api/v1';

// 在微信开发者工具中：
// 设置 → 项目设置 → 勾选"不校验合法域名"
```

### 5.3 测试用例

| 功能 | 测试步骤 | 预期结果 |
|------|---------|---------|
| 微信登录 | 点击登录按钮 | 获取用户信息，跳转首页 |
| 加载推荐 | 进入风向标页面 | 显示附近店铺推荐列表 |
| 发送消息 | 在聊天页输入文字并发送 | 消息出现在列表中，其他用户收到 |
| 发送图片 | 点击"+"选择图片 | 图片上传成功，显示在聊天中 |
| 店铺卡片 | 点击"+"选择店铺 | 店铺卡片发送到聊天 |
| 查看详情 | 点击帖子卡片 | 进入详情页，显示完整信息 |
| 地图导航 | 点击导航按钮 | 调用微信地图导航 |

### 5.4 调试工具

```bash
# 查看后端日志
cd backend/fengxiangbiao-api
npm run start:dev

# 查看数据库
docker-compose -f docker-compose.dev.yml exec postgres psql -U app -d fengxiangbiao

# 查看网络请求
# 微信开发者工具 → Network 面板
```

---

## 六、部署上线

### 6.1 准备生产环境

```bash
# 1. 购买云服务器（阿里云/腾讯云）
# 2. 配置域名解析
# 3. 申请 SSL 证书

# 4. 服务器环境配置
ssh root@your-server-ip
apt update && apt install -y docker.io docker-compose

# 5. 上传代码
scp -r ./backend root@your-server-ip:/app/
scp -r ./miniprogram root@your-server-ip:/app/
```

### 6.2 生产环境 Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-alpine
    restart: always
    volumes:
      - /app/postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: fengxiangbiao
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  api:
    build: ./backend
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      WX_APPID: ${WX_APPID}
      WX_SECRET: ${WX_SECRET}
    volumes:
      - /app/uploads:/app/uploads

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /app/uploads:/app/uploads:ro
```

### 6.3 部署命令

```bash
cd /app

# 构建并启动
docker-compose up -d --build

# 执行数据库迁移
docker-compose exec api npx typeorm migration:run

# 验证
curl http://your-domain.com/api/v1/health
```

### 6.4 小程序上线

1. 配置服务器域名（微信公众平台）
2. 修改小程序代码中的 API 地址为生产地址
3. 使用微信开发者工具上传代码
4. 提交审核
5. 审核通过后发布

---

## 七、迭代优化

### 7.1 功能迭代计划

| 版本 | 功能 | 优先级 |
|------|------|--------|
| v1.1 | 用户个人主页、关注功能 | 高 |
| v1.2 | 店铺收藏、历史浏览 | 中 |
| v1.3 | 消息搜索、聊天记录导出 | 中 |
| v1.4 | 引入 Redis 缓存热点数据 | 低 |
| v2.0 | 引入 AI 自动生成标签 | 低 |

### 7.2 性能优化

```bash
# 数据库索引优化
CREATE INDEX CONCURRENTLY idx_messages_created ON messages(created_at DESC);

# 查询优化（使用 EXPLAIN ANALYZE）
EXPLAIN ANALYZE SELECT * FROM shops WHERE ST_DWithin(location, ...);

# 图片压缩（上传时）
# 使用 sharp 库压缩图片后再存储
```

### 7.3 监控与日志

```bash
# 查看容器资源使用
docker stats

# 查看错误日志
docker-compose logs -f api | grep ERROR

# 设置日志轮转
# 编辑 /etc/logrotate.d/docker
```

---

## 附录

### A. 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 数据库连接失败 | 密码错误 / 网络不通 | 检查 .env 配置 |
| 微信登录失败 | AppID/Secret 错误 | 检查环境变量 |
| WebSocket 连接失败 | Nginx 未配置 upgrade | 检查 nginx.conf |
| 图片上传失败 | 目录权限不足 | chmod 755 /app/uploads |
| 小程序请求失败 | 域名未配置白名单 | 微信公众平台配置 |

### B. 开发工具推荐

| 工具 | 用途 |
|------|------|
| Postman | API 调试 |
| TablePlus | 数据库管理 |
| wscat | WebSocket 测试 |
| pm2 | 进程管理（非 Docker 部署） |

### C. 学习资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [TypeORM 文档](https://typeorm.io/)
