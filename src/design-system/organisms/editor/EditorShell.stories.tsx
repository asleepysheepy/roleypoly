import * as React from 'react';
import { guildEnum } from 'roleypoly/common/types/storyData';
import { BreakpointsProvider } from '../../atoms/breakpoints';
import { EditorShell } from './EditorShell';

export default {
    title: 'Organisms/Editor',
    component: EditorShell,
    decorators: [(story) => <BreakpointsProvider>{story()}</BreakpointsProvider>],
};

export const Shell = () => <EditorShell guild={guildEnum.guilds[0]} />;
