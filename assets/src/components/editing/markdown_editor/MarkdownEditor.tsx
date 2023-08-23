import React, { FocusEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import '@uiw/react-markdown-preview/markdown.css';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { debounce } from 'lodash';
import { Descendant } from 'slate';
import { NormalizerContext } from '../editor/normalizers/normalizer';
import { CommandContext } from '../elements/commands/interfaces';
import { contentMarkdownDeserializer } from './content_markdown_deserializer';
import { serializeMarkdown } from './content_markdown_serializer';

interface MarkdownEditorProps {
  onEdit: (value: Descendant[], _editor: any, _operations: any[]) => void;
  // The content to display
  value: Descendant[];
  // Whether or not editing is allowed
  editMode: boolean;
  fixedToolbar?: boolean;
  commandContext: CommandContext;
  normalizerContext?: NormalizerContext;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  onPaste?: React.ClipboardEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  onFocus?: FocusEventHandler | undefined;
  onBlur?: FocusEventHandler | undefined;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = (props) => {
  const [value, setValue] = useState<string | undefined>(() =>
    contentMarkdownDeserializer(props.value),
  );

  const darkMode: boolean = useMemo(() => {
    return document.documentElement.classList.contains('dark');
  }, []);
  const { onEdit } = props;
  const modeClass = darkMode ? 'dark' : 'light';

  const saveChanges = useCallback(
    (newValue: string) => {
      const content = serializeMarkdown(newValue);
      onEdit(content as Descendant[], null, []);
    },
    [onEdit],
  );

  const onChange = useCallback(
    (newValue: string | undefined) => {
      console.info('onchange');
      setValue(newValue || '');
      saveChanges(newValue || '');
    },
    [saveChanges],
  );

  const onBlur = useCallback(() => {
    console.info('onblur');
    saveChanges(value || '');
  }, [value, saveChanges]);

  return (
    <div data-color-mode={modeClass}>
      <MDEditor
        value={value}
        onChange={onChange}
        height={600}
        data-color-mode={modeClass}
        onBlur={onBlur}
        preview="edit"
      />
    </div>
  );
};
