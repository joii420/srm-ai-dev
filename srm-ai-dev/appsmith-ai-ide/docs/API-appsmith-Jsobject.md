# 接口文档

## 1.jsObecjt改名(文件改名)

```
PUT  http://test.srm.wzhf.com:9000/api/v1/collections/actions/refactor
```

### HEADER

```json
{
	"Content-Type":"application/json",
	"Cookie":"SESSION=c275d412-36bb-4f33-b0c7-a1e7c406a701" //系统参数已经配置
}
```



### BODY

```json
{
    "layoutId": "688c57ebee8a04352be1bfcf",    		   //需要填充  当前布局Id
    "actionCollectionId": "688c5e0eee8a04352be1bfdc",  //需要填充  当前JsObject文件Id
    "pageId": "688c57ebee8a04352be1bfd0",  //需要填充  当前PageId
    "oldName": "JSObject3",   //需要填充  旧的文件名
    "newName": "JSObject_rename1"   //需要填充  新的文件名
}
```



### RESPONSE

```json
{
    "responseMeta": {
        "status": 200,
        "success": true   //true = 请求成功
    },
    "data": {
        "id": "688c57ebee8a04352be1bfcf",
        "dsl": {
            "widgetName": "MainContainer",
            "backgroundColor": "none",
            "rightColumn": 1224,
            "snapColumns": 64,
            "detachFromLayout": true,
            "widgetId": "0",
            "topRow": 0,
            "bottomRow": 630,
            "containerStyle": "none",
            "snapRows": 62,
            "parentRowSpace": 1,
            "type": "CANVAS_WIDGET",
            "canExtend": true,
            "version": 89,
            "minHeight": 640,
            "parentColumnSpace": 1,
            "dynamicBindingPathList": [],
            "leftColumn": 0,
            "children": []
        },
        "layoutOnLoadActions": [],
        "layoutOnLoadActionErrors": [],
        "actionUpdates": [],
        "messages": []
    },
    "errorDisplay": ""
}
```



## 2.新建JSOBJECT(新建文件)

```
POST  http://test.srm.wzhf.com:9000/api/v1/collections/actions
```

### HEADER

```json
{
	"Content-Type":"application/json",
	"Cookie":"SESSION=c275d412-36bb-4f33-b0c7-a1e7c406a701" //系统参数已经配置
}
```



### BODY

```json
{
    "name": "JSObject3",		//需要填充  文件名
    "workspaceId": "64a2590b4cec4f198aa0585c",		//需要填充
    "pluginId": "64a257324cec4f198aa05848",		//需要填充
    "body": "export default {\n\tmyVar1: [],\n\tmyVar2: {},\n\tmyFun1 () {\n\t\t//\twrite code here\n\t\t//\tthis.myVar1 = [1,2,3]\n\t},\n\tasync myFun2 () {\n\t\t//\tuse async-await or promises\n\t\t//\tawait storeValue('varName', 'hello world')\n\t}\n}",
    "variables": [
        {
            "name": "myVar1",
            "value": "[]"
        },
        {
            "name": "myVar2",
            "value": "{}"
        }
    ],
    "actions": [
        {
            "name": "myFun1",
            "workspaceId": "64a2590b4cec4f198aa0585c",   //需要填充
            "executeOnLoad": false,
            "actionConfiguration": {
                "body": "function () {}",
                "timeoutInMillisecond": 0,
                "jsArguments": []
            },
            "clientSideExecution": true,
            "pageId": "688c57ebee8a04352be1bfd0"		//需要填充
        },
        {
            "name": "myFun2",
            "workspaceId": "64a2590b4cec4f198aa0585c",		//需要填充
            "executeOnLoad": false,
            "actionConfiguration": {
                "body": "async function () {}",
                "timeoutInMillisecond": 0,
                "jsArguments": []
            },
            "clientSideExecution": true,
            "pageId": "688c57ebee8a04352be1bfd0"		//需要填充
        }
    ],
    "pluginType": "JS",
    "pageId": "688c57ebee8a04352be1bfd0",
    "applicationId": "65336e8e5098b83376cc256a"
}
```



### RESPONSE

