# Claude API 调用配置与接口参数文档

## 一、配置位置

**文件：** `packages/container-services/src/ai-proxy/routes/chat.ts` (第 137-142 行)

```typescript
const stream = anthropic.messages.stream({
  model: process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-20250514",
  max_tokens: 4096,
  system: contextResult.systemPrompt,
  messages: [{ role: "user", content: message }],
});
```

## 二、环境变量配置

| 环境变量 | 必填 | 默认值 | 说明 |
|---------|------|--------|------|
| `ANTHROPIC_API_KEY` | 是 | 无 | Anthropic API 密钥，SDK 自动读取 |
| `ANTHROPIC_MODEL` | 否 | `claude-sonnet-4-20250514` | 使用的模型 ID |

环境变量在容器启动时注入，配置方式取决于部署环境：

- **开发环境：** 在 `packages/container-services/.env` 中设置
- **Docker 部署：** 通过 `docker run -e` 或 `docker-compose.yml` 的 `environment` 注入
- **生产环境：** 通过 Kubernetes Secret 或云平台环境变量管理

## 三、可用模型列表

| 模型 ID | 说明 |
|---------|------|
| `claude-sonnet-4-20250514` | Claude Sonnet 4 (当前默认，性价比推荐) |
| `claude-opus-4-20250514` | Claude Opus 4 (最强能力) |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 (最快速度，成本最低) |

切换模型只需修改环境变量 `ANTHROPIC_MODEL`，无需改动代码。

---

## 四、Claude Messages API 接口参数

本项目使用 `@anthropic-ai/sdk` 的 `messages.stream()` 方法，底层调用 `POST https://api.anthropic.com/v1/messages`。

### 4.1 当前使用的参数

| 参数 | 类型 | 当前值 | 说明 |
|------|------|--------|------|
| model | string | `process.env.ANTHROPIC_MODEL` | 模型 ID |
| max_tokens | integer | `4096` | 最大输出 token 数 |
| system | string | 动态拼装的上下文 | System Prompt (代码+依赖+技能) |
| messages | array | `[{role:"user", content}]` | 对话消息列表 |

### 4.2 完整可用参数

以下为 Claude Messages API 支持的全部参数，可按需扩展到代码中：

