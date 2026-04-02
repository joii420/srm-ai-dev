// Empty module returned for all browser-only module stubs at runtime.
// Returns a callable Proxy that also works as an object with any property access.
// Properties accessed as object keys (via Symbol.toPrimitive) return unique strings.
// Properties accessed as values return the proxy itself (callable).
let counter = 0;

const handler: ProxyHandler<any> = {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    if (prop === 'default') return stub;
    // For string coercion (e.g., used as object key in reducer)
    if (prop === Symbol.toPrimitive) {
      const id = `__stub_${counter++}`;
      return () => id;
    }
    if (prop === 'toString' || prop === 'valueOf') {
      const id = `__stub_${counter++}`;
      return () => id;
    }
    // Return the proxy itself so chained access works and it's callable
    return stub;
  },
  apply: () => stub,
  construct: () => stub,
};

const stub: any = new Proxy(function(){}, handler);
module.exports = stub;
module.exports.default = stub;
