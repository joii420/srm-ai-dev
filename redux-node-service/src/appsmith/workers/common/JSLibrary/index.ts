import lodashPackageJson from "lodash/package.json";
import momentPackageJson from "moment-timezone/package.json";

export interface JSLibrary {
  version?: string;
  docsURL: string;
  name: string;
  accessor: string[];
  url?: string;
  id?: string;
  // 源码修改：记录脚本包下级属性信息
  lintGlobalData?: any;
}

// 修改：后台注入方法lint不报错
export const JavaInjectLibraries = [
  "utilFun",
  "_sql_executor",
  "_query_transaction",
  "_throw_to_erp",
  "_tran_for_upd",
  "_tran_end",
  "_get_global",
  "_db_insert",
  "_util",
  "_verify",
  "_rfa_send",
  "_file_util",
  "_test_function",
  "_tran_begin",
  "_message_send",
  "_log_file",
];

export const defaultLibraries: JSLibrary[] = [
  {
    accessor: ["_"],
    version: lodashPackageJson.version,
    docsURL: `https://lodash.com/docs/${lodashPackageJson.version}`,
    name: "lodash",
  },
  {
    accessor: ["moment"],
    version: momentPackageJson.version,
    docsURL: `https://momentjs.com/docs/`,
    name: "moment",
  },
  {
    accessor: ["forge"],
    version: "1.3.0",
    docsURL: "https://github.com/digitalbazaar/forge",
    name: "forge",
  },
  // {
  //   accessor: ["async"],
  //   docsURL: "https://caolan.github.io/async",
  //   name: "async",
  // },
  // {
  //   accessor: ["com"],
  //   version: "1.0.0",
  //   docsURL: "",
  //   name: "com",
  // },
];

export const JSLibraries = [...defaultLibraries];

const JSLibraryAccessorModifier = () => {
  let jsLibraryAccessorSet = new Set(
    JSLibraries.flatMap((lib) => lib.accessor),
  );

  return {
    regenerateSet: () => {
      jsLibraryAccessorSet = new Set(
        JSLibraries.flatMap((lib) => lib.accessor),
      );

      return;
    },
    getSet: () => {
      return jsLibraryAccessorSet;
    },
  };
};

export const JSLibraryAccessor = JSLibraryAccessorModifier();

export const libraryReservedIdentifiers = defaultLibraries.reduce(
  (acc, lib) => {
    lib.accessor.forEach((a) => (acc[a] = true));
    return acc;
  },
  {} as Record<string, boolean>,
);
