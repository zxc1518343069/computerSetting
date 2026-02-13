# 项目待办事项 (TODO List)

## 优先级：高 (High Priority)

- [ ] **全局异常处理优化**: 统一 UI 层的错误占位图与重试机制。
- [ ] **游戏榜单后台管理**: 在 `/admin/dashboard` 增加游戏数据的 CRUD 功能。

## 优先级：中 (Medium Priority)

- [ ] **认证系统数据库集成 (Auth Refactoring)**: 将 API 中的硬编码校验改为查询 `users` 数据库表。
- [ ] **JWT 认证支持 (Auth Refactoring)**: 实现基于 JWT 的身份验证，并在 Axios 拦截器中处理 Token。
- [ ] **性能实验室数据关联**: 将游戏榜单与硬件跑分数据正式关联。
- [ ] **图片资源优化**: 针对游戏图标引入 Next.js Image 组件进行优化。

## 优先级：低 (Low Priority)

- [ ] **多级权限控制 (Auth Refactoring)**: 增加不同权限等级的管理员管理功能。