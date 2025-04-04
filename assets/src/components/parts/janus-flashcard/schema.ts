import { JSONSchema7Object } from 'json-schema';
import { CapiVariableTypes } from '../../../adaptivity/capi';
import CustomFieldTemplate from '../../../apps/authoring/components/PropertyEditor/custom/CustomFieldTemplate';
import { JanusAbsolutePositioned, JanusCustomCss } from '../types/parts';

export interface FlashCardModel extends JanusAbsolutePositioned, JanusCustomCss {
  showLabel: boolean;
  label: string;
  showDataTip: boolean;
  showValueLabels: boolean;
  showTicks: boolean;
  invertScale: boolean;
  minimum: number;
  maximum: number;
  snapInterval: number;
  enabled: boolean;
  frontText?: string;
  backText?: string;
  cards?: Array<{
    id: string;
    front: string;
    back: string;
  }>;
}

export const schema: JSONSchema7Object = {
  src: {
    title: 'Source',
    type: 'string',
  },
  customCssClass: {
    title: 'Custom CSS Class',
    type: 'string',
  },
  triggerCheck: {
    title: 'Trigger Check',
    type: 'boolean',
    description: 'if set to true then once audio is played till end, it will fire a check event',
    default: false,
  },
  autoPlay: {
    title: 'Auto Play',
    type: 'boolean',
    description: 'if set to true then audio player will play automatically',
    default: false,
  },
  startTime: {
    title: 'Start time(secs)',
    type: 'number',
    description: 'specifies the start time of the audio',
    default: 0,
  },
  endTime: {
    title: 'End time(secs)',
    type: 'number',
    description: 'specifies the end time of the audio',
    default: 0,
  },
  enableReplay: {
    title: 'Enable Replay',
    type: 'boolean',
    description: "specifies whether user can replay the audio once it's played",
    default: true,
  },
  subtitles: {
    title: 'Subtitles',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        default: { type: 'boolean' },
        language: { type: 'string' },
        src: { type: 'string' },
      },
      required: ['src', 'language'],
    },
  },
};

export const simpleSchema: JSONSchema7Object = {
  src: {
    title: 'Source',
    type: 'string',
  },
  autoPlay: {
    title: 'Auto Play',
    type: 'boolean',
    description: 'if set to true then audio player will play automatically',
    default: false,
  },
  startTime: {
    title: 'Start time(secs)',
    type: 'number',
    description: 'specifies the start time of the audio',
    default: 0,
  },
  endTime: {
    title: 'End time(secs)',
    type: 'number',
    description: 'specifies the end time of the audio',
    default: 0,
  },
  enableReplay: {
    title: 'Enable Replay',
    type: 'boolean',
    description: "specifies whether user can replay the audio once it's played",
    default: true,
  },
  subtitles: {
    title: 'Subtitles',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        default: { type: 'boolean' },
        language: { type: 'string' },
        src: { type: 'string' },
      },
      required: ['src', 'language'],
    },
  },
};

export const uiSchema = {
  src: {
    'ui:widget': 'TorusAudioBrowser',
  },
  subtitles: {
    classNames: 'col-span-12 audio-subtitles',
  },
};

export const simpleUISchema = {
  'ui:ObjectFieldTemplate': CustomFieldTemplate,
  src: {
    'ui:widget': 'TorusAudioBrowser',
  },
  startTime: { classNames: 'col-span-6' },
  endTime: { classNames: 'col-span-6' },
  subtitles: {
    classNames: 'col-span-12 simple-audio-subtitles',
  },
};

export const adaptivitySchema = {
  exposureInSeconds: CapiVariableTypes.NUMBER,
  exposurePercentage: CapiVariableTypes.NUMBER,
  hasStarted: CapiVariableTypes.BOOLEAN,
  hasCompleted: CapiVariableTypes.BOOLEAN,
  totalSecondsWatched: CapiVariableTypes.NUMBER,
  duration: CapiVariableTypes.NUMBER,
  autoPlay: CapiVariableTypes.BOOLEAN,
  state: CapiVariableTypes.ENUM,
  startTime: CapiVariableTypes.NUMBER,
  endTime: CapiVariableTypes.NUMBER,
  currentTime: CapiVariableTypes.NUMBER,
};

export const createSchema = (): Partial<FlashCardModel> => ({
  enabled: true,
  width: 588,
  height: 285,
  customCssClass: '',
  showLabel: true,
  showDataTip: true,
  showValueLabels: true,
  showTicks: true,
  showThumbByDefault: true,
  invertScale: false,
  minimum: 0,
  maximum: 100,
  snapInterval: 1,
  label: 'Flashcard',
});