```json
{
    "responseMeta": {
        "status": 201,
        "success": true   //true = 请求成功
    },
    "data": {
        "defaultToBranchedActionIdsMap": {},
        "id": "69cb1be5dacec22eb11a260d",
        "applicationId": "65336e8e5098b83376cc256a",
        "workspaceId": "64a2590b4cec4f198aa0585c",
        "name": "JSObject3",
        "pageId": "688c57ebee8a04352be1bfd0",
        "pluginId": "64a257324cec4f198aa05848",
        "pluginType": "JS",
        "actions": [
            {
                "id": "69cb1be5dacec22eb11a260c",
                "applicationId": "65336e8e5098b83376cc256a",
                "workspaceId": "64a2590b4cec4f198aa0585c",
                "pluginType": "JS",
                "pluginId": "64a257324cec4f198aa05848",
                "name": "myFun2",
                "fullyQualifiedName": "JSObject3.myFun2",
                "datasource": {
                    "userPermissions": [],
                    "name": "UNUSED_DATASOURCE",
                    "pluginId": "64a257324cec4f198aa05848",
                    "workspaceId": "64a2590b4cec4f198aa0585c",
                    "datasourceStorages": {},
                    "messages": [],
                    "isValid": true,
                    "new": true
                },
                "pageId": "688c57ebee8a04352be1bfd0",
                "collectionId": "69cb1be5dacec22eb11a260d",
                "actionConfiguration": {
                    "timeoutInMillisecond": 10000,
                    "paginationType": "NONE",
                    "encodeParamsToggle": true,
                    "body": "async function () {}",
                    "jsArguments": []
                },
                "executeOnLoad": false,
                "clientSideExecution": true,
                "dynamicBindingPathList": [
                    {
                        "key": "body"
                    }
                ],
                "isValid": true,
                "invalids": [],
                "messages": [],
                "jsonPathKeys": [
                    "async function () {}"
                ],
                "confirmBeforeExecute": false,
                "userPermissions": [
                    "read:actions",
                    "delete:actions",
                    "execute:actions",
                    "manage:actions"
                ],
                "defaultResources": {
                    "actionId": "69cb1be5dacec22eb11a260c",
                    "applicationId": "65336e8e5098b83376cc256a",
                    "pageId": "688c57ebee8a04352be1bfd0",
                    "collectionId": "69cb1be5dacec22eb11a260d"
                },
                "updatedAt": "2026-03-31T00:57:09Z",
                "entityReferenceType": "JSACTION"
            },
            {
                "id": "69cb1be5dacec22eb11a260b",
                "applicationId": "65336e8e5098b83376cc256a",
                "workspaceId": "64a2590b4cec4f198aa0585c",
                "pluginType": "JS",
                "pluginId": "64a257324cec4f198aa05848",
                "name": "myFun1",
                "fullyQualifiedName": "JSObject3.myFun1",
                "datasource": {
                    "userPermissions": [],
                    "name": "UNUSED_DATASOURCE",
                    "pluginId": "64a257324cec4f198aa05848",
                    "workspaceId": "64a2590b4cec4f198aa0585c",
                    "datasourceStorages": {},
                    "messages": [],
                    "isValid": true,
                    "new": true
                },
                "pageId": "688c57ebee8a04352be1bfd0",
                "collectionId": "69cb1be5dacec22eb11a260d",
                "actionConfiguration": {
                    "timeoutInMillisecond": 10000,
                    "paginationType": "NONE",
                    "encodeParamsToggle": true,
                    "body": "function () {}",
                    "jsArguments": []
                },
                "executeOnLoad": false,
                "clientSideExecution": true,
                "dynamicBindingPathList": [
                    {
                        "key": "body"
                    }
                ],
                "isValid": true,
                "invalids": [],
                "messages": [],
                "jsonPathKeys": [
                    "function () {}"
                ],
                "confirmBeforeExecute": false,
                "userPermissions": [
                    "read:actions",
                    "delete:actions",
                    "execute:actions",
                    "manage:actions"
                ],
                "defaultResources": {
                    "actionId": "69cb1be5dacec22eb11a260b",
                    "applicationId": "65336e8e5098b83376cc256a",
                    "pageId": "688c57ebee8a04352be1bfd0",
                    "collectionId": "69cb1be5dacec22eb11a260d"
                },
                "updatedAt": "2026-03-31T00:57:09Z",
                "entityReferenceType": "JSACTION"
            }
        ],
        "archivedActions": [],
        "body": "export default {\n\tmyVar1: [],\n\tmyVar2: {},\n\tmyFun1 () {\n\t\t//\twrite code here\n\t\t//\tthis.myVar1 = [1,2,3]\n\t},\n\tasync myFun2 () {\n\t\t//\tuse async-await or promises\n\t\t//\tawait storeValue('varName', 'hello world')\n\t}\n}",
        "variables": [
            {
                "name": "myVar1",
                "value": "[]"
            },
            {
                "name": "myVar2",
                "value": "{}"
            }
        ],
        "defaultResources": {
            "applicationId": "65336e8e5098b83376cc256a",
            "pageId": "688c57ebee8a04352be1bfd0",
            "collectionId": "69cb1be5dacec22eb11a260d"
        },
        "userPermissions": [
            "read:actions",
            "delete:actions",
            "execute:actions",
            "manage:actions"
        ]
    },
    "errorDisplay": ""
}
```



