import { Router, Request, Response } from "express";
import axios from "axios";
import { sessionManager } from "../sessions/session-manager";
import { fail } from "../utils/response";
import { ErrorCode } from "../utils/error-codes";

export function createActionProxyRoutes(): Router {
  const router = Router();

  /**
   * ALL /sessions/:id/proxy/* — Proxy requests to Appsmith backend
   *
   * 注意：代理路由直接透传后端响应体，不套 { success, message, result } 格式。
   * 仅在代理本身出错（网络不可达、超时等）时使用统一错误格式。
   */
  router.all("/sessions/:id/proxy/{*path}", async (req: Request, res: Response) => {
    const session = sessionManager.getSession(req.params.id);
    if (!session) return fail(res, `Session ${req.params.id} not found`, ErrorCode.SESSION_NOT_FOUND);

    const { authToken, backendUrl } = session;
    if (!backendUrl) return fail(res, "Session has no backendUrl configured", ErrorCode.BACKEND_CONFIG_ERROR);

    const proxyPath = req.params.path || "";
    const targetUrl = `${backendUrl}/api/${proxyPath}`;

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        params: req.query,
        data: req.body,
        headers: {
          "Content-Type": req.headers["content-type"] || "application/json",
          Authorization: authToken ? `Bearer ${authToken}` : "",
          "X-Requested-By": "Appsmith",
          ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}),
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      res.status(response.status).json(response.data);
    } catch (err: any) {
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        fail(res, `Backend unavailable: ${targetUrl}`, ErrorCode.BACKEND_UNAVAILABLE);
      } else if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        fail(res, `Backend timeout: ${targetUrl}`, ErrorCode.BACKEND_TIMEOUT);
      } else {
        fail(res, err.message, ErrorCode.INTERNAL_ERROR);
      }
    }
  });

  return router;
}
