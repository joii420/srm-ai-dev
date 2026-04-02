/**
 * 统一响应格式工具。
 *
 * 所有接口返回：
 *   成功: { success: true,  message: "", result: any }
 *   失败: { success: false, message: string, errorCode: string, result: null }
 *
 * 注意：HTTP 状态码始终为 200，通过 success + errorCode 区分结果。
 */
import type { Response } from "express";
import { ErrorCode } from "./error-codes";

export function ok(res: Response, result: any = null) {
  res.json({ success: true, message: "", result });
}

export function fail(res: Response, message: string, errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR) {
  res.json({ success: false, message, errorCode, result: null });
}