## 3.删除JSOBJECT(删除文件)

```
DELETE  http://test.srm.wzhf.com:9000/api/v1/collections/actions/{{collectionId}}
```

### HEADER

```json
{
	"Content-Type":"application/json",
	"Cookie":"SESSION=c275d412-36bb-4f33-b0c7-a1e7c406a701" //系统参数已经配置
}
```

### RESPONSE

```json
{
    "responseMeta": {
        "status": 200,
        "success": true   //true = 请求成功
    },
    "data": {
        "defaultToBranchedActionIdsMap": {},
        "id": "69cb1be5dacec22eb11a260d",
        "applicationId": "65336e8e5098b83376cc256a",
        "workspaceId": "64a2590b4cec4f198aa0585c",
        "name": "JSObject3",
        "pageId": "688c57ebee8a04352be1bfd0",
        "pluginId": "64a257324cec4f198aa05848",
        "pluginType": "JS",
        "actions": [],
        "archivedActions": [],
        "body": "export default {\n\tmyVar1: [],\n\tmyVar2: {},\n\tmyFun1 () {\n\t\t//\twrite code here\n\t\t//\tthis.myVar1 = [1,2,3]\n\t},\n\tasync myFun2 () {\n\t\t//\tuse async-await or promises\n\t\t//\tawait storeValue('varName', 'hello world')\n\t}\n}",
        "variables": [
            {
                "name": "myVar1",
                "value": "[]"
            },
            {
                "name": "myVar2",
                "value": "{}"
            }
        ],
        "defaultResources": {
            "applicationId": "65336e8e5098b83376cc256a",
            "pageId": "688c57ebee8a04352be1bfd0",
            "collectionId": "69cb1be5dacec22eb11a260d"
        },
        "userPermissions": []
    },
    "errorDisplay": ""
}
```

## 4.JSOBJECT内容更新(文件内容更新)

```
PUT  http://test.srm.wzhf.com:9000/api/v1/collections/actions/{{collectionId}}/body
```

### HEADER

```json
{
	"Content-Type":"application/json",
	"Cookie":"SESSION=c275d412-36bb-4f33-b0c7-a1e7c406a701" //系统参数已经配置
}
```

### BODY

```json
{
    "body": "export default {\n\tmyVar1: [],\n\tmyVar2: {},\n\ttesdt1324(){},\n}"  //文件内容全文
}
```



### RESPONSE

```json
{
    "responseMeta": {
        "status": 200,
        "success": true   //ture = 请求成功
    },
    "data": 1,
    "errorDisplay": ""
}
```

## 

声明1: 以下内容仅属于appsmith程序,与普通程序无关

声明: 在签出之后会向appsmith发起请求"http://test.srm.wzhf.com:9000/api/v1/consolidated-api/edit?defaultPageId=688c57ebee8a04352be1bfd0&viewPageId=688c57ebee8a04352be1bfd0" ,得到当前程序的在数据库的实际内容,实际内容在下文统称为"editResponse",需要做映射记录,在最后签入的时候按操作顺序调用接口进行提交操作到数据库

