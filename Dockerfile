# 使用官方 Node.js 镜像作为基础镜像
FROM node:20

# 在容器内设置工作目录
WORKDIR /usr/src/app

ENV PORT=80

RUN npm config set registry https://registry.npmmirror.com

# 将后端 package.json 和 package-lock.json 复制到工作目录
COPY backend/package*.json ./

# 安装应用程序依赖项
RUN npm install

# 复制后端应用程序文件
COPY backend/ .

# 构建 NestJS 应用程序
RUN npm run build

# 复制管理后台前端产物，供 NestJS 托管
COPY admin-frontend/dist ./admin

# 复制随机头像资源
COPY assets/avatar ./assets/avatar

# 公开应用程序端口
EXPOSE 80

# 运行应用程序的命令
CMD ["node", "dist/main"]