```typescript
anthropic.messages.stream({
  // ─── 必填参数 ───
  model: "claude-sonnet-4-20250514",   // 模型 ID
  max_tokens: 4096,                     // 最大输出 token 数 (模型上限见下表)
  messages: [                           // 对话历史
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好！" },
    { role: "user", content: "帮我写代码" },
  ],

  // ─── 可选参数 ───
  system: "你是一个编程助手",            // System Prompt (字符串或 content block 数组)
  temperature: 1.0,                     // 随机性 (0.0-1.0)，默认 1.0
  top_p: 0.9,                           // 核采样，与 temperature 二选一
  top_k: 40,                            // Top-K 采样
  stop_sequences: ["```"],              // 自定义停止序列
  stream: true,                         // 是否流式 (messages.stream() 自动设置)
  metadata: {                           // 请求元数据
    user_id: "user-123",               // 用于速率限制和滥用检测
  },
  tools: [...],                         // Tool Use (函数调用) 定义
  tool_choice: { type: "auto" },        // 工具选择策略
});
```

### 4.3 参数详细说明

#### model (必填)

指定使用的 Claude 模型。

```
claude-opus-4-20250514       # Opus 4 - 最强推理能力
claude-sonnet-4-20250514     # Sonnet 4 - 平衡性能与成本 (推荐)
claude-haiku-4-5-20251001    # Haiku 4.5 - 最快响应速度
```

#### max_tokens (必填)

模型单次响应的最大 token 数。

| 模型 | 最大输出 token |
|------|---------------|
| Claude Opus 4 | 32,000 |
| Claude Sonnet 4 | 16,000 |
| Claude Haiku 4.5 | 8,192 |

当前设置 `4096` 适用于大部分编码场景。如需生成更长的代码，可调高此值。

#### messages (必填)

对话消息数组，交替排列 `user` 和 `assistant` 角色。

```typescript
type Message = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};
```

> 当前实现只发送单条 user 消息，不保留对话历史。如需多轮对话，需要将历史消息累积发送。

#### system (可选)

System Prompt，用于设定 AI 行为和注入上下文。

当前由 `contextBuilder.ts` 动态拼装，包含三个部分：

| 部分 | 来源 | 内容 |
|------|------|------|
| Page Code | `/workspace` 目录 | 当前项目的全部代码文件 |
| Dependencies | `/deps/*.js` | 管理员配置的公共依赖库代码 |
| Active Skills | `/skills/skills.json` | 用户激活的技能 Prompt 文本 |

#### temperature (可选)

控制输出随机性，范围 `0.0` - `1.0`。

| 值 | 效果 |
|----|------|
| 0.0 | 确定性输出，适合代码生成 |
| 0.5 | 适度随机 |
| 1.0 | 最大随机性 (默认值) |

> 建议编码场景设为 `0.0` - `0.3` 以获得更稳定的代码输出。

#### stop_sequences (可选)

自定义停止序列，模型遇到这些字符串时停止生成。

```typescript
stop_sequences: ["\n\nHuman:", "```end"]
```

#### tools (可选)

Tool Use (函数调用) 功能，允许模型调用外部工具。

```typescript
tools: [
  {
    name: "read_file",
    description: "读取指定路径的文件内容",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" }
      },
      required: ["path"]
    }
  }
]
```

#### metadata (可选)

```typescript
metadata: {
  user_id: "user-uuid"  // 终端用户标识，用于 Anthropic 的滥用检测
}
```

---

## 五、流式响应格式

SDK `messages.stream()` 返回的事件类型：

| 事件类型 | 说明 |
|---------|------|
| `message_start` | 消息开始，包含 message 元信息 |
| `content_block_start` | 内容块开始 |
| `content_block_delta` | 内容增量 (文本片段) |
| `content_block_stop` | 内容块结束 |
| `message_delta` | 消息级别更新 (stop_reason, usage) |
| `message_stop` | 消息结束 |

当前代码通过 `stream.on("text", callback)` 简化监听，仅处理文本内容。

---

## 六、Token 用量与计费

每次请求的 token 用量可从 `stream.finalMessage()` 获取：

```typescript
const finalMessage = await stream.finalMessage();
console.log(finalMessage.usage);
// { input_tokens: 1500, output_tokens: 800 }
```

| 指标 | 说明 |
|------|------|
| input_tokens | 输入 token 数 (system + messages) |
| output_tokens | 输出 token 数 |

> 当前代码未记录 token 用量。如需监控成本，可在 `done` 事件中添加 usage 信息。

---

## 七、修改建议

如需调整 Claude API 参数，修改 `chat.ts` 第 137-142 行：

```typescript
// 示例：启用多轮对话 + 降低温度 + 增大输出
const stream = anthropic.messages.stream({
  model: process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-20250514",
  max_tokens: parseInt(process.env["ANTHROPIC_MAX_TOKENS"] ?? "8192"),
  temperature: parseFloat(process.env["ANTHROPIC_TEMPERATURE"] ?? "0.2"),
  system: contextResult.systemPrompt,
  messages: conversationHistory,  // 替换为累积的对话历史
  metadata: {
    user_id: session.id,
  },
});
```

可新增环境变量实现免代码配置：

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `ANTHROPIC_API_KEY` | 无 | API 密钥 |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | 模型 |
| `ANTHROPIC_MAX_TOKENS` | `4096` | 最大输出 token |
| `ANTHROPIC_TEMPERATURE` | `1.0` | 温度 |

---

*文档生成日期: 2026-03-26*
