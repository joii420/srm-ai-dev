// Node.js: linkedom is ESM-only. We use Function() to prevent ts-node
// from transpiling the dynamic import() into require().
const dynamicImport = new Function("specifier", "return import(specifier)");

export default async function () {
  //@ts-expect-error no types.
  const documentMock = await dynamicImport("linkedom/worker");

  for (const [key, value] of Object.entries(documentMock)) {
    //@ts-expect-error no types
    self[key] = value;
  }
  const dom = documentMock.parseHTML(`<!DOCTYPE html><body></body>`);
  self.window = dom.window;
  self.document = dom.window.document;
  self.window = self;
}
