# Start Page

一个现代化的浏览器起始页，集成动态主题、天气、智能搜索和多模型 AI 聊天功能。

![1771341575244](image/README/1771341575244.png)

# ✨ 核心特性

### 🎨 动态主题

- 时间驱动的背景切换（晨间/白天/傍晚/夜间）
- 星空背景特效
- 实时时钟与日期显示

### 🌤️ 智能组件

- 实时天气信息（支持 API Key 或代理模式）
- 网络状态检测与搜索引擎自动切换（Google/Bing/离线）

### 💬 AI 聊天

- **多模型支持**：Gemini / OpenAI / Anthropic / 字节火山
- **多模态输入**：文本 + 图片混合输入
- **会话管理**：新建/切换/重命名/删除/清空
- **智能上下文**：自动控制消息数与 Token 预算
- **高级功能**：
  - 对话式伪流式输出
  - 草稿自动保存
  - 失败消息一键回填
  - 支持Web Search

## 🚀 快速开始

### 直接使用

在浏览器中打开 `index.html` 即可。

独立聊天页入口：`pages/chat.html`（与首页聊天共享同一份本地会话与配置数据）。

### 本地服务

```bash
# Node.js
npm start
```

访问 `http://localhost:7121`

### 运行测试

```bash
npm test
```

## ⚙️ 配置

### 天气配置

三种方式任选其一：

1. **localStorage 配置**

```js
localStorage.setItem('startpage_config', JSON.stringify({
  weatherApiKey: 'YOUR_SENIVERSE_API_KEY'
}));
```

2. **全局变量注入**

```js
window.__STARTPAGE_CONFIG__ = {
  weatherApiKey: 'YOUR_KEY'
};
```

3. **代理模式**（推荐）

```js
localStorage.setItem('startpage_config', JSON.stringify({
  weatherProxyUrl: 'https://your-proxy.com/weather'
}));
```

### AI 聊天配置

在聊天设置面板中配置：

| 配置项         | 说明                                             |
| -------------- | ------------------------------------------------ |
| Provider       | Gemini / OpenAI / Anthropic                      |
| API URL        | 默认官方端点，可自定义                           |
| API Key        | 主/备双 Key 支持                                 |
| Model          | 模型名称（如 `gemini-3-pro-preview`）          |
| System Prompt  | 系统提示词                                       |
| Thinking       | 思考预算（Gemini/Anthropic：整数；OpenAI：级别） |
| Web Search     | 网络搜索工具（各 Provider 格式不同）             |
| Experience     | 伪流式、草稿保存开关                             |
| Message Prefix | 时间戳、用户名前缀                               |

> 配置按 Provider 独立保存，切换时自动回填。

## 🏗️ 技术架构

### 技术栈

- 原生 HTML + CSS + JavaScript（ES Modules）
- 无构建工具，零依赖运行
- Marked + highlight.js（Markdown 渲染）
- localStorage 持久化

### AI模块分层

```
chat/
├── app/          # 编排层（配置、请求、流控制）
├── ui/           # 视图层（渲染、Markdown、交互）
├── session/      # 会话层（状态管理、历史操作）
├── core/         # 核心层（消息模型、上下文窗口、伪流式）
├── providers/    # 适配层（多模型统一接口）
└── storage/      # 持久化层（历史、草稿 schema）
```

## 📦 项目结构

```
home/
├── index.html
├── pages/
│   └── chat.html
├── css/
│   ├── variables.css
│   ├── base.css
│   ├── animations.css
│   ├── components.css
│   ├── chat.css
│   ├── chat-page.css
│   └── mobile.css
├── js/
│   ├── main.js
│   ├── chat-page.js
│   ├── config.js
│   ├── utils.js
│   ├── time.js
│   ├── theme.js
│   ├── weather.js
│   ├── network.js
│   ├── starfield.js
│   ├── mobile.js
│   ├── chat.js
│   ├── shared/
│   │   └── safe-storage.js
│   └── chat/
│       ├── constants.js
│       ├── app/
│       ├── ui/
│       ├── session/
│       ├── core/
│       ├── storage/
│       └── providers/
└── tests/
    └── chat/
```

## 🔧 高级配置

### 调试开关

```js
// 上下文窗口调试
window.__CHAT_CONTEXT_DEBUG__ = true;
localStorage.setItem('llm_chat_context_debug', '1');

// 自定义最大消息数
window.__CHAT_CONTEXT_MAX_MESSAGES__ = 80;
localStorage.setItem('llm_chat_context_max_messages', '80');
```

### 本地存储键

| 键名                    | 用途                  |
| ----------------------- | --------------------- |
| `llm_chat_config`     | 聊天配置              |
| `llm_chat_history_v2` | 会话历史（schema v3） |
| `llm_chat_drafts_v1`  | 草稿（按会话）        |
| `startpage_config`    | 运行时配置            |

## 🌐 浏览器兼容性

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari / Chrome Mobile / Firefox Mobile

要求：ES Modules + CSS Variables 支持

## 📄 许可证

MIT License © 2026 梏权
