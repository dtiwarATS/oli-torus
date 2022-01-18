/* eslint-disable react/prop-types */
import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { defaultGlobalEnv, getEnvState } from '../../../../../adaptivity/scripting';
import { selectCurrentActivityId } from '../../../store/features/activities/slice';
import {
  setHistoryNavigationTriggered,
  setRestartLesson,
} from '../../../store/features/adaptivity/slice';
import { navigateToActivity } from '../../../store/features/groups/actions/deck';
import { selectSequence } from '../../../store/features/groups/selectors/deck';
import {
  selectAllowBackwordForwardNavigation,
  selectEnableHistory,
  selectShowHistory,
  setShowHistory,
} from '../../../store/features/page/slice';
import HistoryPanel from './HistoryPanel';
export interface HistoryNavigationProps {
  id: string;
  name: string;
  timestamp?: string;
}
const HistoryNavigation: React.FC = () => {
  const currentActivityId = useSelector(selectCurrentActivityId);
  const enableHistory = useSelector(selectEnableHistory);
  const showHistory = useSelector(selectShowHistory);
  //difference between history mode navigation v/S allow forward navigation
  // history mode navigation - disable all the controls on the screens studen already visited and history panle only shows the screens that student visited.
  //allow forward navigation - displayes all the screens in the history panel and we don't disable the controls
  const allowForwardNavigation = useSelector(selectAllowBackwordForwardNavigation);
  const sequences = useSelector(selectSequence);
  const dispatch = useDispatch();

  const restartHandler = () => {
    dispatch(setRestartLesson({ restartLesson: true }));
  };

  const minimizeHandler = () => {
    dispatch(setShowHistory({ show: !showHistory }));
  };

  const snapshot = getEnvState(defaultGlobalEnv);

  // Get the activities student visited
  const globalSnapshot = Object.keys(snapshot)
    .filter((key: string) => key.indexOf('session.visitTimestamps.') === 0)
    ?.reverse()
    .map((entry) => entry.split('.')[2]);

  // Get the activity names and ids to be displayed in the history panel
  let historyItems: HistoryNavigationProps[] = [];
  historyItems = globalSnapshot?.map((activityId) => {
    const foundSequence = sequences.filter(
      (sequence) => sequence.custom?.sequenceId === activityId,
    )[0];
    return {
      id: foundSequence.custom?.sequenceId,
      name: foundSequence.custom?.sequenceName || foundSequence.id,
      timestamp: snapshot[`session.visitTimestamps.${foundSequence.custom?.sequenceId}`],
    };
  });
  if (allowForwardNavigation) {
    const foundSequence = sequences.filter((sequence) => !sequence.custom?.isLayer);
    historyItems = foundSequence?.map((sequence) => {
      return {
        id: sequence.custom?.sequenceId,
        name: sequence.custom?.sequenceName || sequence.id,
      };
    });
  }
  const currentHistoryActivityIndex = historyItems.findIndex(
    (item: any) => item.id === currentActivityId,
  );
  const previousScreenIndex = allowForwardNavigation
    ? currentHistoryActivityIndex + 1
    : currentHistoryActivityIndex - 1;

  const nextScreenIndex = allowForwardNavigation
    ? currentHistoryActivityIndex - 1
    : currentHistoryActivityIndex + 1;

  const isFirst = allowForwardNavigation
    ? currentHistoryActivityIndex === 0
    : currentHistoryActivityIndex === historyItems.length - 1;

  const isLast = allowForwardNavigation
    ? currentHistoryActivityIndex === historyItems.length - 1
    : currentHistoryActivityIndex === 0;
  const nextHandler = () => {
    const prevActivity = historyItems[previousScreenIndex];
    dispatch(navigateToActivity(prevActivity.id));

    const nextHistoryActivityIndex = historyItems.findIndex(
      (item: any) => item.id === prevActivity.id,
    );
    if (!allowForwardNavigation) {
      dispatch(
        setHistoryNavigationTriggered({
          historyModeNavigation: nextHistoryActivityIndex !== 0,
        }),
      );
    }
  };

  const prevHandler = () => {
    const prevActivity = historyItems[nextScreenIndex];
    dispatch(navigateToActivity(prevActivity.id));
    if (!allowForwardNavigation) {
      dispatch(
        setHistoryNavigationTriggered({
          historyModeNavigation: true,
        }),
      );
    }
  };
  return (
    <Fragment>
      {enableHistory ? (
        <div className="historyStepView pullLeftInCheckContainer">
          <div className="historyStepContainer">
            <button
              onClick={prevHandler}
              className="backBtn historyStepButton"
              aria-label="Previous screen"
              disabled={isFirst}
            >
              <span className="icon-chevron-left" />
            </button>
            <button
              onClick={nextHandler}
              className="nextBtn historyStepButton"
              aria-label="Next screen"
              disabled={isLast}
            >
              <span className="icon-chevron-right" />
            </button>
          </div>
        </div>
      ) : null}
      <div
        className={[
          'navigationContainer',
          enableHistory ? undefined : 'pullLeftInCheckContainer',
        ].join(' ')}
      >
        <aside className={`ui-resizable ${showHistory ? undefined : 'minimized'}`}>
          {enableHistory ? (
            <Fragment>
              <button
                onClick={minimizeHandler}
                className="navigationToggle"
                aria-label="Show lesson history"
                aria-haspopup="true"
                aria-controls="theme-history-panel"
                aria-pressed="false"
              />

              <HistoryPanel
                items={historyItems}
                onMinimize={minimizeHandler}
                onRestart={restartHandler}
                allowForwardNavigation={allowForwardNavigation}
              />
            </Fragment>
          ) : (
            <button onClick={restartHandler} className="theme-no-history-restart">
              <span>
                <div className="theme-no-history-restart__icon" />
                <span className="theme-no-history-restart__label">Restart Lesson</span>
              </span>
            </button>
          )}
        </aside>
      </div>
    </Fragment>
  );
};

export default HistoryNavigation;
