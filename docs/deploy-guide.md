# 部署文档

## 当前部署方式

项目使用根目录 `Dockerfile` 构建后端镜像。镜像基于官方 `node:20`，在容器内安装后端依赖并构建 NestJS 应用。

管理后台前端不在 Dockerfile 内构建，需要先在本地生成 `admin-frontend/dist`。Dockerfile 会把该目录复制到后端容器内的 `admin` 目录，由 NestJS 托管。

容器默认监听 `80`：

```text
http://服务地址/           管理后台
http://服务地址/api/v1/...  后端 API
http://服务地址/uploads/... 上传文件
http://服务地址/static/...  系统静态资源
```

## 构建管理后台前端

在项目根目录执行：

```bash
cd admin-frontend
pnpm install
pnpm build
```

构建完成后需要存在：

```text
admin-frontend/dist
```

## 构建 Docker 镜像

回到项目根目录：

```bash
cd ..
docker build -t finder:latest .
```

如果当前已经在项目根目录，则直接执行：

```bash
docker build -t finder:latest .
```

## 本地运行验证

准备运行时环境变量文件，例如 `runtime-config.env`：

```text
NODE_ENV=production
PORT=80
DB_TYPE=mysql
DB_HOST=数据库地址
DB_PORT=3306
DB_NAME=finder
DB_USER=数据库用户
DB_PASSWORD=数据库密码
JWT_SECRET=你的 JWT 密钥
WX_APPID=微信小程序 AppID
WX_SECRET=微信小程序 Secret
```

运行容器：

```bash
docker run --rm -p 80:80 --env-file runtime-config.env finder:latest
```

验证访问：

```text
http://localhost/
http://localhost/api/v1/...
```

## 推送到腾讯云镜像仓库

镜像仓库地址：

```text
ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder
```

如未登录，先执行：

```bash
docker login ccr.ccs.tencentyun.com
```

推送 `latest`：

```bash
docker tag finder:latest ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder:latest
docker push ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder:latest
```

推荐同时推送版本号和 `latest`，例如 `v1.0.0`：

```bash
docker build -t finder:v1.0.0 .

docker tag finder:v1.0.0 ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder:v1.0.0
docker tag finder:v1.0.0 ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder:latest

docker push ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder:v1.0.0
docker push ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder:latest
```

## 部署到云托管

云托管服务使用镜像：

```text
ccr.ccs.tencentyun.com/tcb-100050018575-frae/ca-geoykgps_finder:latest
```

服务端口配置为：

```text
80
```

当前 Dockerfile 已设置：

```text
ENV PORT=80
EXPOSE 80
```

平台端口也应配置为 `80`。

## 常见问题

### `Unsupported URL Type "link:"`

这个错误通常来自 `package.json` 中的无效依赖，例如：

```json
"fengxiangbiao-api": "link:"
```

该依赖是项目自引用，不应该出现在 `dependencies` 中。当前已删除，并同步更新了 `backend/package-lock.json`。

### 前端页面访问 404

确认打镜像前已经生成：

```text
admin-frontend/dist/index.html
```

Dockerfile 会把 `admin-frontend/dist` 复制到容器内：

```text
/usr/src/app/admin
```

NestJS 启动后会托管该目录。

### API 能访问但上传图片打不开

确认运行环境变量中的上传目录和容器内目录一致。当前 Dockerfile 会创建：

```text
/usr/src/app/uploads
```

如果使用持久化存储，建议把宿主机目录或云托管存储挂载到该目录。
