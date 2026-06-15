FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY dist ./dist

# 创建上传目录
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]
