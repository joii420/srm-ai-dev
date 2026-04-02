//插入
export async function insertData(databaseName: string, data: []) {
  return await operateWidget("globalRxDBInstance", "insertData", [
    databaseName,
    data,
  ]);
}

// 移除数据
export async function removeData(databaseName: string, option: object) {
  return await operateWidget("globalRxDBInstance", "removeData", [
    databaseName,
    option,
  ]);
}

//修改数据
export async function updateData(
  databaseName: string,
  oldData: {},
  newData: {},
) {
  return await operateWidget("globalRxDBInstance", "updateData", [
    databaseName,
    oldData,
    newData,
  ]);
}

// 查询
export async function queryData(databaseName: string, option: object) {
  return await operateWidget("globalRxDBInstance", "queryData", [
    databaseName,
    option,
  ]);
}
