import { ScheduleEditor } from './scheduler/ScheduleEditor';
import { registerApplication } from './app';
import React from 'react';
import { configureStore } from '../state/store';
import { Provider } from 'react-redux';
import { initState, schedulerAppReducer } from './scheduler/scheduler-reducer';
import { StringDate } from './scheduler/scheduler-slice';
import { globalStore } from 'state/store';
export interface SchedulerAppProps {
  start_date: StringDate;
  end_date: StringDate;
  title: string;
  section_slug: string;
  display_curriculum_item_numbering: boolean;
  edit_section_details_url: string;
}

const store = configureStore(initState(), schedulerAppReducer);

const ScheduleEditorApp: React.FC<SchedulerAppProps> = React.memo(
  ({
    start_date,
    end_date,
    title,
    section_slug,
    display_curriculum_item_numbering,
    edit_section_details_url,
  }) => (
    <Provider store={store}>
      <ScheduleEditor
        start_date={start_date}
        end_date={end_date}
        title={title}
        section_slug={section_slug}
        display_curriculum_item_numbering={display_curriculum_item_numbering}
        wizard_mode={false} // TODO - set this from torus
        edit_section_details_url={edit_section_details_url}
      />
    </Provider>
  ),
);

ScheduleEditorApp.displayName = 'ScheduleEditorApp';

registerApplication('ScheduleEditor', ScheduleEditorApp, globalStore);