/**
 * 数据库直连工具 - 方便测试时直接执行 SQL
 *
 * 用法:
 *   node db-tool.mjs                          进入交互模式
 *   node db-tool.mjs "SELECT * FROM users"    直接执行单条 SQL
 *   node db-tool.mjs -f query.sql             执行 SQL 文件
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

// ==================== 数据库配置 ====================
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'fengxiangbiao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
};

// ==================== 辅助函数 ====================

/** 格式化输出结果为表格 */
function formatTable(rows, fields) {
  if (!rows || rows.length === 0) {
    console.log('(0 rows)\n');
    return;
  }

  // 计算每列最大宽度
  const columns = fields.map((f) => f.name);
  const widths = columns.map((col, i) => {
    const maxDataLen = rows.reduce((max, row) => {
      const val = row[col];
      return Math.max(max, val === null ? 4 : String(val).length);
    }, 0);
    return Math.max(col.length, maxDataLen);
  });

  // 分隔线
  const separator = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';

  // 表头
  const header =
    '|' + columns.map((col, i) => ' ' + col.padEnd(widths[i] + 1)).join('|') + '|';

  // 数据行
  const dataLines = rows.map((row) =>
    '|' +
    columns
      .map((col, i) => {
        const val = row[col];
        const display = val === null ? 'NULL' : String(val);
        return ' ' + display.padEnd(widths[i] + 1);
      })
      .join('|') +
    '|',
  );

  console.log(separator);
  console.log(header);
  console.log(separator);
  dataLines.forEach((line) => console.log(line));
  console.log(separator);
  console.log(`(${rows.length} rows)\n`);
}

/** 执行单条 SQL */
async function executeSQL(client, sql) {
  const startTime = Date.now();
  try {
    const result = await client.query(sql);
    const elapsed = Date.now() - startTime;

    if (result.rows.length > 0) {
      formatTable(result.rows, result.fields);
    } else {
      console.log(
        `OK (${result.command}, ${result.rowCount ?? 0} affected, ${elapsed}ms)\n`,
      );
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}\n`);
  }
}

/** 执行 SQL 文件 */
async function executeFile(client, filePath) {
  const fullPath = resolve(filePath);
  console.log(`正在执行文件: ${fullPath}\n`);
  const sql = readFileSync(fullPath, 'utf-8');

  // 按分号拆分，过滤空语句
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    console.log(`> ${stmt.substring(0, 100)}${stmt.length > 100 ? '...' : ''}`);
    await executeSQL(client, stmt);
  }
}

/** 交互式 REPL */
async function interactive(client) {
  console.log(`\n已连接到 ${config.host}:${config.port}/${config.database}`);
  console.log('输入 SQL 语句并回车执行，输入 \\\\q 退出，\\\\t 查看表列表，\\\\d <表名> 查看表结构\n');

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'db> ',
  });

  let buffer = '';

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();

    // 内置命令
    if (trimmed === '\\q') {
      console.log('再见！');
      rl.close();
      await client.end();
      process.exit(0);
      return;
    }

    if (trimmed === '\\t') {
      const res = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      );
      console.log('\n数据库表列表:');
      res.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.table_name}`));
      console.log();
      rl.prompt();
      return;
    }

    if (trimmed.startsWith('\\d ')) {
      const tableName = trimmed.slice(3).trim();
      const res = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName],
      );
      if (res.rows.length === 0) {
        console.log(`表 "${tableName}" 不存在\n`);
      } else {
        console.log(`\n表 "${tableName}" 结构:`);
        console.log(
          '  '.padEnd(2) +
            'column'.padEnd(30) +
            'type'.padEnd(20) +
            'nullable'.padEnd(10) +
            'default',
        );
        console.log('-'.repeat(80));
        res.rows.forEach((col) => {
          console.log(
            '  '.padEnd(2) +
              col.column_name.padEnd(30) +
              col.data_type.padEnd(20) +
              col.is_nullable.padEnd(10) +
              (col.column_default ?? ''),
          );
        });
        console.log();
      }
      rl.prompt();
      return;
    }

    if (trimmed === '\\d') {
      console.log('用法: \\d <表名>  查看表结构');
      rl.prompt();
      return;
    }

    // SQL 输入（支持多行，以分号结尾）
    buffer += (buffer ? '\n' : '') + line;

    if (buffer.endsWith(';')) {
      const sql = buffer.slice(0, -1).trim();
      buffer = '';
      await executeSQL(client, sql);
      rl.prompt();
    } else {
      // 继续等待多行输入
      rl.prompt();
    }
  });

  rl.on('close', async () => {
    await client.end();
    process.exit(0);
  });
}

// ==================== 主入口 ====================
async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  if (args.includes('-f') || args.includes('--file')) {
    const fileIdx = args.indexOf('-f') !== -1 ? args.indexOf('-f') : args.indexOf('--file');
    const filePath = args[fileIdx + 1];
    if (!filePath) {
      console.error('请指定 SQL 文件路径: node db-tool.mjs -f <file.sql>');
      process.exit(1);
    }
    const client = new Client(config);
    await client.connect();
    await executeFile(client, filePath);
    await client.end();
    return;
  }

  if (args.length > 0 && !args[0].startsWith('-')) {
    // 直接执行 SQL
    const sql = args.join(' ');
    const client = new Client(config);
    await client.connect();
    await executeSQL(client, sql);
    await client.end();
    return;
  }

  // 交互模式
  const client = new Client(config);
  await client.connect();
  await interactive(client);
}

main().catch((err) => {
  console.error('连接数据库失败:', err.message);
  process.exit(1);
});
