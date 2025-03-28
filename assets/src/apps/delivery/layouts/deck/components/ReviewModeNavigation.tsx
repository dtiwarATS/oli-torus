/* eslint-disable react/prop-types */
import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { defaultGlobalEnv, getEnvState } from '../../../../../adaptivity/scripting';
import { selectCurrentActivityId } from '../../../store/features/activities/slice';
import { setHistoryNavigationTriggered } from '../../../store/features/adaptivity/slice';
import { navigateToActivity } from '../../../store/features/groups/actions/deck';
import { selectSequence } from '../../../store/features/groups/selectors/deck';
import { selectShowHistory, setShowHistory } from '../../../store/features/page/slice';
import ReviewModeHistoryPanel from './ReviewModeHistoryPanel';

export interface ReviewEntry {
  id: string;
  name: string;
  timestamp?: number;
  current?: boolean;
  selected?: boolean;
}

const ReviewModeNavigation: React.FC = () => {
  const currentActivityId = useSelector(selectCurrentActivityId);
  const showHistory = useSelector(selectShowHistory);
  const sequences = useSelector(selectSequence);
  const dispatch = useDispatch();

  const snapshot = getEnvState(defaultGlobalEnv);

  // Get the activities students visited
  const globalSnapshot = Object.keys(snapshot)
    .filter((key: string) => key.indexOf('session.visitTimestamps.') === 0)
    ?.reverse()
    .map((entry) => entry.split('.')[2]);

  const sortByTimestamp = (a: ReviewEntry, b: ReviewEntry) => {
    if (a.timestamp !== undefined && b.timestamp !== undefined) {
      if (a.timestamp == 0) {
        return b.timestamp - Date.now();
      } else if (b.timestamp == 0) {
        return Date.now() - b.timestamp;
      }
      return b.timestamp - a.timestamp;
    }
    return 0;
  };

  // Get the activity names and ids to be displayed in the history panel
  let historyItems: ReviewEntry[] = globalSnapshot
    ?.map((activityId) => {
      const foundSequence = sequences.filter(
        (sequence) => sequence.custom?.sequenceId === activityId,
      )[0];
      return {
        id: foundSequence.custom?.sequenceId,
        name: foundSequence.custom?.sequenceName || foundSequence.id,
        timestamp: snapshot[`session.visitTimestamps.${foundSequence.custom?.sequenceId}`],
      };
    })
    .sort(sortByTimestamp);
  historyItems = historyItems.reverse();

  const currentHistoryActivityIndex = historyItems.findIndex(
    (item: any) => item.id === currentActivityId,
  );
  const isFirst = currentHistoryActivityIndex === 0;
  const isLast = currentHistoryActivityIndex === historyItems.length - 1;

  const nextHandler = () => {
    const prevActivity = historyItems[currentHistoryActivityIndex + 1];
    dispatch(navigateToActivity(prevActivity.id));

    dispatch(
      setHistoryNavigationTriggered({
        historyModeNavigation: true,
      }),
    );
  };
  const minimizeHandler = () => {
    dispatch(setShowHistory({ show: !showHistory }));
  };
  const prevHandler = () => {
    const prevActivity = historyItems[currentHistoryActivityIndex - 1];
    dispatch(navigateToActivity(prevActivity.id));
    dispatch(
      setHistoryNavigationTriggered({
        historyModeNavigation: true,
      }),
    );
  };

  const handleToggleReviewModeScreenList = (show: boolean) => {
    dispatch(setShowHistory({ show }));
  };
  return (
    <Fragment>
      {
        <div className="review-button">
          <style>
            {`
            .review-button {
              z-index: 1;
              display: flex;
              align-items: center;
              position: fixed;
              top: 0;
              left: calc(50% - .65rem);
            }
            .review-button button {
              text-decoration: none;
              padding: 4px 10px;
              font-size: 1.3rem;
              line-height: 1.5;
              border-radius: 0 0 4px 4px;
              border: 1px solid #6c757d;
              border-top: none;
              transition: color .15s ease-in-out, background-color .15s ease-in-out, box-shadow .15s ease-in-out;
              margin-right:15px;
            }
            .review-button button:hover {
              color: #fff;
              background-color: #6c757d;
              box-shadow: 0 1px 2px #00000079;
              cursor: pointer;
            }
            `}
          </style>
          <button
            onClick={() => handleToggleReviewModeScreenList(!showHistory)}
            title="Show lesson history"
            aria-label="Screen List"
          >
            <span title="Show lesson history" className="fa fa-list">
              &nbsp;
            </span>
          </button>
          {showHistory && (
            <div className={['navigationContainer', 'pullLeftInCheckContainer'].join(' ')}>
              {
                <ReviewModeHistoryPanel
                  items={historyItems}
                  onMinimize={minimizeHandler}
                ></ReviewModeHistoryPanel>
              }
            </div>
          )}
          <button
            onClick={prevHandler}
            title="Previous screen"
            aria-label="Previous screen"
            disabled={isFirst}
          >
            <span title="Previous screen" className="fa fa-arrow-left">
              &nbsp;
            </span>
          </button>
          <button
            onClick={nextHandler}
            title="Next screen"
            aria-label="Next screen"
            disabled={isLast}
          >
            <span title="Next screen" className="fa fa-arrow-right">
              &nbsp;
            </span>
          </button>
        </div>
      }
    </Fragment>
  );
};

export default ReviewModeNavigation;
