# Plans Directory

这个目录用于沉淀项目讨论、待执行计划和已完成记录。

## 目录说明

```text
plans/
├── discussions/  # 讨论中，方案还没完全定稿
├── backlog/      # 方向已认可，但方案或优先级还没定
├── todo/         # 方案已定，等待开发或正在开发
├── done/         # 已完成，用于归档和回溯
└── README.md     # 本说明
```

## 流转规则

- `discussions/`：放还在讨论的问题、方案对比、业务边界梳理。
- `backlog/`：放方向已认可、后续可能要做，但方案、范围、优先级或依赖还没定清楚的内容。
- `todo/`：放方案已经明确、可以指导实现，等待开发或正在开发的内容。
- `done/`：放已经完成的计划或复盘，保留主要决策和落地结果。

建议流转路径：

```text
discussions -> backlog -> todo -> done
```

如果某个讨论已经直接定稿，也可以从 `discussions/` 直接进入 `todo/`。

## 命名建议

- 文件名使用小写英文和连字符，例如 `purchase-inbound-consolidation.md`。
- 讨论稿可以带 `-discussion` 后缀。
- 已进入候选池但方案未定时，可以带 `-backlog` 后缀。
- 已进入执行阶段后，可以带 `-plan` 后缀，内容应足够指导实现。

## 维护原则

- 不确定是否要做的内容先放 `discussions/`。
- 方向认可但方案未定的内容放 `backlog/`。
- 方案已定但未完成的内容放 `todo/`。
- 做完后从 `todo/` 移到 `done/`，并补充实际完成情况。
- 旧的根目录计划文件暂不批量迁移，迁移时应先确认它们属于 `discussions`、`backlog`、`todo` 还是 `done`。
