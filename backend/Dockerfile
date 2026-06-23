FROM docker.m.daocloud.io/library/node:18-alpine AS builder

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM docker.m.daocloud.io/library/node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/static ./static

RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]