import Api from "api/Api";
import type { AxiosPromise } from "axios";
import type { SearchApiResponse } from "@appsmith/types/ApiResponseTypes";

export interface SearchEntitiesRequest {
  entities?: string[];
  keyword: string;
  page?: number;
  limit?: number;
}

export interface SearchEntitiesResponse {
  entities: [];
  keyword: string;
  page: number;
  limit: number;
}

export class HistoryApi extends Api {
  static historyURL = "v1/history";
  //
  static async getHistoryCompare(
    versionId: string,
  ): Promise<AxiosPromise<SearchApiResponse>> {
    return Api.get(`${HistoryApi.historyURL}/compare?versionId=${versionId}`);
  }
  static async getHistoryList(
    type: string,
    pageId: string,
  ): Promise<AxiosPromise<SearchApiResponse>> {
    return Api.get(
      `${HistoryApi.historyURL}/list?type=${type}&sourceId=${pageId}`,
    );
  }
  static async setHistoryRollback(
    versionId: string,
  ): Promise<AxiosPromise<SearchApiResponse>> {
    return Api.post(`${HistoryApi.historyURL}/rollback?versionId=${versionId}`);
  }
}

export default HistoryApi;
