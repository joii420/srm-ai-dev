// Node.js: linkedom is ESM-only. We use Function() to prevent ts-node
// from transpiling the dynamic import() into require().
const dynamicImport = new Function("specifier", "return import(specifier)");

// 预加载 Promise：在 worker 入口 import 本模块时就开始加载 linkedom，
// 不用等 SETUP 消息到达，节省冷启动时间。
let linkedomPromise: Promise<any> | null = null;

/** 提前触发 linkedom 加载（在 worker 启动时调用） */
export function preloadLinkedom() {
  if (!linkedomPromise) {
    linkedomPromise = dynamicImport("linkedom/worker");
  }
  return linkedomPromise;
}

// 模块加载时立即开始预加载
preloadLinkedom();

export default async function () {
  const documentMock = await preloadLinkedom();

  for (const [key, value] of Object.entries(documentMock)) {
    //@ts-expect-error no types
    self[key] = value;
  }
  const dom = documentMock.parseHTML(`<!DOCTYPE html><body></body>`);
  self.window = dom.window;
  self.document = dom.window.document;
  self.window = self;
}
