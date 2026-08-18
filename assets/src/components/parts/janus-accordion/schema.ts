import { JSONSchema7Object } from 'json-schema';
import { CapiVariableTypes } from '../../../adaptivity/capi';
import { MarkupTree } from '../janus-text-flow/TextFlow';
import { JanusAbsolutePositioned, JanusCustomCss } from '../types/parts';

export const DEFAULT_ACCORDION_THEME = '#0070F3';
export const DEFAULT_ACCORDION_HEIGHT = 240;
export const DEFAULT_ACCORDION_WIDTH = 480;
export const MIN_ACCORDION_SECTIONS = 1;
export const MAX_ACCORDION_SECTIONS = 10;

export interface AccordionSection {
  id: string;
  title: string;
  nodes: MarkupTree[];
}

export interface AccordionModel extends JanusAbsolutePositioned, JanusCustomCss {
  enabled: boolean;
  themeColor: string;
  sections: AccordionSection[];
  customCss?: string;
}

export const plainTextToDefaultNodes = (text: string): MarkupTree[] => [
  {
    tag: 'p',
    style: {},
    children: [
      {
        tag: 'span',
        style: { backgroundColor: 'transparent', color: 'inherit', fontSize: '16px' },
        children: [{ tag: 'text', text: text || ' ', children: [] }],
      },
    ],
  },
];

export const clampSectionCount = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return MIN_ACCORDION_SECTIONS;
  }
  return Math.min(MAX_ACCORDION_SECTIONS, Math.max(MIN_ACCORDION_SECTIONS, Math.round(n)));
};

export const createDefaultSection = (index: number, id?: string): AccordionSection => ({
  id: id || `accordion-section-${index}`,
  title: `Section ${index}`,
  nodes: plainTextToDefaultNodes(''),
});

const sectionsField: JSONSchema7Object = {
  sections: {
    title: 'Sections',
    type: 'array',
    minItems: MIN_ACCORDION_SECTIONS,
    maxItems: MAX_ACCORDION_SECTIONS,
    description: 'Accordion sections (1 to 10). Each section has a title and rich text content.',
    items: { type: 'object' },
  },
};

export const schema: JSONSchema7Object = {
  ...sectionsField,
  themeColor: {
    title: 'Theme Color',
    type: 'string',
    description: 'Hex color used for the accordion accent (e.g. #0070F3)',
    default: DEFAULT_ACCORDION_THEME,
  },
  enabled: {
    title: 'Enabled',
    type: 'boolean',
    description: 'specifies whether the learner can expand and collapse sections',
    default: true,
  },
  customCssClass: {
    title: 'Custom CSS Class',
    type: 'string',
  },
  customCss: {
    title: 'Custom CSS',
    type: 'string',
    description: 'Custom CSS or an @import url(...) for an external stylesheet',
    default: '',
  },
};

export const simpleSchema: JSONSchema7Object = {
  ...sectionsField,
  themeColor: {
    title: 'Theme Color',
    type: 'string',
    description: 'Hex color used for the accordion accent (e.g. #0070F3)',
    default: DEFAULT_ACCORDION_THEME,
  },
  enabled: {
    title: 'Enabled',
    type: 'boolean',
    default: true,
  },
  customCss: {
    title: 'Custom CSS',
    type: 'string',
    default: '',
  },
};

const sectionsUi = {
  sections: { 'ui:widget': 'AccordionSectionsEditor' },
};

export const uiSchema = {
  'ui:order': ['sections', 'themeColor', 'enabled', 'customCssClass', 'customCss'],
  ...sectionsUi,
  themeColor: {
    'ui:widget': 'ColorPicker',
  },
  customCss: {
    'ui:widget': 'textarea',
    'ui:options': {
      rows: 4,
    },
  },
};

export const simpleUiSchema = {
  'ui:order': ['sections', 'themeColor', 'enabled', 'customCss'],
  ...sectionsUi,
  themeColor: {
    'ui:widget': 'ColorPicker',
  },
  customCss: {
    'ui:widget': 'textarea',
    'ui:options': {
      rows: 4,
    },
  },
};

export const adaptivitySchema = {
  userOpened: CapiVariableTypes.BOOLEAN,
  openedSectionsCount: CapiVariableTypes.NUMBER,
  expandedSections: CapiVariableTypes.ARRAY,
  enabled: CapiVariableTypes.BOOLEAN,
};

export const getCapabilities = () => ({
  configure: false,
});

export const createSchema = (): Partial<AccordionModel> => ({
  enabled: true,
  customCssClass: '',
  themeColor: DEFAULT_ACCORDION_THEME,
  customCss: '',
  width: DEFAULT_ACCORDION_WIDTH,
  height: DEFAULT_ACCORDION_HEIGHT,
  sections: [createDefaultSection(1), createDefaultSection(2)],
});
