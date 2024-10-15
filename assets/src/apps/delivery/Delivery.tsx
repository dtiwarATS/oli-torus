import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useWindowSize from 'components/hooks/useWindowSize';
import { getModeFromLocalStorage } from 'components/misc/DarkModeSelector';
import { janus_std } from 'adaptivity/janus-scripts/builtin_functions';
import { defaultGlobalEnv, evalScript } from 'adaptivity/scripting';
import { isDarkMode } from 'utils/browser';
import PreviewTools from './components/PreviewTools';
import { DeadlineTimer } from './layouts/deck/DeadlineTimer';
import DeckLayoutView from './layouts/deck/DeckLayoutView';
import ScreenIdleTimeOutDialog from './layouts/deck/IdleTimeOutDialog';
import LessonFinishedDialog from './layouts/deck/LessonFinishedDialog';
import RestartLessonDialog from './layouts/deck/RestartLessonDialog';
import { LayoutProps } from './layouts/layouts';
import {
  selectLessonEnd,
  selectRestartLesson,
  selectScreenIdleTimeOutTriggered,
  setScreenIdleTimeOutTriggered,
} from './store/features/adaptivity/slice';
import { LayoutType, selectCurrentGroup } from './store/features/groups/slice';
import { loadInitialPageState } from './store/features/page/actions/loadInitialPageState';
import { selectScreenIdleExpirationTime } from './store/features/page/slice';

export interface DeliveryProps {
  resourceId: number;
  sectionSlug: string;
  projectSlug: string;
  userId: number;
  userName: string;
  pageTitle: string;
  pageSlug: string;
  content: any;
  resourceAttemptState: any;
  resourceAttemptGuid: string;
  activityGuidMapping: any;
  previewMode?: boolean;
  isInstructor: boolean;
  enableHistory?: boolean;
  activityTypes?: any[];
  graded: boolean;
  overviewURL: string;
  finalizeGradedURL: string;
  screenIdleTimeOutInSeconds?: number;
  reviewMode?: boolean;
  signoutUrl?: string;
  currentServerTime?: number;
  effectiveEndTime?: number;
  lateSubmit?: 'allow' | 'disallow';
  attemptType?: string;
}

const Delivery: React.FC<DeliveryProps> = ({
  userId,
  userName,
  resourceId,
  sectionSlug,
  pageTitle = '',
  pageSlug,
  content,
  resourceAttemptGuid,
  resourceAttemptState,
  activityGuidMapping,
  signoutUrl,
  activityTypes = [],
  previewMode = false,
  isInstructor = false,
  enableHistory = false,
  graded = false,
  overviewURL = '',
  finalizeGradedURL = '',
  screenIdleTimeOutInSeconds = 1800,
  reviewMode = false,
  currentServerTime = 0,
  effectiveEndTime = 0,
  lateSubmit = 'allow',
  attemptType = '',
}) => {
  const dispatch = useDispatch();
  const currentGroup = useSelector(selectCurrentGroup);
  const restartLesson = useSelector(selectRestartLesson);
  const screenIdleExpirationTime = useSelector(selectScreenIdleExpirationTime);
  const screenIdleTimeOutTriggered = useSelector(selectScreenIdleTimeOutTriggered);

  const [currentTheme, setCurrentTheme] = useState('auto');
  // Gives us the deadline for this assessment to be completed by.
  // We subtract out the server time and add in our local time in case the client system clock is off.
  // Measured in milliseconds-epoch to match Date.now()
  const localDeadline = useMemo(() => {
    if (!effectiveEndTime) {
      return Number.MAX_SAFE_INTEGER;
    }
    return effectiveEndTime - currentServerTime + Date.now();
  }, [currentServerTime, effectiveEndTime]);

  let LayoutView: React.FC<LayoutProps> = () => <div>Unknown Layout</div>;
  if (currentGroup?.layout === LayoutType.DECK) {
    LayoutView = DeckLayoutView;
  }

  //Need to start the warning 5 minutes before session expires
  const screenIdleWarningTime = screenIdleTimeOutInSeconds * 1000 - 300000;

  useEffect(() => {
    //if it's preview mode, we don't need to do anything
    if (!screenIdleExpirationTime || previewMode || reviewMode) {
      return;
    }
    const timer = setTimeout(() => {
      dispatch(setScreenIdleTimeOutTriggered({ screenIdleTimeOutTriggered: true }));
    }, screenIdleWarningTime);
    return () => clearTimeout(timer);
  }, [screenIdleExpirationTime]);

  const handleUserThemePreferende = () => {
    switch (getModeFromLocalStorage()) {
      case 'dark':
        setCurrentTheme('dark');
        break;
      case 'auto':
        if (isDarkMode()) {
          setCurrentTheme('dark');
        } else {
          setCurrentTheme('light');
        }
        break;
      case 'light':
        setCurrentTheme('light');
        break;
    }
  };
  useEffect(() => {
    setInitialPageState();
    handleUserThemePreferende();
  }, []);

  const setInitialPageState = () => {
    // the standard lib relies on first the userId and userName session variables being set
    const userScript = `let session.userId = ${userId};let session.userName = "${
      userName || 'guest'
    }";`;
    evalScript(userScript, defaultGlobalEnv);
    evalScript(janus_std, defaultGlobalEnv);

    dispatch(
      loadInitialPageState({
        userId,
        userName,
        resourceId,
        sectionSlug,
        pageTitle,
        pageSlug,
        content,
        resourceAttemptGuid,
        resourceAttemptState,
        activityGuidMapping,
        previewMode: !!previewMode,
        isInstructor,
        activityTypes,
        enableHistory,
        showHistory: false,
        score: 0,
        graded,
        activeEverapp: 'none',
        overviewURL,
        finalizeGradedURL,
        screenIdleTimeOutInSeconds,
        reviewMode,
        attemptType,
      }),
    );
  };
  const parentDivClasses: string[] = [];
  if (content?.custom?.viewerSkin) {
    parentDivClasses.push(`skin-${content?.custom?.viewerSkin}`);
  }
  const dialogImageUrl = content?.custom?.logoutPanelImageURL;
  const dialogMessage = content?.custom?.logoutMessage;
  const fullscreen = !content?.displayApplicationChrome;

  // this is something SS does.....
  const { width: windowWidth } = useWindowSize();
  const isLessonEnded = useSelector(selectLessonEnd);
  return (
    <div className={`${parentDivClasses.join(' ')} ${currentTheme}`}>
      {previewMode && <PreviewTools model={content?.model} />}
      <div className="mainView" role="main" style={{ width: windowWidth }}>
        <LayoutView pageTitle={pageTitle} previewMode={previewMode} pageContent={content} />
      </div>
      {restartLesson && !reviewMode ? (
        <RestartLessonDialog onRestart={setInitialPageState} />
      ) : null}
      {isLessonEnded && !reviewMode ? (
        <LessonFinishedDialog
          imageUrl={dialogImageUrl}
          message={dialogMessage}
          hideCloseButton={!fullscreen}
        />
      ) : null}
      <DeadlineTimer deadline={localDeadline} lateSubmit={lateSubmit} overviewURL={overviewURL} />
      {screenIdleTimeOutTriggered ? (
        <ScreenIdleTimeOutDialog remainingTime={5} signoutUrl={signoutUrl} />
      ) : null}
    </div>
  );
};

export default Delivery;
