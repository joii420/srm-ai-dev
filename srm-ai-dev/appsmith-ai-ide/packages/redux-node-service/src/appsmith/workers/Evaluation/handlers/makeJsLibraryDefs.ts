import { parse } from "acorn";
import { simple } from "acorn-walk";

function getTernDocType(obj: any) {
  const type = typeof obj;
  switch (type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "bool";
    case "undefined":
      return "?";
    case "function":
      return "fn()";
    default:
      return "?";
  }
}

const ignoredKeys = [
  "constructor",
  "WINDOW",
  "window",
  "self",
  "arguments",
  "caller",
  "length",
  "name",
  "__esModule",
];

function getFunctionParamNames(func: any) {
  // 获取函数的源代码字符串
  let funcStr = func.toString();

  // 使用 acorn 解析函数字符串为 AST
  let ast;
  try {
    ast = parse(funcStr, { ecmaVersion: 2020 });
  } catch (error) {
    if (!/^(async)?\s*function/.test(funcStr)) {
      // 处理对象中函数toString后为 async a() {} 或者 a() {} 这种情况
      funcStr = funcStr.replace(/^(async\s+)?([^(]+)\(/, "$1function $2(");
      ast = parse(funcStr, { ecmaVersion: 2020 });
    } else if (funcStr.includes("[native code]")) {
      funcStr = funcStr.replace("[native code]", "");
      ast = parse(funcStr, { ecmaVersion: 2020 });
    } else {
      throw error;
    }
  }

  // 存储参数名的数组
  const info: any = {
    async: false,
    paramNames: [],
    docs: [],
  };

  // 定义一个 walker 函数来处理 FunctionDeclaration 或 FunctionExpression
  function walker(node: any) {
    if (
      node.start === 0 &&
      (node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression")
    ) {
      info.async = node.async;
      node.params.forEach((param: any) => {
        const _info = extractParamNamesFromPattern(param);
        info.paramNames = info.paramNames.concat(_info.paramNames);
        info.docs = info.docs.concat(_info.docs);
      });
    }
  }

  // 使用 acorn-walk 遍历 AST
  simple(ast, {
    FunctionDeclaration: walker,
    FunctionExpression: walker,
    ArrowFunctionExpression: walker,
  });

  return {
    async: info.async,
    type: `fn(${info.paramNames.join(", ")}) -> ${info.async ? " -> +Promise" : "any"}`,
    doc: `${info.async ? "async " : ""}fn(${info.docs.join(", ")})`,
  };
}

function extractParamNamesFromPattern(pattern: any) {
  if (pattern.type === "Identifier") {
    return {
      paramNames: [`${pattern.name}: unknown`],
      docs: [`${pattern.name}`],
    };
  } else if (pattern.type === "AssignmentPattern") {
    return {
      paramNames: [`${pattern.left.name}?: unknown`],
      docs: [`${pattern.left.name}=${pattern.right.raw}`],
    };
    // 处理默认参数
    // extractParamNamesFromPattern(pattern.left, paramNames);
  } else if (pattern.type === "RestElement") {
    return {
      paramNames: [`[${pattern.argument.name}]`],
      docs: [`...${pattern.argument.name}`],
    };
    // 处理解构赋值或剩余参数
    // extractParamNamesFromPattern(pattern.argument, paramNames);
  } else if (pattern.type === "ObjectPattern") {
    const info: any = {
      paramNames: [],
      docs: [],
    };
    // 处理解构赋值
    pattern.properties.forEach((prop: any) => {
      if (prop.type === "Property") {
        const _info = extractParamNamesFromPattern(prop.value);
        info.paramNames = info.paramNames.concat(_info.paramNames);
        info.docs = info.docs.concat(_info.docs);
      } else if (prop.type === "RestElement") {
        const _info = extractParamNamesFromPattern(prop);
        info.paramNames = info.paramNames.concat(_info.paramNames);
        info.docs = info.docs.concat(_info.docs);
      }
    });
    return {
      paramNames: ["object"],
      docs: [`{${info.docs.join(", ")}}`],
    };
  } else if (pattern.type === "ArrayPattern") {
    const info: any = {
      paramNames: [],
      docs: [],
    };
    // 处理解构赋值
    pattern.elements.forEach((element: any) => {
      if (element) {
        const _info = extractParamNamesFromPattern(element);
        info.paramNames = info.paramNames.concat(_info.paramNames);
        info.docs = info.docs.concat(_info.docs);
      }
    });
    return {
      paramNames: ["array"],
      docs: [`{${info.docs.join(", ")}}`],
    };
  }
  return {
    paramNames: [],
    docs: [],
  };
}

export default function makeJsLibraryDefs(obj: any) {
  const defs = {};
  const cachedDefs: any[] = [];
  const visitedReferences: any[] = [];
  const MAX_ITERATIONS = 5000;
  let iteration_count = 1;
  const baseObjPrototype = Object.getPrototypeOf({});

  const queue: any[] = [[obj, defs]];

  try {
    while (queue.length && iteration_count < MAX_ITERATIONS) {
      const [src, target] = queue.shift();
      if (visitedReferences.includes(src)) {
        target["!type"] = cachedDefs[visitedReferences.indexOf(src)]["!type"];
        continue;
      }
      const type = typeof src;
      if (!src || (type !== "object" && type !== "function")) {
        target["!type"] = getTernDocType(src);
        continue;
      } else if (type === "function") {
        const info = getFunctionParamNames(src);
        target["!type"] = info.type;
        target["!doc"] = info.doc;
        target["!async"] = info.async;
      }
      queue.push(
        ...Object.getOwnPropertyNames(src)
          .filter((key) => !ignoredKeys.includes(key))
          .map((key) => {
            target[key] = {};
            return [src[key], target[key]];
          }),
      );
      if (type === "object" && !Array.isArray(src)) {
        const prototype = Object.getPrototypeOf(src);
        if (prototype !== baseObjPrototype) {
          queue.push(
            ...Object.getOwnPropertyNames(prototype)
              .filter((key) => !ignoredKeys.includes(key))
              .map((key) => {
                target[key] = {};
                return [src[key], target[key]];
              }),
          );
        }
      }
      iteration_count++;
    }
  } catch (e) {
    console.error("Unknown depth", e);
  }
  return defs;
}
