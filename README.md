# 电脑配件报价系统 - PC Parts Pricing System

## 🚀 项目概述

这是一个基于 Next.js 和 Tailwind CSS 构建的电脑配件报价系统，提供以下核心功能：

- **可视化报价表格**：清晰展示各类电脑配件及价格
- **动态计算**：实时计算配件组合总价
- **Excel 数据交换**：支持全量模板下载、备份导出和备份恢复
- **本地数据库**：支持 SQLite 本地部署，适合 NAS/Docker 私有化运行
- **响应式设计**：适配各种设备屏幕

## 🖥️ 在线演示

项目已部署在 Vercel:  
👉 [点击访问在线演示](https://computer-setting.vercel.app/)

## ✨ 功能特性

### 📊 核心功能

- 8 大类电脑配件选择（CPU、主板、内存等）
- 每类配件提供多个产品选项
- 数量调整与实时价格计算
- 自动总价汇总

### 📁 数据管理

- **Excel 模板下载**：一键获取完整业务表结构
- **数据导出**：导出产品、库存、入库单、订单、财务等全量备份
- **数据恢复**：通过 Excel 备份恢复整库数据
- **表单重置**：快速清空当前选择

### 🎨 UI 特点

- 现代化简洁界面
- 固定表格布局，避免内容跳动
- 交互式悬停效果
- 移动端友好设计

## 🛠️ 技术栈

- **框架**: [Next.js](https://nextjs.org/) (React)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **表格处理**: [SheetJS (xlsx)](https://sheetjs.com/)
- **文件下载**: [FileSaver.js](https://github.com/eligrey/FileSaver.js/)
- **本地数据库**: SQLite + better-sqlite3
- **部署**: [Vercel](https://vercel.com/)

## 📦 安装与运行

### 前置要求

- Node.js (推荐 v20+)
- npm 或 yarn

### 本地开发

1. 克隆仓库
    ```bash
    git clone https://github.com/your-username/your-repo.git
    ```
2. 安装依赖
    ```bash
    cd your-repo
    npm install
    # 或
    yarn install
    ```
3. 启动开发服务器
    ```bash
    npm run dev
    # 或
    yarn dev
    ```
4. 访问 `http://localhost:3000`

### 生产构建

```bash
npm run build
npm start
```

### Docker / NAS 部署

项目已提供 `Dockerfile` 和 `docker-compose.yml`。默认会把 SQLite 数据库持久化到 Docker volume 的
`/app/data/computer.db`。

```bash
docker compose up -d --build
```

启动后访问 `http://localhost:3000`。如果部署在 NAS 上，把 `3000:3000` 改成你希望暴露的端口即可。

如需把数据库文件挂载到 NAS 指定目录，可把 compose 的 volume 改成类似：

```yaml
volumes:
    - /your/nas/path/computer-data:/app/data
```

## 📝 使用说明

1. **基本使用**：
    - 从下拉菜单中选择各类配件
    - 调整数量查看价格变化
    - 系统自动计算总价

2. **数据交换**：
    - 点击"下载模板"获取完整业务表结构
    - 点击"导出数据"生成整库备份
    - 点击"上传数据"恢复备份，恢复会覆盖当前数据库

3. **重置功能**：
    - 点击"重置表单"清空当前选择

## 🧩 项目结构

```
├─app
├── _components/
│   └── PCPartsTable.tsx    # 核心报价表格组件
├── pages                   # 主页面
├── styles/                 # 全局样式
├── package.json
└── README.md
```

## 🤝 贡献指南

欢迎提交 Issue 或 PR！  
请确保遵循现有代码风格，并为新功能添加相应测试。

## 📄 许可证

MIT License

---

**Happy Building!** 🖥️💻
