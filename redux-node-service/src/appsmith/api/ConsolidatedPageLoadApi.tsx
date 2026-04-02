import Api from "./Api";
import type { AxiosPromise } from "axios";
import type { ApiResponse } from "api/ApiResponses";

import type { InitConsolidatedApi } from "sagas/InitSagas";

class ConsolidatedPageLoadApi extends Api {
  static url = "/v1/consolidated-api";

  static async getConsolidatedPageLoadDataView(params: {
    applicationId?: string;
    defaultPageId?: string;
    viewPageId?: string;
  }): Promise<AxiosPromise<ApiResponse<InitConsolidatedApi>>> {
    return Api.get(ConsolidatedPageLoadApi.url + "/view", params);
  }
  static async getConsolidatedPageLoadDataEdit(params: {
    applicationId?: string;
    defaultPageId?: string;
    viewPageId?: string;
  }): Promise<AxiosPromise<ApiResponse<InitConsolidatedApi>>> {
    return Api.get(ConsolidatedPageLoadApi.url + "/edit", params);
  }
  //修改：速度优化-获取页面配置数据
  static async getPageConfigData(params: {
    pageId?: string;
  }): Promise<AxiosPromise<ApiResponse<InitConsolidatedApi>>> {
    return Api.get(ConsolidatedPageLoadApi.url + "/getPageConfigData", params);
  }
}

export default ConsolidatedPageLoadApi;
