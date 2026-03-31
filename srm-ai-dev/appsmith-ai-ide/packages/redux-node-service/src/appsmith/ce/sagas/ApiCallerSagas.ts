import JSActionAPI from "@appsmith/api/JSActionAPI";
import ActionAPI from "api/ActionAPI";
import type { ApiResponse } from "api/ApiResponses";
import type { Action } from "entities/Action";
import type { JSCollection } from "entities/JSCollection";

export function* updateActionAPICall(action: Action) {
  try {
    const response: ApiResponse<Action> = yield ActionAPI.updateAction(action);

    return response;
  } catch (e) {
    throw e;
  }
}

export function* updateJSCollectionAPICall(jsCollection: JSCollection) {
  try {
    const response: ApiResponse<JSCollection> =
      yield JSActionAPI.updateJSCollection(jsCollection);

    return response;
  } catch (e) {
    throw e;
  }
}
