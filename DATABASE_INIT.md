# 数据库初始化指南

## 支持的数据库

本项目同时支持 PostgreSQL 和 MySQL，通过环境变量 `DB_TYPE` 切换：

| 数据库 | DB_TYPE | 默认端口 |
|---|---|---|
| PostgreSQL | `postgres`（默认） | 5432 |
| MySQL | `mysql` | 3306 |

## MySQL 初始化（云托管推荐）

### 步骤 1：创建数据库

登录云托管 MySQL 管理工具，执行：

```sql
CREATE DATABASE fengxiangbiao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 步骤 2：执行建表脚本

在 `backend/schema.sql` 中找到建表语句，在数据库中执行。

或命令行执行：

```powershell
mysql -h 你的主机 -u root -p fengxiangbiao < backend/schema.sql
```

### 步骤 3：配置环境变量

```json
{
  "NODE_ENV": "production",
  "DB_TYPE": "mysql",
  "DB_HOST": "你的云托管MySQL内网地址",
  "DB_PORT": "3306",
  "DB_NAME": "fengxiangbiao",
  "DB_USER": "root",
  "DB_PASSWORD": "你的密码",
  "JWT_SECRET": "随机字符串",
  "WX_APPID": "小程序AppID",
  "WX_SECRET": "小程序Secret"
}
```

微信云托管多实例共享同一份环境变量时，不要配置 `SNOWFLAKE_WORKER_ID`，服务会从 `INSTANCE_ID` / `HOSTNAME` 自动派生。

### 步骤 4：部署服务

数据库已就绪，直接部署即可启动。

---

## 本地 PostgreSQL 初始化（开发环境）

### 步骤 1：启动数据库

```powershell
docker run -d -p 5432:5432 -e POSTGRES_DB=fengxiangbiao -e POSTGRES_USER=app -e POSTGRES_PASSWORD=yourpassword postgres:15
```

### 步骤 2：执行建表脚本

```powershell
psql -h localhost -U app -d fengxiangbiao -f backend/schema.sql
```

注意：PostgreSQL 版本需要调整 `JSON` 类型为 `jsonb`，以及 `TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE` 语法。

### 步骤 3：配置环境变量

```json
{
  "NODE_ENV": "development",
  "DB_TYPE": "postgres",
  "DB_HOST": "localhost",
  "DB_PORT": "5432",
  "DB_NAME": "fengxiangbiao",
  "DB_USER": "app",
  "DB_PASSWORD": "yourpassword"
}
```

---

## 常见问题

### Q: 云托管 MySQL 连接失败？
A: 确保使用**内网地址**，云托管服务访问云托管数据库走内网。

### Q: 表已创建但启动报错？
A: 检查 `DB_NAME` 是否正确，以及数据库用户是否有读写权限。

### Q: 如何重置数据库？
A: 执行 `DROP TABLE IF EXISTS ...` 后重新执行 `schema.sql`。
