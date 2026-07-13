# Start Page

React 19 + Vite 8 的起始页，聊天使用 Vercel AI SDK 7、`@ai-sdk/react` 和 Streamdown。

要求 Node.js 22.12.0 或更高版本。

```bash
npm install
npm run dev
```

开发服务器默认监听 `http://localhost:7121`，Vite 同时挂载 `/api/chat`。

生产运行：

```bash
npm run build
npm start
```

`npm run build` 生成 `dist/`；它是可删除、可重新生成的生产构建产物，不应手动编辑。`npm start` 同时提供 `dist/` 静态文件和 `/api/chat`。

聊天结构：

- `src/chat/useChat.js`：`@ai-sdk/react` 状态、附件与操作。
- `src/server/chat-api.js`：AI SDK Provider、重试、超时、取消和 UI Message SSE。
- `src/chat/components/MarkdownMessage.jsx`：Streamdown 流式 Markdown。
- `src/chat/providers/provider-registry.js`：前后端共享的 Provider 设置元数据。

API Key 只随同源聊天请求发送，不由服务端持久化。DeepSeek 和 OpenAI Chat Completions 不提供 SDK 管理的网页搜索；需要 OpenAI 搜索时请选择 Responses。

可用脚本：

```bash
npm test
npm run check
```

可通过 `HOST` 和 `PORT` 调整生产服务器监听地址。
