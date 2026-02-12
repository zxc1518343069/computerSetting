# PC 游戏风云榜黑夜模式适配与 UI 重构方案 (Cyber-Refined)

## 1. 设计愿景 (Design Vision)

将现有的“PC 游戏风云榜”从传统的浅色卡片布局重塑为具有**赛博精炼 (Cyber-Refined)** 风格的沉浸式界面。

- **核心风格**：深邃、通透、数据感、霓虹点缀。
- **视觉关键词**：玻璃拟态 (Glassmorphism)、霓虹边框 (Neon Borders)、动态光影 (Dynamic Lighting)、硬核排版 (Hardcore
  Typography)。

---

## 2. 核心设计规范 (Design Specs)

### 2.1 色彩体系 (Color Palette)

| 元素         | 浅色模式 (现有)             | 黑夜模式 (重构)                              |
|:-----------|:----------------------|:---------------------------------------|
| **背景**     | `bg-[#f8fafc]`        | `bg-slate-950` (深邃黑)                   |
| **卡片背景**   | `bg-white`            | `bg-slate-900/40` + `backdrop-blur-xl` |
| **边框**     | `border-slate-100`    | `border-white/10` (带 hover 霓虹发光)       |
| **文字 (主)** | `text-slate-900`      | `text-slate-50`                        |
| **文字 (次)** | `text-slate-500`      | `text-slate-400`                       |
| **装饰色**    | Blue-600 / Purple-600 | Indigo-500 / Cyan-400 (高饱和度)           |

### 2.2 字体与排版 (Typography)

- **标题**：使用 `font-black` 配合 `tracking-tighter`，增强视觉冲击力。
- **排名数字**：强制使用 `font-mono`，模拟电子显示屏效果。
- **标签**：减小字号，增加字间距，使用全大写或加粗，提升专业感。

### 2.3 动效设计 (Motion)

- **入场动画**：卡片采用交错淡入 + 向上滑动的效果 (`staggered reveal`)。
- **悬停反馈**：
    - 卡片轻微放大 (`scale-105`)。
    - 边框颜色变为霓虹色 (`indigo-500`) 并产生外发光 (`shadow-[0_0_20px_rgba(99,102,241,0.3)]`)。
    - 图片缩放效果保持并增强。

---

## 3. 模块重构细节 (Module Redesign)

### 3.1 Hero Section (顶部区域)

- **背景增强**：引入动态的 Mesh Gradient (网格渐变)，在深色背景下缓慢流动。
- **搜索框**：改为全透明玻璃质感，聚焦时边框产生青色 (Cyan) 呼吸灯效果。
- **标题**：文字渐变色调整为更亮的 `from-cyan-400 to-blue-500`。

### 3.2 Game Card (游戏卡片)

- **排名角标**：
    - 前三名：保留金属质感，但增加内发光效果。
    - 其他：改为半透明黑色背景 + 细边框，数字使用亮白色。
- **图片处理**：由于图标带有背景且不可更换，我们将通过 `dark:opacity-80` 和更深邃的渐变遮罩 (
  `bg-gradient-to-t from-slate-950 via-transparent`) 来增强其与深色卡片的融合感，避免背景色块过于突兀。
- **内容区**：
    - 标题：在黑夜模式下使用更柔和的白色，避免刺眼。
    - 底部装饰点：改为具有“呼吸感”的霓虹点。

### 3.3 Tabs (选项卡)

- **样式定制**：适配 `globals.css` 中的 `custom-tabs-modern`，在黑夜模式下调整激活态的阴影和文字颜色。

---

## 4. 实施步骤 (Implementation Steps)

### Step 1: 基础环境适配

- 引入 `useTheme` hook 获取当前主题状态。
- 将 `Layout` 的背景色改为主题感知类：`bg-[#f8fafc] dark:bg-slate-950` Lark:bg-slate-950`。

### Step 2: Hero Section 重构

- 修改背景装饰层，增加 `dark:opacity-40` 的深色渐变。
- 调整 `Input` 组件的类名，支持 `dark:bg-white/5 dark:border-white/10`。

### Step 3: Game Card 组件化与重构

- 提取 `renderGameList` 中的卡片为独立组件 `GameCard`。
- 应用玻璃拟态样式：`dark:bg-slate-900/40 dark:backdrop-blur-xl dark:border-white/10`。
- 优化 `RankBadge` 的深色模式表现。

### Step 4: 细节打磨与原生动画

- 仅使用 Tailwind CSS 的 `transition`、`duration` 和 `group-hover` 实现平滑的交互动效，不引入额外库。
- 检查 Ant Design 组件在黑夜模式下的默认表现，必要时通过 `ConfigProvider` 或 CSS 覆盖。

---

## 5. 待确认事项 (已更新)

1. **视觉融合**：针对带背景的图标，将采用遮罩和透明度处理，确保在深色模式下不显突兀。
2. **性能考虑**：大量的 `backdrop-blur` 在低端设备上可能有性能影响，将保持代码简洁以优化渲染。
3. **技术栈**：确认仅使用 Tailwind CSS + Ant Design，不引入 `framer-motion` 等第三方库。

---
*方案更新时间：2026-02-12*
