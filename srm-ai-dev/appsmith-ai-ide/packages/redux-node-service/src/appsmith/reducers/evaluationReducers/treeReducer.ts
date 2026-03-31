import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { applyChange } from "deep-diff";
import type { DataTree } from "entities/DataTree/dataTreeTypes";
import { createImmerReducer } from "utils/ReducerUtils";
import type { DiffWithNewTreeState } from "workers/Evaluation/helpers";
import _ from "lodash";
import produce from "immer";
export type EvaluatedTreeState = DataTree;

const initialState: EvaluatedTreeState = {};

const evaluatedTreeReducer = createImmerReducer(initialState, {
  [ReduxActionTypes.SET_EVALUATED_TREE]: (
    state: EvaluatedTreeState,
    action: ReduxAction<{
      dataTree: DataTree;
      updates: DiffWithNewTreeState[];
      removedPaths: [string];
    }>,
  ) => {
    const { updates } = action.payload;
    if (!updates || updates.length === 0) {
      return state;
    }
    // let stateTemp = _.cloneDeep(state);
    //console.time("aaaaa====aa");
    for (const update of updates) {
      try {
        if (update.kind === "newTree") {
          //console.timeEnd("aaaaa====aa");
          return update.rhs;
        } else {
          if (!update.path || update.path.length === 0) {
            continue;
          }
          applyChange(state, undefined, update);
        }
      } catch (e) {
        console.error(e, {
          extra: {
            update,
            updateLength: updates.length,
          },
        });
      }
    }
    //console.timeEnd("aaaaa====aa");

    // return stateTemp;
    return state;
  },
  [ReduxActionTypes.FETCH_PAGE_INIT]: () => initialState,
  [ReduxActionTypes.RESET_DATA_TREE]: () => initialState,
  [ReduxActionTypes.SET_BATCH_EVALUATED_TREE]: (
    state: EvaluatedTreeState,
    action: ReduxAction<{
      dataTree: DataTree;
      updates: DiffWithNewTreeState[];
      removedPaths: [string];
    }>,
  ) => {
    //console.time("aaaaaaaaaa====aaaa");
    const nextState = produce(state, (draftMetaState) => {
      const { updates } = action.payload;
      for (const update of updates) {
        try {
          //console.time("aaaaaaaaaabbbb====aaaa");

          applyChange(draftMetaState, undefined, update);
          //console.timeEnd("aaaaaaaaaabbbb====aaaa");
        } catch (e) {
          console.error(e, {
            extra: {
              update,
              updateLength: updates.length,
            },
          });
        }
      }

      return draftMetaState;
    });
    //console.timeEnd("aaaaaaaaaa====aaaa");

    return nextState;
  },
});

export default evaluatedTreeReducer;
