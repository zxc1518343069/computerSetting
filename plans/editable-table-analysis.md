# EditablePackageTable 实现分析报告

## 1. 当前实现分析

目前 `EditablePackageTable` 采用的是**原生 HTML `<table>` + Ant Design 原子组件**的自定义实现方式。

### 核心结构

- **组件化拆分**：将表格拆分为 `TableHeader` (
  app/admin/dashboard/packages/components/EditablePackageTable/components/TableHeader.tsx), `ProductRow` (
  app/admin/dashboard/packages/components/EditablePackageTable/components/ProductRow.tsx), `ExtraRows` (
  app/admin/dashboard/packages/components/EditablePackageTable/components/ExtraRows.tsx), `TableFooter` (
  app/admin/dashboard/packages/components/EditablePackageTable/components/TableFooter.tsx) 等子组件，逻辑清晰。
- **逻辑抽离**：通过 `usePackageTableData` (
  app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageTableData.ts) 处理数据获取，
  `usePackageCalculator` (app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageCalculator.ts)
  处理复杂的计算逻辑（成本、售价、利润率等）。
- **UI 定制化**：使用了大量的 Tailwind CSS 进行精细的 UI 控制（如：毛玻璃效果、渐变边框、特定类别的颜色标识等）。

### 业务特性

- **分组展示**：按硬件类别分组，且仅在组内第一行显示类别名称。
- **动态增删**：支持在特定类别（如内存、硬盘）下动态添加多行。
- **非标准行**：包含“附加项目”和“赠品项目”等不符合主数据结构的特殊行。
- **复杂页脚**：页脚不仅是汇总，还包含成本分析卡片、最终成交价输入等交互。

---

## 2. 与 Ant Design Table 对比

| 维度          | 自定义实现 (当前)                    | Ant Design Table                      |
|:------------|:------------------------------|:--------------------------------------|
| **开发灵活性**   | **极高**。完全控制 DOM 结构，方便实现非标准布局。 | **受限**。需遵循其 columns/dataSource 架构。    |
| **UI 定制能力** | **极强**。配合 Tailwind 可实现任何视觉效果。 | **一般**。深度定制（如复杂的 rowSpan、summary）较繁琐。 |
| **维护成本**    | **中等**。需手动处理表格的基础结构。          | **低 (标准场景)** / **高 (复杂场景)**。          |
| **功能丰富度**   | 需手动实现排序、过滤等（如果需要）。            | 自带排序、过滤、分页、固定头/列等。                    |
| **适用场景**    | 复杂的表单编辑、非标准布局、高度定制化 UI。       | 标准的数据列表展示、管理后台通用表格。                   |

---

## 3. 结论与建议

### 为什么目前不建议切换到 Ant Design Table？

1. **布局复杂性**：`EditablePackageTable` 本质上是一个**配置编辑器**而非简单的列表。它要求的“按类别分组且首行合并”、“动态增删行”、“特殊附加行”以及“卡片式页脚”，如果用
   `antd` Table 实现，需要大量使用 `rowSpan`、`summary` 和 `components` 覆盖，代码量可能反而更多，且可读性变差。
2. **视觉要求**：当前 UI 追求“精致感”（如 `ProductRow` 中的翡翠绿标签、利润率颜色阶梯等），`antd` Table 的默认样式较重，覆盖成本高。
3. **业务耦合度**：目前的实现将计算逻辑 (`usePackageCalculator`) 与渲染层分离得很好。切换到 `antd` Table
   主要是改变渲染层，对核心业务逻辑提升不大。

### 什么时候应该用 Ant Design Table？

项目中已有的 `ProductTable` (app/admin/dashboard/config/_components/ProductTable.tsx) 就是 `antd` Table 的完美应用场景：

- 标准的行数据结构。
- 需要分页、排序、过滤功能。
- 统一的后台管理风格。

### 改进建议 (如果继续使用当前方案)

- **性能优化**：如果配件列表变得非常长，可以考虑对 `ProductRow` 使用 `React.memo`。
- **抽象通用组件**：如果后台还有其他类似的“配置编辑器”，可以将这种“分组编辑表格”的基础结构抽象为通用组件。

**最终建议：保留当前自定义实现，它更符合“装机配置单”这一特定业务场景的灵活性需求。**
