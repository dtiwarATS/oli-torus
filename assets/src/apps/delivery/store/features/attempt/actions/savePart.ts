import { createAsyncThunk } from '@reduxjs/toolkit';
import { writePartAttemptState } from 'data/persistence/state/intrinsic';
import {
  defaultGlobalEnv,
  evalScript,
  getAssignStatements,
} from '../../../../../../adaptivity/scripting';
import { RootState } from '../../../rootReducer';
import { selectCurrentActivityTree } from '../../groups/selectors/deck';
import { selectPreviewMode, selectSectionSlug } from '../../page/slice';
import {
  AttemptSlice,
  selectActivityAttemptState,
  selectById,
  upsertActivityAttemptState,
} from '../slice';

const getChildResponseMap = (rootState: any, response: any) => {
  const currentActivityTree = selectCurrentActivityTree(rootState);
  let responseMap;
  if (currentActivityTree) {
    const currentActivity = currentActivityTree[currentActivityTree.length - 1];
    const statePrefix = `${currentActivity.id}|stage`;
    responseMap = Object.keys(response).reduce((acc: { [x: string]: any }, key) => {
      const updatedLayerActivityResponse = response[key].path.split('|stage.')[1];
      acc[key] = { ...response[key], path: `${statePrefix}.${updatedLayerActivityResponse}` };

      return acc;
    }, {});
  }
  return responseMap;
};
const handleParentChildActivityVariableSync = (rootState: any, response: any) => {
  const currentActivityTree = selectCurrentActivityTree(rootState);
  let assignScripts: string[] = [];
  if (currentActivityTree) {
    const responseMap = getChildResponseMap(rootState, response) || [];
    assignScripts = getAssignStatements(responseMap);
  }
  return assignScripts;
};
const handleParentChildActivityAttemptStateSync = async (
  dispatch: any,
  attemptRecord: any,
  partAttemptRecord: any,
  rootState: any,
  response: any,
) => {
  const updated = {
    ...attemptRecord,
    parts: attemptRecord.parts.map((p: any) => {
      const result = { ...p };
      if (p.attemptGuid === partAttemptRecord.attemptGuid) {
        result.response = getChildResponseMap(rootState, response);
      }
      return result;
    }),
  };
  await dispatch(upsertActivityAttemptState({ attempt: updated }));
};
export const savePartState = createAsyncThunk(
  `${AttemptSlice}/savePartState`,
  async (payload: any, { dispatch, getState }) => {
    const { attemptGuid, partAttemptGuid, response, activityId } = payload;
    const rootState = getState() as RootState;
    const isPreviewMode = selectPreviewMode(rootState);
    const sectionSlug = selectSectionSlug(rootState);
    let currentActivityTreeId = -1;
    const currentActivityTree = selectCurrentActivityTree(rootState);
    if (currentActivityTree) {
      const currentActivity = currentActivityTree[currentActivityTree.length - 1];
      currentActivityTreeId = currentActivity.id;
    }
    // update redux state to match optimistically
    const attemptRecord = selectById(rootState, attemptGuid);
    if (attemptRecord) {
      const partAttemptRecord = attemptRecord.parts.find((p) => p.attemptGuid === partAttemptGuid);
      if (partAttemptRecord) {
        const updated = {
          ...attemptRecord,
          parts: attemptRecord.parts.map((p) => {
            const result = { ...p };
            if (p.attemptGuid === partAttemptRecord.attemptGuid) {
              result.response = response;
            }
            return result;
          }),
        };
        if (currentActivityTreeId !== activityId) {
          handleParentChildActivityAttemptStateSync(
            dispatch,
            attemptRecord,
            partAttemptRecord,
            rootState,
            response,
          );
        }
        await dispatch(upsertActivityAttemptState({ attempt: updated }));
      }
    }
    const assignScriptsChild =
      currentActivityTreeId !== activityId
        ? handleParentChildActivityVariableSync(rootState, response)
        : [];

    // update scripting env with latest values
    const assignScripts = getAssignStatements(response);
    const finalAssignScripts = [...assignScripts, ...assignScriptsChild];
    const scriptResult: string[] = [];
    if (Array.isArray(finalAssignScripts)) {
      //Need to execute scripts one-by-one so that error free expression are evaluated and only the expression with error fails. It should not have any impacts
      finalAssignScripts.forEach((variable: string) => {
        // update scripting env with latest values
        const { result } = evalScript(variable, defaultGlobalEnv);
        //Usually, the result is always null if expression is executes successfully. If there are any errors only then the result contains the error message
        if (result) scriptResult.push(result);
      });
    }
    /*  console.log('SAVE PART SCRIPT', { assignScript, scriptResult }); */

    // in preview mode we don't write to server, so we're done
    if (isPreviewMode) {
      // TODO: normalize response between client and server (nothing currently cares about it)
      return { result: scriptResult };
    }

    const finalize = false;

    return writePartAttemptState(sectionSlug, attemptGuid, partAttemptGuid, response, finalize);
  },
);

export const savePartStateToTree = createAsyncThunk(
  `${AttemptSlice}/savePartStateToTree`,
  async (payload: any, { dispatch, getState }) => {
    const { attemptGuid, partAttemptGuid, response, activityTree } = payload;
    const rootState = getState() as RootState;
    const currentActivityTree = selectCurrentActivityTree(rootState) || activityTree;
    const currentActivity = currentActivityTree[currentActivityTree.length - 1];
    const attemptRecord = selectById(rootState, attemptGuid);
    const partId = attemptRecord?.parts.find((p) => p.attemptGuid === partAttemptGuid)?.partId;
    if (!partId) {
      throw new Error('cannot find the partId to update');
    }
    const updates = currentActivityTree?.map((activity: any) => {
      const attempt = selectActivityAttemptState(rootState, activity.resourceId);
      if (!attempt) {
        return Promise.reject('could not find attempt!');
      }
      const attemptGuid = attempt.attemptGuid;
      const partAttemptGuid = attempt.parts.find((p) => p.partId === partId)?.attemptGuid;
      if (!partAttemptGuid) {
        // means its in the tree, but doesn't own or inherit this part (some grandparent likely)
        return Promise.resolve('does not own part but thats OK');
      }

      const statePrefix = `${activity.id}|stage`;
      const responseMap = response.input.reduce(
        (result: { [x: string]: any }, item: { key: string; path: string }) => {
          result[item.key] = { ...item, path: `${statePrefix}.${item.path}` };
          return result;
        },
        {},
      );

      /*console.log('updating activity tree part: ', {
        attemptGuid,
        partAttemptGuid,
        activity,
        response,
        responseMap,
      });*/
      return dispatch(
        savePartState({
          attemptGuid,
          partAttemptGuid,
          response: responseMap,
          activityId: currentActivity.id,
        }),
      );
    });

    return Promise.all(updates);
  },
);
