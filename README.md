# Start Page

一个使用 React 和 Vite 构建的个人浏览器起始页，集成动态天气场景、系统状态、网络检测、搜索和多模型 AI 助手。

## 功能

- 实时时钟与日期
- 心知天气数据及昼夜、云层、雨雪等动态场景
- CPU、内存与网络连通状态展示
- 根据网络状态自动选择 Google 或 Bing 搜索
- 支持 Gemini、OpenAI、DeepSeek、Anthropic 和火山引擎 Ark 的 AI 助手
- 支持推理参数、系统提示词及部分服务商的网络搜索
- 响应式毛玻璃界面

## 运行环境

- Node.js `>= 22.12.0`
- npm
- Windows + WSL

> 系统状态和网络检测通过 WSL 调用 Windows PowerShell，因此当前实现依赖 `/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe`。

## 安装

```bash
git clone git@github.com:Guquan-2002/Start-Page.git
cd Start-Page
npm install
```

在项目根目录创建 `.env`：

```env
WEATHER_API_KEY=你的心知天气 API Key
WEATHER_LOCATION=你的城市
HOST=0.0.0.0
PORT=7121
```

其中 `WEATHER_API_KEY` 用于请求[心知天气](https://www.seniverse.com/)；`HOST` 和 `PORT` 可选，默认分别为 `0.0.0.0` 和 `7121`。

## 开发

```bash
npm run dev
```

访问：<http://localhost:7121>

## 生产运行

```bash
npm run build
npm start
```

生产服务器会提供构建后的静态文件以及仪表盘、AI 助手所需的 API。

## AI 助手配置

在页面的助手设置中选择服务商，并填写 API 地址、API Key 和模型名称。配置保存在当前浏览器的 `localStorage` 中，不会写入仓库。

支持的服务商：

- Gemini
- OpenAI Chat Completions
- OpenAI Responses
- DeepSeek
- 火山引擎 Ark Responses
- Anthropic

## 项目结构

```text
src/
├── assistant/               # AI 助手界面、状态与服务端适配
├── dashboard/
│   ├── application/         # 页面状态和视图逻辑
│   ├── infrastructure/      # API、轮询与动画基础设施
│   ├── page/                # 仪表盘入口
│   └── ui/                  # 面板和天气场景组件
├── server/dashboard/        # 天气、网络和系统状态 API
├── shared/                  # 图标与 AI 服务商定义
└── styles/                  # 全局样式和设计变量
```

## 可用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm start` | 启动生产服务器 |
