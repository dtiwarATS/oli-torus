import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { setCurrentPartPropertyFocus } from 'apps/authoring/store/parts/slice';
import guid from 'utils/guid';
import { useToggle } from '../../../../../components/hooks/useToggle';
import { getSectionPreviewText } from '../../../../../components/parts/janus-accordion/accordion-util';
import {
  AccordionSection,
  MAX_ACCORDION_SECTIONS,
  MIN_ACCORDION_SECTIONS,
  createDefaultSection,
} from '../../../../../components/parts/janus-accordion/schema';
import { QuillEditor } from '../../../../../components/parts/janus-text-flow/QuillEditor';
import { AdvancedAuthoringModal } from '../../AdvancedAuthoringModal';
import { ScreenDeleteIcon } from '../../Flowchart/chart-components/ScreenDeleteIcon';
import { ScreenEditIcon } from '../../Flowchart/chart-components/ScreenEditIcon';

interface Props {
  id: string;
  value: AccordionSection[];
  onChange: (value: AccordionSection[]) => void;
  onBlur: (id: string, value: AccordionSection[]) => void;
}

const commit = (
  id: string,
  next: AccordionSection[],
  onChange: (value: AccordionSection[]) => void,
  onBlur: (id: string, value: AccordionSection[]) => void,
) => {
  onChange(next);
  setTimeout(() => onBlur(id, next), 0);
};

export const AccordionSectionsEditor: React.FC<Props> = ({ id, value, onChange, onBlur }) => {
  const sections = Array.isArray(value) ? value : [];

  const editEntry = useCallback(
    (index: number) => (modified: AccordionSection) => {
      commit(
        id,
        sections.map((section, i) => (i === index ? modified : section)),
        onChange,
        onBlur,
      );
    },
    [id, onBlur, onChange, sections],
  );

  const deleteEntry = useCallback(
    (index: number) => () => {
      if (sections.length <= MIN_ACCORDION_SECTIONS) {
        return;
      }
      commit(
        id,
        sections.filter((_section, i) => i !== index),
        onChange,
        onBlur,
      );
    },
    [id, onBlur, onChange, sections],
  );

  const onAddSection = useCallback(() => {
    if (sections.length >= MAX_ACCORDION_SECTIONS) {
      return;
    }
    const nextIndex = sections.length + 1;
    const next = [
      ...sections,
      { ...createDefaultSection(nextIndex, `accordion-section-${guid()}`) },
    ];
    commit(id, next, onChange, onBlur);
  }, [id, onBlur, onChange, sections]);

  return (
    <div>
      <label className="form-label">Sections</label>
      <div>
        {sections.map((section, index) => (
          <SectionEditor
            key={section.id || index}
            index={index}
            value={section}
            canDelete={sections.length > MIN_ACCORDION_SECTIONS}
            onChange={editEntry(index)}
            onDelete={deleteEntry(index)}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onAddSection}
        disabled={sections.length >= MAX_ACCORDION_SECTIONS}
      >
        + Add Section
      </button>
    </div>
  );
};

const SectionEditor: React.FC<{
  index: number;
  value: AccordionSection;
  canDelete: boolean;
  onChange: (value: AccordionSection) => void;
  onDelete: () => void;
}> = ({ index, value, canDelete, onChange, onDelete }) => {
  const [editorOpen, , openEditor, closeEditor] = useToggle(false);
  const [tempValue, setTempValue] = useState<{ value: AccordionSection['nodes'] }>({ value: [] });
  const [title, setTitle] = useState(value.title || '');
  const dispatch = useDispatch();
  const preview = getSectionPreviewText(value.nodes);

  useEffect(() => {
    setTitle(value.title || '');
  }, [value.title]);

  const onSave = useCallback(() => {
    closeEditor();
    onChange({
      ...value,
      title,
      nodes: tempValue.value,
    });
    dispatch(setCurrentPartPropertyFocus({ focus: true }));
  }, [closeEditor, dispatch, onChange, tempValue.value, title, value]);

  const onEdit = useCallback(() => {
    openEditor();
    setTempValue({ value: value.nodes || [] });
    dispatch(setCurrentPartPropertyFocus({ focus: false }));
  }, [dispatch, openEditor, value.nodes]);

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center">
        <input
          className="form-control form-control-sm mr-1"
          aria-label={`Section ${index + 1} title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title !== (value.title || '')) {
              onChange({ ...value, title });
            }
          }}
        />
        <button
          type="button"
          className="btn btn-link p-0 mr-1"
          onClick={onEdit}
          title="Edit content"
        >
          <ScreenEditIcon />
        </button>
        <button
          type="button"
          className="btn btn-link p-0"
          onClick={onDelete}
          title="Delete section"
          disabled={!canDelete}
        >
          <ScreenDeleteIcon />
        </button>
      </div>
      {preview ? (
        <div className="text-muted small text-truncate" title={preview}>
          {preview}
        </div>
      ) : null}
      {editorOpen && (
        <AdvancedAuthoringModal show={true}>
          <Modal.Header>
            <Modal.Title>Edit {value.title || `Section ${index + 1}`}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <QuillEditor
              tree={value.nodes}
              showimagecontrol={true}
              onChange={setTempValue}
              onSave={() => undefined}
              onCancel={() => undefined}
            />
          </Modal.Body>
          <Modal.Footer>
            <button type="button" onClick={onSave} className="btn btn-primary">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                closeEditor();
                dispatch(setCurrentPartPropertyFocus({ focus: true }));
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </Modal.Footer>
        </AdvancedAuthoringModal>
      )}
    </div>
  );
};
