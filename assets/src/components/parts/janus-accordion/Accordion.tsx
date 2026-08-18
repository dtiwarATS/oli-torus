import React, { useCallback, useEffect, useRef, useState } from 'react';
import { parseBoolean } from 'utils/common';
import {
  NotificationType,
  subscribeToNotification,
} from '../../../apps/delivery/components/NotificationContext';
import { contexts } from '../../../types/applicationContext';
import { PartComponentProps } from '../types/parts';
import AccordionView, { tagName } from './AccordionView';
import {
  AccordionCapiState,
  buildResponses,
  parseAccordionModel,
  parseSectionIndexes,
  uniqueSortedIndexes,
} from './accordion-util';
import { AccordionModel } from './schema';

const Accordion: React.FC<PartComponentProps<AccordionModel>> = (props) => {
  const id: string = props.id;
  const [model, setModel] = useState<AccordionModel | null>(null);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [userOpened, setUserOpened] = useState(false);
  const [openedSections, setOpenedSections] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const saveState = useCallback(
    (next: AccordionCapiState) => {
      props.onSave({
        id: `${id}`,
        responses: buildResponses(next),
      });
    },
    [id, props],
  );

  const initialize = useCallback(async (pModel: AccordionModel) => {
    const dEnabled = typeof pModel.enabled === 'boolean' ? pModel.enabled : true;
    const sectionCount = pModel.sections.length;

    const initResult = await props.onInit({
      id,
      responses: buildResponses({
        enabled: dEnabled,
        userOpened: false,
        openedSections: [],
        expandedSections: [],
      }),
    });

    const snapshot = initResult.snapshot || {};
    let nextEnabled =
      snapshot[`stage.${id}.enabled`] !== undefined
        ? parseBoolean(snapshot[`stage.${id}.enabled`])
        : dEnabled;

    const nextExpanded = parseSectionIndexes(
      snapshot[`stage.${id}.expandedSections`],
      sectionCount,
    );
    const restoredOpened = parseSectionIndexes(
      snapshot[`stage.${id}.openedSections`],
      sectionCount,
    );
    const nextOpened = uniqueSortedIndexes([...restoredOpened, ...nextExpanded]);
    const nextUserOpened = parseBoolean(snapshot[`stage.${id}.userOpened`] ?? false);

    if (initResult.context?.mode === contexts.REVIEW) {
      nextEnabled = false;
    }

    setEnabled(nextEnabled);
    setExpandedSections(nextExpanded);
    setOpenedSections(nextOpened);
    setUserOpened(nextUserOpened);
    setReady(true);
  }, []);

  useEffect(() => {
    const normalized = parseAccordionModel(props.model);
    setModel(normalized);
    initialize(normalized);
  }, [props.model, initialize]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    props.onReady({ id, responses: [] });
  }, [ready]);

  const { width, height } = model || {};
  const isResponsive = width === '100%' || (typeof width === 'string' && width.includes('%'));

  useEffect(() => {
    if (!model) {
      return;
    }
    const styleChanges: Record<string, { value: number | string }> = {};
    if (width !== undefined) {
      styleChanges.width = { value: width as number };
    }
    if (height !== undefined) {
      styleChanges.height = { value: height as number };
    }
    if (Object.keys(styleChanges).length > 0) {
      props.onResize({ id: `${id}`, settings: styleChanges });
    }
  }, [width, height, id]);

  useEffect(() => {
    if (!ready || !isResponsive || !containerRef.current) {
      return;
    }
    const el = containerRef.current;
    const reportHeight = () => {
      const contentHeight = Math.ceil(el.getBoundingClientRect().height);
      props.onResize({
        id: `${id}`,
        settings: { height: { value: Math.max(model?.height ?? 0, contentHeight) } },
      });
    };
    reportHeight();
    const observer = new ResizeObserver(reportHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, isResponsive, id, model?.sections, expandedSections]);

  const applyStateChanges = useCallback(
    (changes: Record<string, any>) => {
      if (!model) {
        return;
      }
      const sectionCount = model.sections.length;
      const sEnabled = changes[`stage.${id}.enabled`];
      let nextEnabled = enabled;
      if (sEnabled !== undefined) {
        nextEnabled = parseBoolean(sEnabled);
        setEnabled(nextEnabled);
      }

      const sExpanded = changes[`stage.${id}.expandedSections`];
      if (sExpanded !== undefined) {
        const nextExpanded = parseSectionIndexes(sExpanded, sectionCount);
        const nextOpened = uniqueSortedIndexes([...openedSections, ...nextExpanded]);
        setExpandedSections(nextExpanded);
        setOpenedSections(nextOpened);
        saveState({
          enabled: nextEnabled,
          userOpened,
          openedSections: nextOpened,
          expandedSections: nextExpanded,
        });
      }
    },
    [id, model, enabled, openedSections, userOpened, saveState],
  );

  useEffect(() => {
    if (!props.notify) {
      return;
    }
    const notificationsHandled = [NotificationType.CONTEXT_CHANGED, NotificationType.STATE_CHANGED];
    const notifications = notificationsHandled.map((notificationType: NotificationType) => {
      const handler = (payload: any) => {
        switch (notificationType) {
          case NotificationType.STATE_CHANGED:
            applyStateChanges(payload.mutateChanges || {});
            break;
          case NotificationType.CONTEXT_CHANGED:
            applyStateChanges(payload.initStateFacts || {});
            if (payload.mode === contexts.REVIEW) {
              setEnabled(false);
            }
            break;
          default:
            break;
        }
      };
      return subscribeToNotification(props.notify, notificationType, handler);
    });
    return () => {
      notifications.forEach((unsub) => unsub());
    };
  }, [props.notify, applyStateChanges]);

  const handleToggle = useCallback(
    (sectionIndex: number) => {
      if (!enabled) {
        return;
      }
      const isOpen = expandedSections.includes(sectionIndex);
      const nextExpanded = isOpen
        ? expandedSections.filter((index) => index !== sectionIndex)
        : uniqueSortedIndexes([...expandedSections, sectionIndex]);
      const nextOpened = isOpen
        ? openedSections
        : uniqueSortedIndexes([...openedSections, sectionIndex]);
      const nextUserOpened = true;

      setExpandedSections(nextExpanded);
      setOpenedSections(nextOpened);
      setUserOpened(nextUserOpened);
      saveState({
        enabled,
        userOpened: nextUserOpened,
        openedSections: nextOpened,
        expandedSections: nextExpanded,
      });
    },
    [enabled, expandedSections, openedSections, saveState],
  );

  if (!ready || !model) {
    return null;
  }

  return (
    <AccordionView
      ref={containerRef}
      id={id}
      model={model}
      expandedSections={expandedSections}
      enabled={enabled}
      onToggle={handleToggle}
      className="janus-accordion-delivery"
    />
  );
};

export { tagName };
export default Accordion;
