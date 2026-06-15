# 风向标小程序云端部署指南

> 最小化架构 — 单服务器 Docker 部署方案
>
> 版本 1.0 | 2026-06-15

---

## 目录

- [一、部署方案概述](#一部署方案概述)
- [二、云服务器选型](#二云服务器选型)
- [三、环境准备](#三环境准备)
- [四、部署步骤](#四部署步骤)
- [五、域名与 SSL](#五域名与-ssl)
- [六、微信小程序配置](#六微信小程序配置)
- [七、运维管理](#七运维管理)
- [八、扩容方案](#八扩容方案)

---

## 一、部署方案概述

最小化架构仅需一台云服务器即可运行全部服务：

| 组件 | 部署方式 | 说明 |
|------|---------|------|
| 业务 API | Docker 容器 | Node.js / NestJS |
| WebSocket | Docker 容器 | Node.js / ws |
| 数据库 | Docker 容器 | PostgreSQL + PostGIS |
| 反向代理 | Docker 容器 | Nginx |
| 文件存储 | 宿主机目录 | 映射到容器内 |

### 部署架构

```
┌─────────────────────────────────────────┐
│           云服务器 (1台)                 │
│  ┌─────────────────────────────────┐   │
│  │           Nginx                 │   │
│  │    80/443 → 反向代理             │   │
│  │    静态文件服务                  │   │
│  └─────────────┬───────────────────┘   │
│                │                        │
│    ┌───────────┴───────────┐            │
│    ▼                       ▼            │
│  ┌─────────┐           ┌─────────┐      │
│  │ API 服务 │           │ WS 服务  │      │
│  │ :3000   │           │ :3001   │      │
│  └────┬────┘           └────┬────┘      │
│       │                     │           │
│       └──────────┬──────────┘           │
│                  ▼                      │
│           ┌─────────────┐              │
│           │ PostgreSQL  │              │
│           │ :5432       │              │
│           └─────────────┘              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      宿主机 /app/uploads        │   │
│  │      (图片文件存储)              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 二、云服务器选型

### 推荐配置

| 阶段 | 配置 | 月费用（参考） | 适用场景 |
|------|------|--------------|---------|
| 开发测试 | 2核 4G 内存 / 50G SSD | 约 50-100 元 | 开发调试、内部测试 |
| 初期上线 | 2核 4G 内存 / 100G SSD | 约 100-200 元 | 小用户量、验证产品 |
| 用户增长 | 4核 8G 内存 / 200G SSD | 约 300-500 元 | 日活 1000+ |

### 推荐厂商

| 厂商 | 优势 | 推荐套餐 |
|------|------|---------|
| 阿里云 ECS | 国内访问快、文档完善 | 共享型 s6 2核4G |
| 腾讯云 CVM | 与微信生态整合好 | 标准型 S5 2核4G |
| 华为云 ECS | 性价比高 | 通用型 s6 2核4G |
| AWS Lightsail | 海外访问、稳定 | 4USD/月套餐 |

### 操作系统

推荐 **Ubuntu 22.04 LTS** 或 **CentOS 8 Stream**，以下步骤以 Ubuntu 为例。

---

## 三、环境准备

### 3.1 连接服务器

```bash
# 使用 SSH 连接（Mac/Linux 终端，Windows 用 PowerShell 或 Git Bash）
ssh root@your-server-ip

# 如果使用密钥
ssh -i ~/.ssh/your-key.pem root@your-server-ip
```

### 3.2 基础环境安装

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker
apt install -y docker.io docker-compose

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker-compose --version

# 创建应用目录
mkdir -p /app/{backend,websocket,nginx,uploads}
mkdir -p /app/postgres-data
```

### 3.3 防火墙配置

```bash
# 安装 ufw（如未安装）
apt install -y ufw

# 允许必要端口
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3000/tcp    # API（开发调试，生产可关闭）
ufw allow 3001/tcp    # WebSocket（开发调试，生产可关闭）

# 启用防火墙
ufw enable

# 查看状态
ufw status
```

---

## 四、部署步骤

### 4.1 准备代码

```bash
cd /app

# 克隆后端代码（假设代码托管在 GitHub/GitLab）
git clone https://github.com/your-team/fengxiangbiao-backend.git backend
git clone https://github.com/your-team/fengxiangbiao-websocket.git websocket

# 或使用 SCP 从本地上传
# scp -r ./backend root@your-server-ip:/app/
```

### 4.2 创建 Docker Compose 文件

```bash
cat > /app/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-alpine
    container_name: fxb-postgres
    restart: always
    volumes:
      - /app/postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: fengxiangbiao
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d fengxiangbiao"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    container_name: fxb-api
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: fengxiangbiao
      DB_USER: app
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      UPLOAD_DIR: /app/uploads
    volumes:
      - /app/uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"

  websocket:
    build: ./websocket
    container_name: fxb-websocket
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: fengxiangbiao
      DB_USER: app
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3001:3001"

  nginx:
    image: nginx:alpine
    container_name: fxb-nginx
    restart: always
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /app/uploads:/app/uploads:ro
    depends_on:
      - api
      - websocket
    ports:
      - "80:80"
      - "443:443"
EOF
```

### 4.3 创建环境变量文件

```bash
cat > /app/.env << 'EOF'
# 数据库密码（生产环境请使用强密码）
DB_PASSWORD=YourStrongPassword123!

# JWT 密钥（随机生成，至少 32 位）
JWT_SECRET=your-random-secret-key-at-least-32-characters
EOF

# 设置权限
chmod 600 /app/.env
```

### 4.4 配置 Nginx

```bash
cat > /app/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # 静态文件服务（图片上传）
    server {
        listen 80;
        server_name _;

        # 上传文件访问
        location /uploads/ {
            alias /app/uploads/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # API 反向代理
        location /api/ {
            proxy_pass http://api:3000/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 超时设置
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # WebSocket 反向代理
        location /ws/ {
            proxy_pass http://websocket:3001/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket 长连接超时
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
```

### 4.5 构建与启动

```bash
cd /app

# 构建镜像
docker-compose build

# 启动服务（后台运行）
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api
```

### 4.6 初始化数据库

```bash
# 等待数据库就绪
docker-compose exec postgres pg_isready -U app

# 执行数据库迁移（假设使用 TypeORM / Prisma）
docker-compose exec api npx prisma migrate deploy
# 或
docker-compose exec api npm run migration:run

# 初始化数据（可选）
docker-compose exec api npm run seed
```

### 4.7 验证部署

```bash
# 测试 API 健康检查
curl http://localhost/health

# 测试 API 接口
curl http://localhost/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'

# 测试 WebSocket（使用 wscat 或在线工具）
# wscat -c ws://your-server-ip/ws/chat
```

---

## 五、域名与 SSL

### 5.1 域名解析

在域名服务商（阿里云、腾讯云等）控制台添加解析记录：

| 记录类型 | 主机记录 | 记录值 | 说明 |
|---------|---------|--------|------|
| A | api | 服务器 IP | API 域名 |
| A | ws | 服务器 IP | WebSocket 域名 |
| A | cdn | 服务器 IP | 静态资源域名 |

### 5.2 申请 SSL 证书（Let's Encrypt）

```bash
# 安装 certbot
apt install -y certbot

# 申请证书（ standalone 模式，需先停止 Nginx）
certbot certonly --standalone -d api.yourdomain.com -d ws.yourdomain.com

# 或使用 DNS 验证（不占用 80 端口）
certbot certonly --manual --preferred-challenges dns -d api.yourdomain.com

# 证书位置
# /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
```

### 5.3 更新 Nginx 配置（HTTPS）

```bash
cat > /app/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # HTTP 重定向到 HTTPS
    server {
        listen 80;
        server_name api.yourdomain.com ws.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS API 服务
    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location /api/ {
            proxy_pass http://api:3000/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /uploads/ {
            alias /app/uploads/;
            expires 30d;
        }
    }

    # HTTPS WebSocket 服务
    server {
        listen 443 ssl http2;
        server_name ws.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://websocket:3001/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400s;
        }
    }
}
EOF

# 重新加载 Nginx
docker-compose exec nginx nginx -s reload
```

### 5.4 自动续期

```bash
# 测试续期
certbot renew --dry-run

# 添加定时任务（每月自动续期）
crontab -e

# 添加以下行
0 3 1 * * certbot renew --quiet --deploy-hook "docker-compose -f /app/docker-compose.yml exec nginx nginx -s reload"
```

---

## 六、微信小程序配置

### 6.1 服务器域名配置

登录[微信公众平台](https://mp.weixin.qq.com/) → 开发 → 开发设置 → 服务器域名：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://api.yourdomain.com` |
| socket 合法域名 | `wss://ws.yourdomain.com` |
| uploadFile 合法域名 | `https://api.yourdomain.com` |
| downloadFile 合法域名 | `https://api.yourdomain.com` |

### 6.2 小程序代码配置

```javascript
// utils/request.js
const BASE_URL = 'https://api.yourdomain.com/api/v1';
const WS_URL = 'wss://ws.yourdomain.com';

// 更新 app.json
// 确保 request 域名已添加到服务器域名白名单
```

### 6.3 上传与发布

1. 使用微信开发者工具上传代码
2. 在小程序后台提交审核
3. 审核通过后发布

---

## 七、运维管理

### 7.1 常用命令

```bash
cd /app

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart api

# 更新代码后重新构建
docker-compose down
docker-compose up -d --build

# 进入容器调试
docker-compose exec api sh

# 数据库备份
docker-compose exec postgres pg_dump -U app fengxiangbiao > /app/backup/$(date +%Y%m%d).sql

# 数据库恢复
docker-compose exec -T postgres psql -U app fengxiangbiao < /app/backup/20240101.sql

# 查看资源使用
docker stats
```

### 7.2 日志管理

```bash
# 日志轮转（防止磁盘占满）
cat > /etc/logrotate.d/fengxiangbiao << 'EOF'
/app/postgres-data/log/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 postgres postgres
}
EOF

# 查看容器日志大小
docker system df -v

# 清理旧日志
docker-compose logs --tail=100 api
```

### 7.3 备份策略

```bash
# 创建备份脚本
cat > /app/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/app/backup"
DATE=$(date +%Y%m%d_%H%M%S)

# 数据库备份
docker-compose exec -T postgres pg_dump -U app fengxiangbiao | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 文件备份
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /app/uploads

# 保留最近 7 天备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
EOF

chmod +x /app/backup.sh

# 添加定时任务（每天凌晨 3 点备份）
crontab -e
0 3 * * * /app/backup.sh >> /var/log/backup.log 2>&1
```

### 7.4 更新部署

```bash
# 1. 拉取最新代码
cd /app/backend && git pull origin main
cd /app/websocket && git pull origin main

# 2. 重新构建并启动
cd /app
docker-compose down
docker-compose up -d --build

# 3. 执行数据库迁移（如有）
docker-compose exec api npm run migration:run

# 4. 验证
curl https://api.yourdomain.com/health
```

---

## 八、扩容方案

### 8.1 垂直扩容（升级服务器）

当单服务器性能不足时：

```bash
# 1. 在云控制台升级配置（如 2核4G → 4核8G）
# 2. 重启服务器
# 3. 服务自动启动（Docker restart: always）
```

### 8.2 水平扩容（多服务器）

当用户量持续增长，需要拆分服务：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   负载均衡器     │────▶│   应用服务器 1   │────▶│   数据库服务器  │
│   (Nginx/SLB)   │────▶│   应用服务器 2   │     │  (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

拆分步骤：

1. 数据库迁移到独立服务器（RDS）
2. 文件存储迁移到对象存储（OSS）
3. 应用服务器部署多台，通过负载均衡分发
4. 引入 Redis 缓存热点数据

### 8.3 使用云托管服务

| 服务 | 云厂商方案 | 优势 |
|------|----------|------|
| 数据库 | 阿里云 RDS PostgreSQL | 自动备份、监控、扩容 |
| 文件存储 | 阿里云 OSS | CDN 加速、无限容量 |
| 容器部署 | 阿里云 ACK / 腾讯云 TKE | 自动扩缩容 |
| 域名/CDN | 阿里云 CDN | 全球加速 |

---

## 附录

### A. 故障排查

| 现象 | 排查步骤 | 解决方式 |
|------|---------|---------|
| 服务无法启动 | `docker-compose logs` 查看错误 | 检查配置、端口冲突 |
| 数据库连接失败 | `docker-compose exec postgres pg_isready` | 检查密码、网络 |
| WebSocket 连接失败 | 检查 Nginx 配置中的 upgrade 头 | 确认 ws 协议配置正确 |
| 图片无法访问 | 检查 uploads 目录权限 | `chmod 755 /app/uploads` |
| 证书过期 | `certbot renew` | 检查定时任务 |

### B. 性能优化

```bash
# PostgreSQL 性能调优（根据服务器内存调整）
# 编辑 /app/postgres-data/postgresql.conf
cat >> /app/postgres-data/postgresql.conf << 'EOF'
# 内存配置（假设服务器 4G 内存）
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 16MB
maintenance_work_mem = 128MB

# 连接数
max_connections = 100

# 日志
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
EOF

# 重启数据库
docker-compose restart postgres
```

### C. 安全加固

```bash
# 1. 禁用 root SSH 登录，使用普通用户
# 2. 修改 SSH 默认端口
# 3. 安装 fail2ban 防止暴力破解
apt install -y fail2ban

# 4. 定期更新系统
apt update && apt upgrade -y

# 5. 限制容器资源
cat >> /app/docker-compose.yml << 'EOF'
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
EOF
```
