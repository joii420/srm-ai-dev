# 接口文档

## 基本信息

| 字段 | 值 |
|------|-----|
| 请求方法 | `GET` |
| 状态码 | `200 OK` |
| 远程地址 | `10.177.136.52:9000` |
| 引用来源网址政策 | `strict-origin-when-cross-origin` |

---

## 接口地址

```
GET http://test.srm.wzhf.com:9000/app/joiitest/joiiflowtest-66d159da1744be38cb2c9d69/edit/jsObjects/66d159da1744be38cb2c9d71
```

---

## 请求头（Request Headers）

| 参数名 | 值 |
|--------|-----|
| Accept | `application/json, text/plain, */*` |
| Accept-Encoding | `gzip, deflate` |
| Accept-Language | `zh-CN, zh;q=0.9` |
| Connection | `keep-alive` |
| Cookie | `XSRF-TOKEN=312f1384-1b43-46be-84e9-3e4dc6423b49; SESSION=c275d412-36bb-4f33-b0c7-a1e7c406a701` |
| Host | `test.srm.wzhf.com:9000` |
| Referer | `http://test.srm.wzhf.com:9000/app/joiitest/joiiflowtest-66d159da1744be38cb2c9d69/edit/jsObjects/66d159da1744be38cb2c9d71` |
| User-Agent | `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36` |
| User-Env | `1ynx5AzhShYPObXK8qQ/Gfdup4uYTDbv3xUgJXmJ5XH30Yq/73Mwem/6CMAclIsT` |
| X-Xsrf-Token | `312f1384-1b43-46be-84e9-3e4dc6423b49` |

---

## 响应头（Response Headers）

| 参数名 | 值 |
|--------|-----|
| Cache-Control | `no-cache, no-store, max-age=0, must-revalidate` |
| Connection | `keep-alive` |
| Content-Encoding | `gzip` |
| Content-Security-Policy | `frame-ancestors 'self' *` |
| Content-Type | `application/json` |
| Date | `Sat, 28 Mar 2026 02:12:45 GMT` |
| Expires | `0` |
| Pragma | `no-cache` |
| Referrer-Policy | `no-referrer` |
| Server | `nginx/1.27.2` |
| Transfer-Encoding | `chunked` |
| Vary | `Accept-Encoding` |
| X-Xss-Protection | `0` |

---

## 认证说明

该接口使用基于 Cookie 的会话认证，同时配合 CSRF Token 进行安全校验：

- **SESSION**：服务端会话标识，存于 Cookie 中
- **XSRF-TOKEN**：防跨站请求伪造令牌，同时在 Cookie 和请求头 `X-Xsrf-Token` 中传递

---

## 响应说明

- **Content-Type**：`application/json`，响应体为 JSON 格式
- **Content-Encoding**：`gzip`，响应内容经过 gzip 压缩
- **Transfer-Encoding**：`chunked`，采用分块传输编码
- **缓存策略**：禁止缓存（`no-cache, no-store, must-revalidate`）

---

## 备注

- 服务器使用 `nginx/1.27.2`
- 跨域策略：`frame-ancestors 'self' *`，允许被任意域名嵌入 iframe
- `X-Xss-Protection: 0` 表示由浏览器内置 XSS 过滤器接管，服务端不额外处理
