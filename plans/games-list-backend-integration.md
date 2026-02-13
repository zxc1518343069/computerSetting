# PC 游戏风云榜后端接入方案 (Phase 1: Mock API)

## 1. 目标 (Objectives)

- 实现 `gamesList` 页面从静态数据向后端 API 驱动的转型。
- 保持数据暂不入库，通过 API Route 模拟数据返回。
- 建立标准的服务层和 Hook 层架构，为后续数据库接入打好基础。

---

## 2. 架构设计 (Architecture)

### 2.1 API 设计 (Backend)

- **Endpoint**: `GET /api/games`
- **Response 格式**: 遵循 `lib/request/apiResponse.ts` 规范。
  ```json
  {
    "code": 200,
    "message": "成功",
    "data": {
      "online": [...],
      "single": [...]
    }
  }
  ```

### 2.2 服务层 (Service Layer)

- **文件**: `app/services/games.ts`
- **工具**: 使用封装好的 `@/lib/request/axios`。
- **职责**: 定义 `getGames` 函数，获取所有游戏数据。

### 2.3 逻辑层 (Hooks Layer)

- **文件**: `app/gamesList/hooks/useGames.ts`
- **职责**:
    - 调用 `getGames` 服务。
    - 管理 `loading` 状态。
    - **搜索逻辑**: 保留在前端处理，通过 `useMemo` 或简单的 `filter` 实现，以保证响应速度。

---

## 3. 实施步骤 (Implementation Steps)

### Step 1: 统一类型定义

在 `@/const/types.ts` 中定义 `Game` 接口。这是全栈通用的唯一事实来源：

```typescript
export interface Game {
    id: string | number;
    name: string;
    icon: string;
    type: 'online' | 'single'; // 增加类型标识，方便前端逻辑处理
}
```

### Step 2: 创建 API Route

新建 `app/api/games/route.ts`：

- 引用 `@/const/types.ts` 中的 `Game` 类型。
- 整合 `INITIAL_ONLINE_GAMES` 和 `INITIAL_SINGLE_GAMES` 并注入 `type` 字段。
- 使用 `success<{ online: Game[], single: Game[] }>(...)` 返回数据。

### Step 3: 封装 Service

新建 `app/services/games.ts`：

- 使用 `api.get('/games')` 获取数据。
- 在 `app/services/index.ts` 中导出。

### Step 4: 编写 Hook

新建 `app/gamesList/hooks/useGames.ts`：

- 使用 `ahooks` 的 `useRequest` 封装异步请求。
- **缓存策略**: 开启 `cacheKey: 'pc-games-list'`，实现内存缓存，避免 Tab 切换重复请求。
- 暴露 `onlineGames`、`singleGames` 和 `loading` 状态。

### Step 5: 页面集成与骨架屏

修改 `app/gamesList/page.tsx`：

- 引入骨架屏组件（基于 `antd` 的 `Skeleton` 或自定义 Tailwind 动画）。
- 当 `loading` 为 `true` 且无缓存数据时，展示 10-20 个游戏卡片占位符。
- 保持现有的前端搜索过滤逻辑。

---

## 4. 决策记录 (Decisions)

1. **搜索逻辑**: 保留在前端处理。
2. **骨架屏**: 必须实现，以维持 CSR 模式下的精致感。
3. **缓存**: 开启内存缓存，提升 Tab 切换体验。
4. **扩展性**: Service 层预留 CRUD 接口定义，API 路由设计考虑未来支持 `POST/PATCH/DELETE`。

---
*方案更新时间：2026-02-13*