## 业务说明:

- 在appsmith结构中, collection等同于我们的文件,collectionId就是文件Id, 来自于editResponse.unpublishedActionCollections.data中,每个对象的id都是对应的文件id
- 我们现在在读取文件列表的时候,读取的是editResponse.unpublishedActionCollections.data的name字段,现在需要记录整个对象与文件关联,在文件发生改名/新建/删除的操作时,按照以上api文档进行记录调用接口存放于list中,以上文档中需要填充的字段从文件对象中获取,其他的均为固定格式.为什么不是直接调用呢,目的是为了防止用户改名或新建或者删除之后,取消操作从而影响了实际数据库内容,所以系统在用户进行操作之后,按顺序做调用记录.
- 在用户签入提交代码到远程仓库之后并且在调用签入程序状态接口之前,读取这个调用记录list然后按顺序循环调用,达到记录入库的效果.
- 在修改完文件编辑入库之后, 获取到本次文件内容发生变更的文件对象(文件改名操作不算),按以下顺序调用接口

    ```
1.如果上述的调用记录list在本次容器会话中未曾进行调用,则使用最初得到的editResponse,如果在本次容器会话中变更过文件名或新增删除过文件,则在这里再次调用http://test.srm.wzhf.com:9000/api/v1/consolidated-api/edit?defaultPageId=688c57ebee8a04352be1bfd0&viewPageId=688c57ebee8a04352be1bfd0更新最新的editResponse
2.调用获取会话: POST http://localhost:3200/sessions
3.调用初始化会话: POST /sessions/:id/biz/init
4.将所有有过内容变更的文件,依次调用获取变更内容:  POST /sessions/:id/biz/update/js-action, 如果response中的success = true ,并且result.edit=true,并且result.httpActions数组不为空
 - 4.1 调用4.JSOBJECT内容更新接口,更新文件全文内容入库
 - 4.2 遍历数组,根据数组的内容进行发起http请求(此操作是将变更内容入库)
5.所有文件内容变更内容入库结束,调用删除会话接口:　DELETE /sessions/:id　，关闭刚刚开始的会话．注意：这个接口在创建会话之后的操作最后必须调用，请使用try finally方式保证调用.
    6.本次编辑完成,开始关闭容器并且调用程序签入状态接口恢复程序可签出状态.
    7.以下是用到的接口内容
    ```

### 2. `POST /sessions`

创建隔离会话。每个会话拥有独立的 Store、Saga 和 worker_thread。

**请求体 (JSON)**：

| 参数         | 类型   | 必填 | 说明                            |
| ------------ | ------ | ---- | ------------------------------- |
| `authToken`  | string | 否   | Appsmith 后端认证 Token，默认空 |
| `backendUrl` | string | 否   | Appsmith 后端地址，默认空       |

**调用示例**：

```bash
curl -X POST http://localhost:3200/sessions \
  -H "Content-Type: application/json" \
  -d '{
  "authToken": "your-jwt-token",  //可以固定传your-jwt-token
  "backendUrl": "http://appsmith:8080"  //可以固定传http://appsmith:8080
  }'
```

**成功响应**：

```json
{
  "success": true,
  "message": "",
  "result": {
    "sessionId": "3f8ab32c-8a0c-4c75-baa4-722015162123",   //获取到的sessionId记录下来在后面调用session接口的时候时间
    "createdAt": "2026-03-26T03:05:50.724Z"
  }
}
```

**失败响应**：

```json
{
  "success": false,
  "message": "创建失败",
  "errorCode": "SESSION_CREATE_FAILED",
  "result": null
}
```

---

### 4. `DELETE /sessions/:id`

销毁会话，释放 Store、Saga、worker_thread 资源。

**路径参数**：

| 参数 | 类型   | 必填 | 说明    |
| ---- | ------ | ---- | ------- |
| `id` | string | 是   | 会话 ID |

**调用示例**：

```bash
curl -X DELETE http://localhost:3200/sessions/3f8ab32c-...
```

**成功响应**：

```json
{ "success": true, "message": "", "result": null }
```

**失败响应**：

```json
{
  "success": false,
  "message": "Session not found",
  "errorCode": "SESSION_NOT_FOUND",
  "result": null
}
```

