# 风向标小程序开发文档

> 本地生活美食社交类小程序 — 前端页面与后端接口设计
>
> 版本 1.0 | 2026-06-15

---

## 目录

- [一、项目概述](#一项目概述)
- [二、页面梳理](#二页面梳理)
- [三、接口设计](#三接口设计)
- [四、数据模型](#四数据模型)
- [五、交互流程](#五交互流程)
- [六、项目结构](#六项目结构)

---

## 一、项目概述

风向标是一款基于地理位置的本地生活美食社交小程序，用户可以在"吃喝玩乐"群聊中分享美食发现，浏览"风向标"推荐的优质店铺，查看店铺详情与真实测评，并基于AI总结快速了解店铺特点。

### 核心功能模块

| 模块 | 功能 |
|------|------|
| 社交互动 | 群聊消息实时收发、发送文字/图片/店铺卡片、在线人数显示 |
| 内容推荐 | 风向标推荐榜单、AI智能总结店铺特点、真实用户测评展示 |
| 店铺服务 | 店铺信息查看、地图导航、相关推荐 |
| 内容发布 | 选择店铺生成卡片、上传照片分享、消费记录展示 |

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | 微信小程序原生框架 | WXML + WXSS + JS，使用 Component 构建组件 |
| 状态管理 | MobX / 自研 Store | 管理用户状态、消息状态、店铺数据 |
| 网络 | wx.request + WebSocket | HTTP 请求 + 实时消息推送 |
| 地图 | 腾讯位置服务 | 定位、距离计算、导航 |
| 后端通信 | RESTful API + WebSocket | JSON 格式数据交换 |

---

## 二、页面梳理

根据 UI 设计稿，小程序共包含 **6 个核心页面** 和 **2 个弹窗/组件**。

### 2.1 TabBar 页面（2 个）

| 页面名称 | 页面路径 | 功能描述 | 核心组件 |
|---------|---------|---------|---------|
| 吃喝玩乐 | `/pages/chat/chat` | 群聊互动页面，展示消息列表，支持发送文字、图片、店铺卡片 | MessageList, ChatInput, ShopCard, LocationBar |
| 风向标 | `/pages/feed/feed` | 推荐内容主页，展示热门店铺推荐、AI 总结、消费记录 | FeedCard, ShopInfo, AISummary, ConsumeRecord |

### 2.2 子页面（4 个）

| 页面名称 | 页面路径 | 入口 | 功能描述 |
|---------|---------|------|---------|
| 帖子详情 | `/pages/post-detail/post-detail` | 风向标页卡片点击 | 展示帖子大图、详细描述、测评人数、时间地点、AI 总结、优惠信息、相关推荐 |
| 店铺详情 | `/pages/shop-detail/shop-detail` | 聊天中店铺卡片 / 风向标页 | 展示店铺信息、AI 总结、用户测评列表、分享按钮 |
| 选择店铺 | `/pages/shop-select/shop-select` | 添加弹窗-选择店铺 | 店铺列表展示、搜索、单选、发送 |
| 选择照片 | `/pages/photo-select/photo-select` | 添加弹窗-选择照片 | 相册选择、拍照、预览、上传 |

### 2.3 弹窗与组件

| 组件名称 | 类型 | 触发方式 | 功能描述 |
|---------|------|---------|---------|
| 添加内容弹窗 | Bottom Sheet | 聊天页底部 "+" 按钮 | 提供"选择店铺"和"选择照片"两个入口 |
| 店铺卡片 | 可复用组件 | 聊天消息中嵌入 | 展示店铺缩略图、名称、地址、AI 总结标签、测评人数 |
| AI 总结标签 | 可复用组件 | 店铺卡片 / 详情页 | 展示优缺点标签（绿色对勾 / 红色叉号） |
| 消费记录卡片 | 可复用组件 | 帖子内容中 | 展示消费金额、商户信息、交易时间等 |

---

## 三、接口设计

接口采用 RESTful 风格，统一返回格式如下：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

- `code`: 0 表示成功，非 0 表示失败
- `message`: 提示信息
- `data`: 业务数据

### 3.1 用户模块

#### 1. 微信登录

```
POST /api/v1/auth/login
```

小程序调用 `wx.login()` 获取 code 后，发送至后端换取自定义登录态。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| code | string | 是 | 微信登录临时凭证 |
| userInfo | object | 否 | 用户信息（需用户授权） |

#### 2. 获取当前用户信息

```
GET /api/v1/user/me
```

获取当前登录用户的基本信息。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| token | string | 是 | 登录态 token（放 Header） |

### 3.2 聊天模块

#### 3. 获取消息历史

```
GET /api/v1/chat/messages
```

分页获取群聊历史消息。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| groupId | string | 是 | 群聊 ID |
| lastId | string | 否 | 上一页最后一条消息 ID |
| limit | number | 否 | 每页条数，默认 20 |

#### 4. 发送消息

```
POST /api/v1/chat/message/send
```

发送文字、图片或店铺卡片消息。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| groupId | string | 是 | 群聊 ID |
| type | string | 是 | 消息类型：text / image / shop_card |
| content | string | 是 | 文字内容 / 图片 URL / 店铺 ID |

#### 5. 获取群聊信息

```
GET /api/v1/chat/group/:groupId
```

获取群聊基本信息，包括在线人数、定位区域等。

#### 6. WebSocket 连接（实时消息）

```
WS wss://api.example.com/ws/chat?token=xxx&groupId=xxx
```

建立 WebSocket 连接用于实时收发消息。

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| ping / pong | 双向 | 心跳保活 |
| message | 服务端推送 | 新消息通知 |
| ack | 客户端发送 | 消息已读确认 |
| typing | 双向 | 正在输入状态 |

### 3.3 店铺模块

#### 7. 获取店铺列表

```
GET /api/v1/shops
```

根据地理位置获取附近店铺列表。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| lat | number | 是 | 纬度 |
| lng | number | 是 | 经度 |
| radius | number | 否 | 搜索半径（米），默认 3000 |
| keyword | string | 否 | 搜索关键词 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |

#### 8. 获取店铺详情

```
GET /api/v1/shops/:shopId
```

获取店铺详细信息，包含 AI 总结。

#### 9. 获取店铺测评列表

```
GET /api/v1/shops/:shopId/reviews
```

获取指定店铺的用户测评列表。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

### 3.4 帖子/推荐模块

#### 10. 获取推荐列表（风向标）

```
GET /api/v1/feed/recommendations
```

获取风向标推荐内容列表。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| lat | number | 否 | 用户纬度 |
| lng | number | 否 | 用户经度 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

#### 11. 获取帖子详情

```
GET /api/v1/posts/:postId
```

获取帖子详情，包含消费记录、相关推荐。

#### 12. 获取相关推荐

```
GET /api/v1/posts/:postId/related
```

获取与当前帖子相关的店铺/景点推荐。

### 3.5 内容发布模块

#### 13. 上传图片

```
POST /api/v1/upload/image
```

上传图片到服务器，返回图片 URL。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | file | 是 | 图片文件（multipart/form-data） |

#### 14. 发布帖子

```
POST /api/v1/posts
```

发布新的美食分享帖子。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| shopId | string | 是 | 关联店铺 ID |
| title | string | 是 | 帖子标题 |
| content | string | 是 | 帖子内容 |
| images | array | 否 | 图片 URL 数组 |
| consumeRecord | object | 否 | 消费记录信息 |

### 3.6 AI 模块

#### 15. 获取店铺 AI 总结

```
GET /api/v1/ai/shop-summary/:shopId
```

获取 AI 对店铺的自动总结，包含口味、人均、优缺点等标签。

### 3.7 页面与接口对照表

| 页面 | 调用的接口 | 触发时机 |
|------|----------|---------|
| 吃喝玩乐（chat） | `GET /chat/group/:groupId`<br>`GET /chat/messages`<br>`POST /chat/message/send`<br>`WS /ws/chat` | 页面加载时获取群信息和历史消息；发送消息时调用；WebSocket 保持实时连接 |
| 风向标（feed） | `GET /feed/recommendations`<br>`GET /shops/:shopId`<br>`GET /ai/shop-summary/:shopId` | 页面加载获取推荐列表；卡片展示时获取店铺和 AI 总结 |
| 帖子详情 | `GET /posts/:postId`<br>`GET /posts/:postId/related`<br>`GET /ai/shop-summary/:shopId` | 页面加载获取帖子详情；滚动到底部加载相关推荐 |
| 店铺详情 | `GET /shops/:shopId`<br>`GET /shops/:shopId/reviews`<br>`GET /ai/shop-summary/:shopId` | 页面加载获取店铺信息和 AI 总结；上拉加载测评列表 |
| 选择店铺 | `GET /shops?keyword=xxx` | 页面加载获取附近店铺；输入关键词时搜索 |
| 选择照片 | `POST /upload/image` | 选择照片后上传至服务器 |

---

## 四、数据模型

### 4.1 用户（User）

```json
{
  "id": "string",
  "openid": "string",
  "nickname": "string",
  "avatar": "string",
  "location": {
    "lat": 32.0603,
    "lng": 118.7969,
    "city": "南京市"
  },
  "createdAt": "2026-01-15T08:30:00Z"
}
```

### 4.2 群聊（ChatGroup）

```json
{
  "id": "string",
  "name": "string",
  "location": {
    "city": "南京市",
    "district": "玄武区"
  },
  "onlineCount": 200,
  "memberCount": 1500,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### 4.3 消息（Message）

```json
{
  "id": "string",
  "groupId": "string",
  "sender": {
    "id": "string",
    "nickname": "string",
    "avatar": "string"
  },
  "type": "text",
  "content": "string",
  "shopCard": {
    "shopId": "string",
    "name": "南京盐水鸭",
    "address": "南京市玄武区",
    "distance": 300,
    "aiSummary": {
      "tags": [
        { "label": "重油重辣", "type": "positive" },
        { "label": "人均22/人", "type": "positive" },
        { "label": "太酸了", "type": "negative" }
      ],
      "reviewCount": 2000
    }
  },
  "createdAt": "2026-01-24T11:35:00Z"
}
```

### 4.4 店铺（Shop）

```json
{
  "id": "string",
  "name": "string",
  "category": "string",
  "address": "string",
  "location": {
    "lat": 32.0603,
    "lng": 118.7969
  },
  "distance": 300,
  "coverImage": "string",
  "phone": "string",
  "businessHours": "string",
  "rating": 4.5,
  "reviewCount": 2000,
  "aiSummary": {
    "positive": ["重油重辣", "人均22/人"],
    "negative": ["太酸了"],
    "averageCost": 22
  },
  "isVerified": true,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### 4.5 帖子（Post）

```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "author": {
    "id": "string",
    "nickname": "string",
    "avatar": "string"
  },
  "shopId": "string",
  "shopName": "string",
  "images": ["string"],
  "coverImage": "string",
  "consumeRecord": {
    "amount": -115000.00,
    "merchantName": "string",
    "tradeTime": "2021-05-08T21:43:19Z",
    "tradeNo": "string",
    "paymentMethod": "string"
  },
  "reviewCount": 6321,
  "isRecommended": true,
  "recommendRank": 1,
  "location": "南京市玄武区/距您300米",
  "eventTime": "2026-01-24T19:30:00Z",
  "createdAt": "2026-01-24T10:00:00Z"
}
```

### 4.6 测评（Review）

```json
{
  "id": "string",
  "shopId": "string",
  "author": {
    "id": "string",
    "nickname": "string",
    "avatar": "string"
  },
  "title": "string",
  "content": "string",
  "images": ["string"],
  "rating": 5,
  "consumeRecord": {
    "amount": -115000.00,
    "tradeTime": "string"
  },
  "likeCount": 128,
  "createdAt": "2026-01-24T10:00:00Z"
}
```

---

## 五、交互流程

### 5.1 页面跳转关系

- 吃喝玩乐页 → 点击店铺卡片 → 店铺详情页
- 吃喝玩乐页 → 点击 "+" → 添加弹窗 → 选择店铺/照片 → 选择店铺页/选择照片页
- 风向标页 → 点击 "查看" → 帖子详情页
- 风向标页 → 点击店铺卡片 → 店铺详情页
- 帖子详情页 → 点击相关推荐 → 帖子详情页/店铺详情页

### 5.2 核心业务流程

#### 流程一：用户浏览推荐内容

```
打开小程序 → wx.login 获取 code → POST /auth/login → 进入风向标 Tab
→ GET /feed/recommendations → 渲染推荐列表 → 点击卡片
→ GET /posts/:postId → 进入帖子详情
```

#### 流程二：用户参与群聊

```
进入吃喝玩乐 Tab → GET /chat/group/:groupId → GET /chat/messages
→ 连接 WebSocket

点击 "+" → 选择店铺 → GET /shops → 选择店铺发送
→ POST /chat/message/send
```

#### 流程三：用户发布内容

```
点击 "+" → 选择照片 → wx.chooseMedia → POST /upload/image
→ POST /chat/message/send
```

### 5.3 WebSocket 消息协议

**客户端发送消息：**

```json
{
  "type": "message",
  "data": {
    "groupId": "group_001",
    "msgType": "text",
    "content": "我发现XX路口的面条很好吃"
  }
}
```

**服务端推送消息：**

```json
{
  "type": "message",
  "data": {
    "id": "msg_123",
    "sender": {
      "id": "u_001",
      "nickname": "小明",
      "avatar": "..."
    },
    "type": "text",
    "content": "我发现XX路口的面条很好吃",
    "createdAt": "2026-01-24T11:35:00Z"
  }
}
```

**心跳：**

```json
{ "type": "ping" }  // 客户端发送
{ "type": "pong" }  // 服务端响应
```

---

## 六、项目结构

### 6.1 小程序目录结构

```
miniprogram/
├── app.js                  // 小程序入口
├── app.json                // 全局配置（页面路由、TabBar、窗口样式）
├── app.wxss                // 全局样式
├── sitemap.json            // 搜索配置
│
├── pages/                  // 页面目录
│   ├── chat/               // 吃喝玩乐（群聊页）
│   │   ├── chat.js
│   │   ├── chat.wxml
│   │   ├── chat.wxss
│   │   └── chat.json
│   ├── feed/               // 风向标（推荐页）
│   │   ├── feed.js
│   │   ├── feed.wxml
│   │   ├── feed.wxss
│   │   └── feed.json
│   ├── post-detail/        // 帖子详情页
│   │   ├── post-detail.js
│   │   ├── post-detail.wxml
│   │   ├── post-detail.wxss
│   │   └── post-detail.json
│   ├── shop-detail/        // 店铺详情页
│   │   ├── shop-detail.js
│   │   ├── shop-detail.wxml
│   │   ├── shop-detail.wxss
│   │   └── shop-detail.json
│   ├── shop-select/        // 选择店铺页
│   │   ├── shop-select.js
│   │   ├── shop-select.wxml
│   │   ├── shop-select.wxss
│   │   └── shop-select.json
│   └── photo-select/       // 选择照片页
│       ├── photo-select.js
│       ├── photo-select.wxml
│       ├── photo-select.wxss
│       └── photo-select.json
│
├── components/             // 公共组件
│   ├── shop-card/          // 店铺卡片
│   ├── ai-summary/         // AI 总结标签
│   ├── consume-record/     // 消费记录
│   ├── message-item/       // 消息条目
│   ├── chat-input/         // 聊天输入框
│   ├── add-sheet/          // 添加内容底部弹窗
│   └── feed-card/          // 风向标推荐卡片
│
├── utils/                  // 工具函数
│   ├── request.js          // HTTP 请求封装
│   ├── websocket.js        // WebSocket 封装
│   ├── storage.js          // 本地存储封装
│   └── location.js         // 定位相关工具
│
├── services/               // API 服务层
│   ├── auth.js             // 登录相关
│   ├── chat.js             // 聊天相关
│   ├── shop.js             // 店铺相关
│   ├── post.js             // 帖子相关
│   └── upload.js           // 上传相关
│
├── store/                  // 状态管理
│   ├── index.js            // Store 入口
│   ├── userStore.js        // 用户状态
│   ├── chatStore.js        // 聊天状态
│   └── shopStore.js        // 店铺状态
│
└── static/                 // 静态资源
    ├── images/             // 图片资源
    └── icons/              // 图标资源
```

### 6.2 app.json 配置示例

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
    "backgroundColor": "#ffffff",
    "borderStyle": "black"
  },
  "window": {
    "navigationBarBackgroundColor": "#1a1a2e",
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "风向标"
  },
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于推荐附近美食"
    }
  }
}
```

### 6.3 请求封装示例（utils/request.js）

```javascript
const BASE_URL = 'https://api.example.com/api/v1';

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' });
          reject(res.data);
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  del: (url, data) => request({ url, method: 'DELETE', data })
};
```

---

## 开发注意事项

1. 所有接口请求需携带登录态 token，未登录用户跳转授权页
2. 图片上传使用 `wx.uploadFile`，注意文件大小限制（默认 10MB）
3. WebSocket 断线需实现自动重连机制
4. 定位功能需先申请用户授权，拒绝时提供手动选择城市入口
5. 列表页面需实现下拉刷新和上拉加载更多
6.ahref店铺卡片和 AI 总结组件需在多个页面复用，保持样式一致
