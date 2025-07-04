import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { Accordion, Dropdown, ListGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { saveActivity } from 'apps/authoring/store/activities/actions/saveActivity';
import { setCurrentPartPropertyFocus } from 'apps/authoring/store/parts/slice';
import { clone } from 'utils/common';
import guid from 'utils/guid';
import { useToggle } from '../../../../components/hooks/useToggle';
import { createNew as createNewActivity } from '../../../authoring/store/activities/actions/createNew';
import {
  selectBottomLeftPanel,
  setCurrentRule,
  setLeftPanelState,
  setRightPanelActiveTab,
} from '../../../authoring/store/app/slice';
import {
  selectAllActivities,
  selectCurrentActivity,
  upsertActivity,
} from '../../../delivery/store/features/activities/slice';
import {
  SequenceEntry,
  SequenceEntryChild,
  SequenceEntryType,
  SequenceHierarchyItem,
  findInHierarchy,
  flattenHierarchy,
  getHierarchy,
  getSequenceLineage,
} from '../../../delivery/store/features/groups/actions/sequence';
import {
  selectCurrentSequenceId,
  selectSequence,
} from '../../../delivery/store/features/groups/selectors/deck';
import { selectCurrentGroup, upsertGroup } from '../../../delivery/store/features/groups/slice';
import { addSequenceItem } from '../../store/groups/layouts/deck/actions/addSequenceItem';
import { setCurrentActivityFromSequence } from '../../store/groups/layouts/deck/actions/setCurrentActivityFromSequence';
import { savePage } from '../../store/page/actions/savePage';
import ContextAwareToggle from '../Accordion/ContextAwareToggle';
import ConfirmDelete from '../Modal/DeleteConfirmationModal';
import { RightPanelTabs } from '../RightMenu/RightMenu';

const SequenceEditor: React.FC<any> = (props: any) => {
  const dispatch = useDispatch();
  const currentSequenceId = useSelector(selectCurrentSequenceId);
  const sequence = useSelector(selectSequence);
  const currentGroup = useSelector(selectCurrentGroup);
  const currentActivity = useSelector(selectCurrentActivity);
  const allActivities = useSelector(selectAllActivities);
  const hierarchy = useMemo(() => getHierarchy(sequence), [sequence]);
  const [open, toggleOpen] = useToggle(true);
  const [itemToRename, setItemToRename] = useState<any>(undefined);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<any>(undefined);
  const bottomLeftPanel = useSelector(selectBottomLeftPanel);
  const layerLabel = 'Layer';
  const bankLabel = 'Question Bank';
  const screenLabel = 'Screen';
  const ref = useRef<HTMLDivElement>(null);
  const refSequence = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (props.menuItemClicked) {
      const { event, item, parentItem, isLayer, isBank, direction } = props.menuItemClicked;
      switch (event) {
        case 'handleItemAdd':
          handleItemAdd(parentItem, isLayer, isBank);
          break;
        case 'handleItemReorder':
          handleItemReorder(null, item, direction);
          break;
        case 'handleItemDelete':
          setShowConfirmDelete(true);
          setItemToDelete(item);
          break;
        case 'handleItemConvert':
          handleItemConvert(item);
          break;
        case 'handleItemClone':
          handleItemClone(item);
          break;
        case 'setItemToRename':
          dispatch(setCurrentPartPropertyFocus({ focus: false }));
          setItemToRename(item);
          break;
        default:
          break;
      }
    }
  }, [props.menuItemClicked]);

  const handleItemClick = (e: any, entry: SequenceEntry<SequenceEntryChild>) => {
    e.stopPropagation();
    dispatch(setCurrentPartPropertyFocus({ focus: false }));
    dispatch(setCurrentActivityFromSequence(entry.custom.sequenceId));
    dispatch(
      setRightPanelActiveTab({
        _rightPanelActiveTab: RightPanelTabs.SCREEN,
        get rightPanelActiveTab() {
          return this._rightPanelActiveTab;
        },
        set rightPanelActiveTab(value) {
          this._rightPanelActiveTab = value;
        },
      }),
    );
    sequenceItemToggleClick();
  };

  const addNewSequence = async (newSequenceEntry: any, siblingId: any) => {
    await dispatch(
      addSequenceItem({
        sequence: sequence,
        item: newSequenceEntry,
        group: currentGroup,
        siblingId: siblingId,
        // parentId: TODO attach parentId if it exists
      }),
    );

    dispatch(setCurrentActivityFromSequence(newSequenceEntry.custom.sequenceId));

    // will write the current groups
    await dispatch(savePage({ undoable: false }));
  };
  const handleItemAdd = async (
    parentItem: SequenceEntry<SequenceEntryChild> | undefined,
    isLayer = false,
    isBank = false,
  ) => {
    let layerRef: string | undefined;
    if (parentItem) {
      layerRef = parentItem.custom.sequenceId;
    }
    const newSeqType = isLayer ? layerLabel : isBank ? bankLabel : screenLabel;
    const newTitle = `New ${layerRef ? 'Child' : ''}${newSeqType}`;

    const { payload: newActivity } = await dispatch<any>(
      createNewActivity({
        title: newTitle,
      }),
    );

    const newSequenceEntry: any = {
      type: 'activity-reference',
      resourceId: newActivity.resourceId,
      activitySlug: newActivity.activitySlug,
      custom: {
        isLayer,
        isBank,
        layerRef,
        sequenceId: `${newActivity.activitySlug}_${guid()}`,
        sequenceName: newTitle,
      },
    };

    if (isBank) {
      newSequenceEntry.custom.bankEndTarget = 'next';
      newSequenceEntry.custom.bankShowCount = 3;
    }

    // maybe should set in the create?
    const reduxActivity = {
      id: newActivity.resourceId,
      resourceId: newActivity.resourceId,
      activitySlug: newActivity.activitySlug,
      activityType: newActivity.activityType,
      content: { ...newActivity.model, authoring: undefined },
      authoring: newActivity.model.authoring,
      title: newTitle,
      tags: [],
    };
    dispatch(saveActivity({ activity: reduxActivity, undoable: false, immediate: true }));
    await dispatch(upsertActivity({ activity: reduxActivity }));
    addNewSequence(newSequenceEntry, currentActivity?.activitySlug);
  };

  enum ReorderDirection {
    UP = 0,
    DOWN,
    IN,
    OUT,
  }
  const handleItemReorder = async (
    event: any,
    item: SequenceHierarchyItem<SequenceEntryType>,
    direction: ReorderDirection,
  ) => {
    let hierarchyCopy = clone(hierarchy);
    const parentId = item.custom.layerRef || null;

    const parent = parentId ? findInHierarchy(hierarchyCopy, parentId) : null;
    const siblings = parent ? parent.children : hierarchyCopy;
    const itemIndex = siblings.findIndex(
      (child: SequenceHierarchyItem<SequenceEntryType>) =>
        child.custom.sequenceId === item.custom.sequenceId,
    );

    let newIndex = itemIndex;
    switch (direction) {
      case ReorderDirection.UP:
        newIndex = Math.max(0, itemIndex - 1);
        break;
      case ReorderDirection.DOWN:
        newIndex = Math.min(siblings.length - 1, itemIndex + 1);
        break;
      case ReorderDirection.IN: {
        const siblingAbove = siblings[itemIndex - 1];
        if (!siblingAbove) return;
        hierarchyCopy = moveItemInHierarchy(
          hierarchy,
          item.custom.sequenceId,
          siblingAbove.custom.sequenceId,
          siblingAbove.children.length,
        );
        const newSequence = flattenHierarchy(hierarchyCopy);
        const newGroup = { ...currentGroup, children: newSequence };
        dispatch(upsertGroup({ group: newGroup }));
        await dispatch(savePage({ undoable: false }));
        return;
      }
      case ReorderDirection.OUT: {
        if (!parent) return;
        const grandparentId = parent.custom.layerRef || null;
        const grandparent = grandparentId ? findInHierarchy(hierarchyCopy, grandparentId) : null;
        const targetIndex = grandparent
          ? grandparent.children.findIndex(
              (c) => c.custom.sequenceId === parent.custom.sequenceId,
            ) + 1
          : hierarchyCopy.findIndex((c: any) => c.custom.sequenceId === parent.custom.sequenceId) +
            1;

        hierarchyCopy = moveItemInHierarchy(
          hierarchy,
          item.custom.sequenceId,
          grandparentId,
          targetIndex,
        );
        const newSequence = flattenHierarchy(hierarchyCopy);
        const newGroup = { ...currentGroup, children: newSequence };
        dispatch(upsertGroup({ group: newGroup }));
        await dispatch(savePage({ undoable: false }));
        return;
      }
      default:
        return;
    }

    if (newIndex !== itemIndex) {
      const moved = clone(siblings[itemIndex]);
      siblings.splice(itemIndex, 1);
      siblings.splice(newIndex, 0, moved);
    }

    const newSequence = flattenHierarchy(hierarchyCopy);
    const newGroup = { ...currentGroup, children: newSequence };
    dispatch(upsertGroup({ group: newGroup }));
    await dispatch(savePage({ undoable: false }));
  };

  const handleItemDelete = async (item: SequenceHierarchyItem<SequenceEntryType>) => {
    const flatten = (parent: SequenceHierarchyItem<SequenceEntryType>) => {
      const list = [{ ...parent, children: undefined }];
      parent.children.forEach((child) => {
        list.push(...flatten(child));
      });
      return list;
    };
    const itemsToDelete = flatten(item);
    const sequenceItems = [...sequence];
    itemsToDelete.forEach((item: SequenceEntry<SequenceEntryChild>) => {
      if (item.activitySlug === currentActivity?.activitySlug)
        dispatch(setCurrentRule({ currentRule: undefined }));
      const itemIndex = sequenceItems.findIndex(
        (entry) => entry.custom.sequenceId === item.custom.sequenceId,
      );
      if (itemIndex < 0) {
        console.warn('not found in sequence', item);
        return;
      }
      sequenceItems.splice(itemIndex, 1);
    });
    const newGroup = { ...currentGroup, children: sequenceItems };
    dispatch(upsertGroup({ group: newGroup }));
    await dispatch(savePage({ undoable: false }));
    setShowConfirmDelete(false);
    setItemToDelete(undefined);
  };

  const handleItemConvert = async (item: SequenceHierarchyItem<SequenceEntryType>) => {
    const hierarchyCopy = clone(hierarchy);
    const itemInHierarchy = findInHierarchy(hierarchyCopy, item.custom.sequenceId);
    if (itemInHierarchy === undefined) {
      return console.warn('item not converted', item);
    }
    const isLayer = !!itemInHierarchy?.custom.isLayer || false;
    itemInHierarchy.custom.isLayer = !isLayer;
    const newSequence = flattenHierarchy(hierarchyCopy);
    const newGroup = { ...currentGroup, children: newSequence };
    dispatch(upsertGroup({ group: newGroup }));
    await dispatch(savePage({ undoable: false }));
  };

  const handleItemClone = async (item: SequenceHierarchyItem<SequenceEntryType>) => {
    const newTitle = `Copy of ${item.custom.sequenceName}`;
    const { payload: newActivity } = await dispatch<any>(
      createNewActivity({
        title: newTitle,
      }),
    );

    const newSequenceEntry: any = {
      type: 'activity-reference',
      resourceId: newActivity.resourceId,
      activitySlug: newActivity.activitySlug,
      custom: {
        ...item.custom,
        sequenceId: `${newActivity.activitySlug}_${guid()}`,
        sequenceName: newTitle,
      },
    };

    const selectedActivity = allActivities.find((act) => act.id === item.resourceId);
    const copiedActivity = clone(selectedActivity);
    copiedActivity.id = newActivity.resourceId;
    copiedActivity.resourceId = newActivity.resourceId;
    copiedActivity.activitySlug = newActivity.activitySlug;
    copiedActivity.title = newTitle;
    dispatch(saveActivity({ activity: copiedActivity, undoable: false, immediate: true }));
    await dispatch(upsertActivity({ activity: copiedActivity }));
    addNewSequence(newSequenceEntry, item.activitySlug);
  };
  const handleRenameItem = async (item: any) => {
    if (itemToRename.custom.sequenceName.trim() === '') {
      setItemToRename(undefined);
      return;
    }
    if (itemToRename.custom.sequenceName === item.custom.sequenceName) {
      setItemToRename(undefined);
      return;
    }
    const hierarchyClone = clone(hierarchy);
    const activityClone = clone(currentActivity);
    const itemInHierarchy = findInHierarchy(hierarchyClone, item.custom.sequenceId);
    if (itemInHierarchy === undefined || activityClone === undefined) {
      return console.warn('item not renamed', item);
    }
    itemInHierarchy.custom.sequenceName = itemToRename.custom.sequenceName;
    activityClone.title = itemToRename.custom.sequenceName;
    const newSequence = flattenHierarchy(hierarchyClone);
    const newGroup = { ...currentGroup, children: newSequence };
    dispatch(upsertGroup({ group: newGroup }));
    await dispatch(upsertActivity({ activity: activityClone }));
    await dispatch(savePage({ undoable: false }));
    setItemToRename(undefined);
  };

  const inputToFocus = useRef<HTMLInputElement>(null);

  const sequenceItemToggleClick = () => {
    setTimeout(() => {
      const scrollHeight = ref.current?.scrollHeight || 0;
      const sequenceClientHeight = refSequence?.current?.clientHeight || 0;
      dispatch(
        setLeftPanelState({
          sequenceEditorHeight: ref?.current?.clientHeight
            ? ref?.current?.clientHeight + 150
            : ref?.current?.clientHeight,
          sequenceEditorExpanded: scrollHeight < sequenceClientHeight ? true : false,
        }),
      );
    }, 1000);
  };
  useEffect(() => {
    if (!itemToRename) return;
    inputToFocus.current?.focus();
  }, [itemToRename]);

  const SequenceItemContextMenu = (props: any) => {
    const { id } = props;
    return (
      <>
        {currentGroup && (
          <Dropdown
            onClick={(e: React.MouseEvent) => {
              (e as any).isContextButtonClick = true;
              props.contextMenuClicked(true, props);
            }}
          >
            <Dropdown.Toggle
              id={`sequence-item-${id}-context-trigger`}
              className="dropdown-toggle aa-context-menu-trigger btn btn-link p-0 px-1"
              variant="link"
            >
              <i className="fas fa-ellipsis-v" />
            </Dropdown.Toggle>
          </Dropdown>
        )}
      </>
    );
  };

  useEffect(() => {
    // make sure that menus are expanded when the sequenceId is selected by any means
    if (!currentSequenceId) {
      return;
    }
    const lineage = getSequenceLineage(sequence, currentSequenceId);
    /* console.log('lineage', lineage); */
    // last one is the current sequence
    lineage.pop();
    lineage.reverse().forEach((item) => {
      const eventName = `toggle_${item.custom.sequenceId}`;
      document.dispatchEvent(new CustomEvent(eventName, { detail: 'expand' }));
    });
  }, [currentSequenceId, sequence]);

  const moveItemInHierarchy = (
    hierarchy: SequenceHierarchyItem<SequenceEntryType>[],
    itemId: string,
    targetParentId: string | null,
    targetIndex: number,
  ): SequenceHierarchyItem<SequenceEntryType>[] => {
    const hierarchyCopy = clone(hierarchy);
    let itemToMove: SequenceHierarchyItem<SequenceEntryType> | null = null;

    // Remove the item from current position
    const removeItem = (items: any[], parentId: string | null): any => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.custom.sequenceId === itemId) {
          itemToMove = clone(item);
          items.splice(i, 1);
          return true;
        } else if (item.children?.length) {
          if (removeItem(item.children, item.custom.sequenceId)) return true;
        }
      }
      return false;
    };

    const insertItem = (items: any[], parentId: string | null, index: number) => {
      if (!itemToMove) return;

      if (!parentId) {
        itemToMove.custom.layerRef = '';
        items.splice(index, 0, itemToMove);
        return;
      }

      const parent = findInHierarchy(items, parentId);
      if (!parent) {
        console.warn('Target parent not found:', parentId);
        return;
      }

      itemToMove.custom.layerRef = parent.custom.sequenceId;
      parent.children.splice(index, 0, itemToMove);
    };

    removeItem(hierarchyCopy, null);
    insertItem(hierarchyCopy, targetParentId, targetIndex);

    return hierarchyCopy;
  };

  const onDragEnd = async (result: any) => {
    const { destination, draggableId } = result;

    if (!destination) return;

    const targetParentId = destination.droppableId === 'root' ? null : destination.droppableId;
    const newHierarchy = moveItemInHierarchy(
      hierarchy,
      draggableId,
      targetParentId,
      destination.index,
    );

    const newSequence = flattenHierarchy(newHierarchy);
    const newGroup = { ...currentGroup, children: newSequence };

    dispatch(upsertGroup({ group: newGroup }));
    await dispatch(savePage({ undoable: false }));
  };

  const getHierarchyList = (
    items: SequenceHierarchyItem<SequenceEntryType>[],
    isParentQB = false,
    droppableId = 'root',
  ) =>
    items.map((item, index, arr) => {
      const title = item.custom?.sequenceName || item.activitySlug;
      const hasChildren = item.children.length > 0;
      const sequenceId = item.custom.sequenceId;

      return (
        <Draggable key={sequenceId} draggableId={sequenceId} index={index}>
          {(provided, snapshot) => (
            <Accordion
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              <ListGroup.Item
                as="li"
                className={`aa-sequence-item${hasChildren ? ' is-parent' : ''} ${
                  snapshot.isDragging ? 'is-dragging' : ''
                }`}
                active={sequenceId === currentSequenceId}
                onClick={(e) => {
                  !(e as any).isContextButtonClick && handleItemClick(e, item);
                  props.contextMenuClicked((e as any).isContextButtonClick);
                }}
                tabIndex={0}
              >
                <div className="aa-sequence-details-wrapper">
                  <div className="details">
                    {hasChildren && (
                      <ContextAwareToggle
                        eventKey={`toggle_${sequenceId}`}
                        className="aa-sequence-item-toggle"
                        callback={sequenceItemToggleClick}
                      />
                    )}

                    {!itemToRename ? (
                      <span className="title" title={sequenceId}>
                        {title}
                      </span>
                    ) : itemToRename.custom.sequenceId !== sequenceId ? (
                      <span className="title">{title}</span>
                    ) : null}

                    {itemToRename?.custom.sequenceId === sequenceId && (
                      <input
                        ref={inputToFocus}
                        className="form-control form-control-sm rename-sequence-input"
                        type="text"
                        placeholder={item.custom.isLayer ? 'Layer name' : 'Screen name'}
                        value={itemToRename.custom.sequenceName}
                        onClick={(e) => e.preventDefault()}
                        onChange={(e) =>
                          setItemToRename({
                            ...itemToRename,
                            custom: { ...itemToRename.custom, sequenceName: e.target.value },
                          })
                        }
                        onFocus={(e) => {
                          e.target.select();
                          dispatch(setCurrentPartPropertyFocus({ focus: false }));
                        }}
                        onBlur={() => {
                          handleRenameItem(item);
                          dispatch(setCurrentPartPropertyFocus({ focus: true }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameItem(item);
                          if (e.key === 'Escape') setItemToRename(undefined);
                        }}
                      />
                    )}

                    {item.custom.isLayer && (
                      <i className="fas fa-layer-group ml-2 align-middle aa-isLayer" />
                    )}
                    {item.custom.isBank && (
                      <i className="fas fa-cubes ml-2 align-middle aa-isLayer" />
                    )}
                  </div>

                  <SequenceItemContextMenu
                    id={item.activitySlug}
                    item={item}
                    index={index}
                    arr={arr}
                    isParentQB={isParentQB}
                    contextMenuClicked={props.contextMenuClicked}
                  />
                </div>

                {/* Nested droppable if children exist */}
                {hasChildren && (
                  <Accordion.Collapse eventKey={`toggle_${sequenceId}`}>
                    <Droppable droppableId={sequenceId} type="CHILD">
                      {(provided) => (
                        <ListGroup
                          as="ol"
                          className="aa-sequence nested"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          {getHierarchyList(item.children, item.custom.isBank, sequenceId)}
                          {provided.placeholder}
                        </ListGroup>
                      )}
                    </Droppable>
                  </Accordion.Collapse>
                )}
              </ListGroup.Item>
            </Accordion>
          )}
        </Draggable>
      );
    });

  return (
    <Accordion
      className="aa-sequence-editor"
      ref={ref}
      defaultActiveKey="0"
      activeKey={open ? '0' : '-1'}
      style={{
        height: !bottomLeftPanel && open ? 'calc(100vh - 100px)' : 'auto',
        maxHeight: !bottomLeftPanel && open ? 'calc(100vh - 100px)' : '60vh',
        overflow: 'hidden',
      }}
    >
      <div className="aa-panel-section-title-bar">
        <div className="d-flex align-items-center">
          <ContextAwareToggle eventKey="0" onClick={toggleOpen} />
          <span className="title">Sequence Editor</span>
        </div>
        <OverlayTrigger
          placement="right"
          delay={{ show: 150, hide: 150 }}
          overlay={
            <Tooltip id="button-tooltip" style={{ fontSize: '12px' }}>
              New Sequence
            </Tooltip>
          }
        >
          <Dropdown>
            <Dropdown.Toggle variant="link" id="sequence-add">
              <i className="fa fa-plus" />
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item
                onClick={() => {
                  handleItemAdd(undefined);
                }}
              >
                <i className="fas fa-desktop mr-2" /> Screen
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => {
                  handleItemAdd(undefined, true);
                }}
              >
                <i className="fas fa-layer-group mr-2" /> Layer
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => {
                  handleItemAdd(undefined, false, true);
                }}
              >
                <i className="fas fa-cubes mr-2" /> Question Bank
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </OverlayTrigger>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="root">
          {(provided) => (
            <Accordion.Collapse
              eventKey="0"
              style={{
                overflowY: 'auto',
                maxHeight: !bottomLeftPanel && open ? 'calc(100vh - 100px)' : '55vh',
              }}
            >
              <ListGroup
                as="ol"
                className="aa-sequence"
                ref={(el) => {
                  provided.innerRef(el);
                  (refSequence as React.MutableRefObject<any>).current = el;
                }}
                {...provided.droppableProps}
              >
                {getHierarchyList(hierarchy)}
                {provided.placeholder}
              </ListGroup>
            </Accordion.Collapse>
          )}
        </Droppable>
      </DragDropContext>
      {showConfirmDelete && (
        <ConfirmDelete
          show={showConfirmDelete}
          elementType={
            itemToDelete.custom?.isLayer
              ? 'Layer'
              : itemToDelete.custom?.isBank
              ? 'Question Bank'
              : 'Screen'
          }
          elementName={itemToDelete.custom?.sequenceName}
          deleteHandler={() => handleItemDelete(itemToDelete)}
          cancelHandler={() => {
            setShowConfirmDelete(false);
            setItemToDelete(undefined);
          }}
        />
      )}
    </Accordion>
  );
};

export default SequenceEditor;