---

### 5. `POST /sessions/:id/biz/init`

初始化业务。dispatch `INITIALIZE_EDITOR`，竞速等待成功或失败（超时 120 秒）。

**路径参数**：

| 参数 | 类型   | 必填 | 说明    |
| ---- | ------ | ---- | ------- |
| `id` | string | 是   | 会话 ID |

**请求体 (JSON)**：

| 参数          | 类型   | 必填 | 说明           |
| ------------- | ------ | ---- | -------------- |
| `pageId`      | string | 是   | 页面 ID        |
| `pageContext` | object | 是   | 页面上下文数据 |

**调用示例**：

```bash
curl -X POST http://localhost:3200/sessions/$SID/biz/init \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "page_123",    // 程序Id | pageId
    "pageContext": { ... }  // editResponse对象
  }'
```

**成功响应**：

```json
{ "success": true, "message": "", "result": "初始化成功" }
```

**失败响应 - 初始化异常**：

```json
{
  "success": false,
  "message": "初始化异常",
  "errorCode": "INIT_CRASH",
  "result": null
}
```

**失败响应 - 超时**：

```json
{
  "success": false,
  "message": "初始化超时: raceForAction([...]) timed out after 120000ms",
  "errorCode": "TIMEOUT",
  "result": null
}
```

**失败响应 - 缺少参数**：

```json
{
  "success": false,
  "message": "pageId 为必填参数",
  "errorCode": "MISSING_PARAM",
  "result": null
}
```

---

### 6. `POST /sessions/:id/biz/update/js-action`

更新 JS Action body。比较当前 body 与传入 body，若有变更则 dispatch 更新并等待结果。

**路径参数**：

| 参数 | 类型   | 必填 | 说明    |
| ---- | ------ | ---- | ------- |
| `id` | string | 是   | 会话 ID |

**请求体 (JSON)**：

| 参数   | 类型   | 必填 | 说明             |
| ------ | ------ | ---- | ---------------- |
| `id`   | string | 是   | JS Collection ID |
| `body` | string | 是   | 新的 body 内容   |

**调用示例**：

```bash
curl -X POST http://localhost:3200/sessions/$SID/biz/update/js-action \
  -H "Content-Type: application/json" \
  -d '{
    "id": "js-collection-id-123",       //  变更的文件id | collectionId
    "body": "export default { myFunc: () => {} }"   //变更文件的内容
  }'
```

**成功响应 - 无变更**：

```json
{
  "success": true,
  "message": "",
  "result": {
    "edit": false,
    "httpActions": []
  }
}
```

**成功响应 - 有变更**：

```json
{
  "success": true,
  "message": "",
  "result": {
    "edit": true,
    "httpActions": [
      {
        "method": "PUT",
        "url": "v1/collections/actions/refactorAction",
        "body": {
          "actionId": "68f2043658f1ae33b5f471d4",
          "collectionName": "VALID",
          "pageId": "68f1957658f1ae33b5f46d87",
          "oldName": "openWindow",
          "newName": "openWindow3",
          "layoutId": "68f1957658f1ae33b5f46d86",
          "actionCollection": { "..." : "..." }
        }
      }
    ]
  }
}
```

> `httpActions` 数组中每个元素代表一个需要调用方向 Appsmith 后端发起的 HTTP 请求（method + url + body）。

**失败响应 - JS Collection 不存在**：

```json
{
  "success": false,
  "message": "未找到 id 为 xxx 的 JS Collection",
  "errorCode": "JS_COLLECTION_NOT_FOUND",
  "result": null
}
```

**失败响应 - 更新失败**：

```json
{
  "success": false,
  "message": "更新 JS Action body 失败",
  "errorCode": "INTERNAL_ERROR",
  "result": null
}
```

**失败响应 - 超时**：

```json
{
  "success": false,
  "message": "更新超时: raceForAction([...]) timed out after 30000ms",
  "errorCode": "TIMEOUT",
  "result": null
}
```

**失败响应 - 缺少参数**：

```json
{
  "success": false,
  "message": "id 为必填参数",
  "errorCode": "MISSING_PARAM",
  "result": null
}
```

