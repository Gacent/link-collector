# 飞书 Base 书签存储方案设计

## 1. 概述

将 bookmark 聚合器的存储后端从 Cloudflare D1 替换为飞书多维表格 (Base)，实现"一份数据，笔记软件即存储"的目标。前端 PWA 和 SenseNova AI 保留，D1 相关代码全部移除。

## 2. 架构

```
用户 ──PWA 前端──→ Cloudflare Worker (代理层)
                        ├── Googlebot UA 抓取 OG 标签 (fetch-meta.ts)
                        ├── SenseNova AI 提取标题/标签/摘要 (sensenova.ts)
                        └── 飞书 Base API 写入/查询 (feishu.ts 新增)
                              │
                              └── 飞书多维表格 (7 个字段)
```

**Worker 代理层职责**：
- 持有飞书 app_id / app_secret 等凭据（环境变量，不暴露给前端）
- 接收前端请求，调用飞书 API 完成 CRUD
- 调用 SenseNova 进行 AI 提取

**前端 PWA 变化**：
- API 调用路径微调，逻辑基本不变
- 设置页移除 D1 相关配置，改为飞书连接状态显示（可选）
- 搜索功能依赖字段过滤，调整体验

## 3. 数据结构

### 飞书 Base 字段设计

| 字段名 | 字段类型 | 是否必填 | 说明 |
|--------|---------|---------|------|
| AI标题 | 文本 | 是 | SenseNova 从原文提炼的工具名/核心概念 |
| 原文标题 | 文本 | 否 | OG meta 原文标题 |
| URL | 超链接 | 是 | 用户粘贴的 URL |
| 标签 | 多选 | 否 | SenseNova 提取或用户自定义 |
| AI摘要 | 文本 | 否 | SenseNova 生成的简短总结 |
| 保存时间 | 日期 | 是 | Worker 自动填入当前时间 |
| 来源 | 文本 | 否 | hostname (github.com / toutiao.com) |

### 与当前 D1 字段对比

| 当前 D1 字段 | 飞书 Base 字段 | 备注 |
|-------------|----------------|------|
| title | 原文标题 | 保留原文引用 |
| - | AI标题 | **新增**，AI 去营销化提炼 |
| url | URL | 相同 |
| description | AI摘要 | 重用，但内容生成逻辑微调 |
| content | - | 移除（不需要存原文全文） |
| source | 来源 | 相同 |
| tags | 标签 | 从 text 字段变为 multi_select |
| created_at | 保存时间 | 相同 |

## 4. 数据流

### 4.1 保存书签 (新增)

```
1. POST /api/bookmarks { url: "..." }
2. Worker fetch-meta (Googlebot UA) → OG title, description, content, image, source
3. Worker SenseNova 提取 → { aiTitle, tags, summary }
4. Worker 组装字段 → { AI标题, 原文标题, URL, 标签, AI摘要, 保存时间, 来源 }
5. POST 飞书 Base API → /bitable/v1/apps/{app_token}/tables/{table_id}/records
6. 返回成功 → 前端显示
```

### 4.2 搜索书签 (查询)

```
1. GET /api/bookmarks?q=xxx&tag=xxx
2. Worker 调用飞书 Base 列表接口
   → GET /bitable/v1/apps/{app_token}/tables/{table_id}/records
3. 筛选条件 (文本字段包含 q, 标签字段含 tag)
4. 返回结果 → 前端列表
```

### 4.3 删除书签

```
1. DELETE /api/bookmarks/:record_id
2. Worker 调用飞书 Base 删除接口
   → DELETE /bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}
```

### CORS 说明

飞书开放平台 API（`open.feishu.cn`）未配置浏览器 CORS 头，仅支持服务端调用。前端浏览器无法直接请求飞书 API，必须通过 Worker 代理中转。同时 `app_secret` 只能存在 Worker 环境变量中，不可暴露给前端。

## 5. AI Prompt 调整

现有 LINK_EXTRACT_PROMPT 中增加标题提炼指令：

```
你是一个资源分析助手。给定以下网页内容，请提取：
1. title: 这个资源真正是什么？去掉营销噱头，用 10 字以内概括核心内容
   (例如："React Server Components 官方文档" 而非 "震惊！React 19 终于发布了")
2. tags: 2-5 个标签（中文），归类用
3. summary: 80-150 字简明总结，说明这个资源讲了什么，解决了什么问题

返回 JSON 格式：{ "title": "...", "tags": [...], "summary": "..." }
```

## 6. API 端点设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/fetch-meta | 抓取链接 OG 标签 (不变) |
| POST | /api/ai-extract | AI 提取标题/标签/摘要 (返回增加 title 字段) |
| POST | /api/bookmarks | 保存书签到飞书 Base |
| GET | /api/bookmarks | 查询书签列表 (支持 q, tag 参数) |
| DELETE | /api/bookmarks/:id | 删除书签 |
| GET | /api/bookmarks/tags | 获取所有已使用标签列表 |

## 7. Worker 模块变更

| 文件 | 变更 |
|------|------|
| `worker/src/index.ts` | 替换 D1 路由为飞书路由，移除 D1 bindings |
| `worker/src/feishu.ts` | **新增** Base API 客户端 (getToken, createRecord, listRecords, deleteRecord) |
| `worker/src/sensenova.ts` | AI prompt 增加标题提炼指令 |
| `worker/src/handlers/fetch-meta.ts` | 不变 |
| `worker/wrangler.toml` | 移除 D1 binding，增加飞书环境变量 |
| 整个 `worker/db/` 目录 | **移除** |
| D1 schema 文件 | **移除** |

## 8. 环境变量

```toml
# wrangler.toml (dev)
FEISHU_APP_ID = "cli_xxxxxxxxxxxxx"
FEISHU_APP_SECRET = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
FEISHU_BASE_APP_TOKEN = "xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
FEISHU_BASE_TABLE_ID = "tblxxxxxxxxxxxxx"

# prod 用 wrangler secret put 设置（APP_PASSWORD 和 SENSENOVA_API_KEY 保持不变）
```

## 9. 限制与注意事项

### 速率限制
- 飞书 Base API: 50 QPS (创建记录), 10 QPS (查询)
- 个人使用每天几十条书签，远低于限制

### 搜索能力
- 飞书 Base 查询支持字段级文本过滤（contains），但不支持全文搜索
- 搜索体验比 D1 的 SQL LIKE 略弱，但标签多选筛选更好用
- 未来可考虑在 Worker 侧建轻量搜索索引

### 离线可用性
- 完全依赖飞书 API 可用性
- 飞书服务不可用期间，PWA 无法读写书签
- 可考虑前端缓存最近 N 条（见未来规划）

## 10. 用户需完成的准备工作

1. [飞书开放平台](https://open.feishu.cn/app) 创建自建应用，获取 App ID / App Secret
2. 应用权限管理添加 `bitable:app`，发布新版本
3. 飞书客户端创建多维表格，建好 7 个字段
4. Base 页面 `...` → `更多` → `添加文档应用` → 绑定你的应用 → 权限给「可编辑」
5. 从 Base URL 获取 app_token，从数据表 URL 获取 table_id
6. 将以上信息配置到 Worker 环境变量
