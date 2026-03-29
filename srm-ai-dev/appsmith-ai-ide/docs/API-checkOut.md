## 1.签出接口

```
POST http://test.srm.wzhf.com:9000/script-engine/editLock/checkOut
```

### HEADER

```json
{
    "Content-Type":"application/json;charset=UTF-8"
}


```

### BODY

```json
{
    "code": "joiiflowtest",   //填写当前程序名称
 	"acct": "joii@admin.com"  //填写当前登录账号
}
```

### RESPONSE

```json
{
    "code": "0",
    "msg": "success",
    "success": true,   // 调用接口结果
    "data": {
        "icon": "lock-unlock-line",
        "button": "签入",
        "canEdit": true,   //true代表可以编辑,也就是签出成功 
        "pageState": {
            "code": "joiiflowtest",
            "state": "2",
            "ip": "115.223.160.96",
            "pageId": "66d159da1744be38cb2c9d69",
            "acct": "joii@admin.com",
            "time": "2026-03-29 16:47:36"
        }
    }
}
```



## 2.签入接口

## 

```
http://test.srm.wzhf.com:9000/script-engine/editLock/checkIn
```

### HEADER

```json
{
    "Content-Type":"application/json;charset=UTF-8"
}
```

### BODY

```json
{
    "code": "joiiflowtest",   //填写当前程序名称
 	"acct": "joii@admin.com"  //填写当前登录账号
}
```

### RESPONSE

```json
{
    "code": "0",
    "msg": "success",
    "success": true,
    "data": {
        "icon": "lock-2-line",
        "button": "签出",    //当前签出按钮应当显示的名字
        "canEdit": false,   //当前不可编辑,代表签出成功
        "pageState": {
            "code": "joiiflowtest",
            "state": "1",
            "ip": "115.223.160.96",
            "pageId": "66d159da1744be38cb2c9d69",
            "acct": "joii@admin.com",
            "time": "2026-03-29 16:54:36"
        }
    }
}
```

## 3.程序状态查询

```
http://test.srm.wzhf.com:9000/script-engine/editLock/state?acct=joii@admin.com&code=joiiflowtest   
```

### HEADER

```json
{
    "Content-Type":"application/json;charset=UTF-8"
}
```

### QUERY

```json
{
    "code": "joiiflowtest",   --填写当前程序名称
 	"acct": "joii@admin.com"  --填写当前登录账号
}
```

### RESPONSE

```json
{
    "code": "0",
    "msg": "success",
    "success": true,
    "data": {
        "icon": "lock-2-line",
        "button": "签出",     //当前签出按钮应当显示的名字
        "canEdit": false,    //当前工作区是否可以进行编辑操作
        "pageState": {
            "code": "joiiflowtest",
            "state": "1",
            "ip": "115.223.160.96",
            "pageId": "66d159da1744be38cb2c9d69",
            "acct": "joii@admin.com",
            "time": "2026-03-29 16:54:36"
        }
    }
}
```

## 