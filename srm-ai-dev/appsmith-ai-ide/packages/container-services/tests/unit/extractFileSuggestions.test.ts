import { describe, it, expect } from "vitest";

/**
 * Inline copy of extractFileSuggestions for unit testing.
 * Must stay in sync with src/ai-proxy/routes/chat.ts.
 */
function extractFileSuggestions(
  text: string
): Array<{ filePath: string; content: string }> {
  const suggestions: Array<{ filePath: string; content: string }> = [];

  // Primary: ```file:path\n...\n```
  const primaryRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = primaryRegex.exec(text)) !== null) {
    const filePath = match[1]!.trim();
    const content = match[2] ?? "";
    suggestions.push({ filePath, content });
  }

  // Fallback: ```javascript\n or ```js\n blocks where first line is // path/to/file.js
  if (suggestions.length === 0) {
    const fallbackRegex = /```(?:javascript|js)\n([\s\S]*?)```/g;
    while ((match = fallbackRegex.exec(text)) !== null) {
      const blockContent = match[1] ?? "";
      const firstLine = blockContent.split("\n")[0]?.trim() ?? "";
      const pathMatch = firstLine.match(/^\/\/\s*(jsObjects\/\S+\.js)/);
      if (pathMatch) {
        const filePath = pathMatch[1]!;
        const content = blockContent.split("\n").slice(1).join("\n");
        suggestions.push({ filePath, content });
      }
    }
  }

  return suggestions;
}

describe("extractFileSuggestions", () => {

  it("should extract primary format: ```file:path", () => {
    const text = `我来帮您修改：

\`\`\`file:jsObjects/JS341.js
export default {
	getTimestamp () {
		return Date.now();
	}
}
\`\`\`

已添加 getTimestamp 函数。`;

    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(1);
    expect(result[0]!.filePath).toBe("jsObjects/JS341.js");
    expect(result[0]!.content).toContain("getTimestamp");
    expect(result[0]!.content).toContain("Date.now()");
  });

  it("should extract multiple files", () => {
    const text = `修改两个文件：

\`\`\`file:jsObjects/Utils.js
export default {
	formatDate() { return ""; }
}
\`\`\`

\`\`\`file:jsObjects/Main.js
export default {
	init() { }
}
\`\`\`

完成。`;

    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(2);
    expect(result[0]!.filePath).toBe("jsObjects/Utils.js");
    expect(result[1]!.filePath).toBe("jsObjects/Main.js");
  });

  it("should handle fallback format: ```javascript with path comment", () => {
    const text = `这是修改后的代码：

\`\`\`javascript
// jsObjects/JS341.js
export default {
	getTimestamp () {
		return Date.now();
	}
}
\`\`\`

完成。`;

    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(1);
    expect(result[0]!.filePath).toBe("jsObjects/JS341.js");
    expect(result[0]!.content).toContain("getTimestamp");
    // Path comment should be removed from content
    expect(result[0]!.content).not.toContain("// jsObjects/");
  });

  it("should handle fallback format: ```js with path comment", () => {
    const text = `\`\`\`js
// jsObjects/MyFile.js
export default { foo() {} }
\`\`\``;

    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(1);
    expect(result[0]!.filePath).toBe("jsObjects/MyFile.js");
  });

  it("should NOT match ```javascript without path comment (no fallback)", () => {
    const text = `这是示例代码：

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`

请手动操作。`;

    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(0);
  });

  it("should prefer primary format over fallback", () => {
    const text = `\`\`\`file:jsObjects/A.js
export default { a: 1 }
\`\`\`

\`\`\`javascript
// jsObjects/B.js
export default { b: 2 }
\`\`\``;

    const result = extractFileSuggestions(text);
    // Primary found, fallback should NOT run
    expect(result).toHaveLength(1);
    expect(result[0]!.filePath).toBe("jsObjects/A.js");
  });

  it("should return empty for text without code blocks", () => {
    const text = "我无法修改文件，请手动操作。";
    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(0);
  });

  it("should handle file path with subdirectories", () => {
    const text = `\`\`\`file:jsObjects/utils/helper.js
export function help() {}
\`\`\``;

    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(1);
    expect(result[0]!.filePath).toBe("jsObjects/utils/helper.js");
  });

  it("should preserve content whitespace and newlines", () => {
    const text = `\`\`\`file:jsObjects/Test.js
export default {
\tmyVar1: [],
\tmyVar2: {},
\tmyFun1 () {
\t\t//\twrite code here
\t}
}
\`\`\``;

    const result = extractFileSuggestions(text);
    expect(result).toHaveLength(1);
    expect(result[0]!.content).toContain("\tmyVar1: []");
    expect(result[0]!.content).toContain("\tmyFun1 ()");
  });
});
