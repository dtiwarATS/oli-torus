/* eslint-disable react/prop-types */
import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import { CapiVariableTypes } from '../../../adaptivity/capi';
import {
  NotificationType,
  subscribeToNotification,
} from '../../../apps/delivery/components/NotificationContext';
import { contexts } from '../../../types/applicationContext';
import { PartComponentProps } from '../types/parts';
import './Slider.scss';
import { SliderModel } from './schema';

export const tagName = 'janus-slider';

const Slider: React.FC<PartComponentProps<SliderModel>> = (props) => {
  const [_state, setState] = useState<unknown>([]);
  const [model, setModel] = useState<Partial<SliderModel>>({});
  const [ready, setReady] = useState<boolean>(false);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const id: string = props.id;
  const [isEnabled, setIsEnabled] = useState(true);
  const [_cssClass, setCssClass] = useState('');

  const initialize = useCallback(async (pModel) => {
    // set defaults
    const dEnabled = typeof pModel.enabled === 'boolean' ? pModel.enabled : isEnabled;
    setIsEnabled(dEnabled);

    const dCssClass = pModel.customCssClass || '';
    setCssClass(dCssClass);

    const initResult = await props.onInit({
      id,
      responses: [
        {
          key: 'enabled',
          type: CapiVariableTypes.BOOLEAN,
          value: dEnabled,
        },
        {
          key: 'customCssClass',
          type: CapiVariableTypes.STRING,
          value: dCssClass,
        },
        {
          key: 'flipped',
          type: CapiVariableTypes.BOOLEAN,
          value: flipped,
        },
        {
          key: 'userModified',
          type: CapiVariableTypes.BOOLEAN,
          value: false,
        },
      ],
    });

    // result of init has a state snapshot with latest (init state applied)
    const currentStateSnapshot = initResult.snapshot;
    const sEnabled = currentStateSnapshot[`stage.${id}.enabled`];
    if (sEnabled !== undefined) {
      setIsEnabled(sEnabled);
    }
    const sFlipped = currentStateSnapshot[`stage.${id}.flipped`];
    if (sFlipped !== undefined) {
      setFlipped(sFlipped);
    }
    const sCssClass = currentStateSnapshot[`stage.${id}.customCssClass`];
    if (sCssClass !== undefined) {
      setCssClass(sCssClass);
    }

    if (initResult.context.mode === contexts.REVIEW) {
      setIsEnabled(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let pModel;
    let pState;
    if (typeof props?.model === 'string') {
      try {
        pModel = JSON.parse(props.model);
        setModel(pModel);
      } catch (err) {
        // bad json, what do?
      }
    }
    if (typeof props?.state === 'string') {
      try {
        pState = JSON.parse(props.state);
        setState(pState);
      } catch (err) {
        // bad json, what do?
      }
    }
    if (!pModel) {
      return;
    }
    initialize(pModel);
  }, [props]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    props.onReady({ id, responses: [] });
  }, [ready]);

  useEffect(() => {
    if (!props.notify) {
      return;
    }
    const notificationsHandled = [
      NotificationType.CHECK_STARTED,
      NotificationType.CHECK_COMPLETE,
      NotificationType.CONTEXT_CHANGED,
      NotificationType.STATE_CHANGED,
    ];
    const notifications = notificationsHandled.map((notificationType: NotificationType) => {
      const handler = (payload: any) => {
        switch (notificationType) {
          case NotificationType.STATE_CHANGED:
            {
              const { mutateChanges: changes } = payload;
              const sEnabled = changes[`stage.${id}.enabled`];
              if (sEnabled !== undefined) {
                setIsEnabled(sEnabled);
              }
              const sFlipped = changes[`stage.${id}.flipped`];
              if (sFlipped !== undefined) {
                setFlipped(sFlipped);
              }
              const sCssClass = changes[`stage.${id}.customCssClass`];
              if (sCssClass !== undefined) {
                setCssClass(sCssClass);
              }
            }
            break;
          case NotificationType.CONTEXT_CHANGED:
            {
              const { initStateFacts: changes } = payload;
              const sEnabled = changes[`stage.${id}.enabled`];
              if (sEnabled !== undefined) {
                setIsEnabled(sEnabled);
              }
              const sFlipped = changes[`stage.${id}.flipped`];
              if (sFlipped !== undefined) {
                setFlipped(sFlipped);
              }
              const sCssClass = changes[`stage.${id}.customCssClass`];
              if (sCssClass !== undefined) {
                setCssClass(sCssClass);
              }
              if (payload.mode === contexts.REVIEW) {
                setIsEnabled(false);
              }
            }
            break;
        }
      };
      const unsub = subscribeToNotification(props.notify, notificationType, handler);
      return unsub;
    });
    return () => {
      notifications.forEach((unsub) => {
        unsub();
      });
    };
  }, [props.notify]);

  const {
    _x,
    _y,
    z,
    width,
    height,
    _customCssClass,
    label,
    frontText = "Front side of the card",
    backText = "Back side of the card",
    cards = [],
  } = model;

  // Get the current card
  const flashcards = cards.length > 0 ? cards : [{ id: '1', front: frontText, back: backText }];
  const currentCard = flashcards[currentCardIndex];

  const handlePrevCard = () => {
    if (!isEnabled) return;
    setCurrentCardIndex(prev => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextCard = () => {
    if (!isEnabled) return;
    setCurrentCardIndex(prev => (prev < flashcards.length - 1 ? prev + 1 : prev));
  };

  useEffect(() => {
    const styleChanges: any = {};
    if (width !== undefined) {
      styleChanges.width = { value: width as number };
    }
    if (height != undefined) {
      styleChanges.height = { value: height as number };
    }

    props.onResize({ id: `${id}`, settings: styleChanges });
  }, [width, height]);

  const cardStyles: CSSProperties = {
    width: '100%',
    height: '200px',
    perspective: '1000px',
    cursor: isEnabled ? 'pointer' : 'default',
  };

  const cardInnerStyles: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    transition: 'transform 0.6s',
    transformStyle: 'preserve-3d',
    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    zIndex: z,
  };

  const cardFaceStyles: CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  };

  const cardFrontStyles: CSSProperties = {
    ...cardFaceStyles,
    backgroundColor: '#f8f9fa',
    color: '#212529',
  };

  const cardBackStyles: CSSProperties = {
    ...cardFaceStyles,
    backgroundColor: '#e9ecef',
    color: '#212529',
    transform: 'rotateY(180deg)',
  };

  const handleFlip = () => {
    if (!isEnabled) return;

    const newFlipped = !flipped;
    setFlipped(newFlipped);

    props.onSave({
      id: `${id}`,
      responses: [
        {
          key: `flipped`,
          type: CapiVariableTypes.BOOLEAN,
          value: newFlipped,
        },
        {
          key: `userModified`,
          type: CapiVariableTypes.BOOLEAN,
          value: true,
        },
      ],
    });
  };

  return ready ? (
    <div data-janus-type={tagName} className="flashcard">
      {label && <div className="flashcard-label">{label}</div>}
      <div style={cardStyles} onClick={handleFlip}>
        <div style={cardInnerStyles}>
          <div style={cardFrontStyles}>
            <div>{currentCard?.front || frontText}</div>
          </div>
          <div style={cardBackStyles}>
            <div>{currentCard?.back || backText}</div>
          </div>
        </div>
      </div>

      {flashcards.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '10px'
        }}>
          <button
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0 || !isEnabled}
            style={{
              padding: '5px 10px',
              cursor: isEnabled ? 'pointer' : 'default',
              opacity: currentCardIndex === 0 || !isEnabled ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
          <button
            onClick={handleNextCard}
            disabled={currentCardIndex === flashcards.length - 1 || !isEnabled}
            style={{
              padding: '5px 10px',
              cursor: isEnabled ? 'pointer' : 'default',
              opacity: currentCardIndex === flashcards.length - 1 || !isEnabled ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  ) : null;
};

export default Slider;
