import * as React from 'react';
import { QuickNav } from '../quick-nav';
import { TabContent, TabTitleRow, TabViewStyled } from './TabView.styled';

export type TabViewProps = {
    children: React.ReactNode[];
    initialTab?: number;
};

type TabProps = {
    title: string;
    children: () => React.ReactNode;
};

export const TabView = (props: TabViewProps) => {
    const tabNames = React.Children.map(props.children, (child) => {
        if (!React.isValidElement(child)) {
            return '(Oops)';
        }

        return child.props.title;
    }) as string[];

    if (tabNames.length === 0) {
        return null;
    }

    const [currentTab, setCurrentTab] = React.useState<number>(props.initialTab ?? 0);
    const tabRefs = tabNames.reduce<{ [name: string]: React.RefObject<HTMLDivElement> }>(
        (acc, name) => ({ ...acc, [name]: React.createRef() }),
        {}
    );

    return (
        <TabViewStyled>
            <TabTitleRow>
                <QuickNav
                    currentNavItem={tabNames[currentTab]}
                    navItems={tabNames}
                    onNavChange={(newTabName) => {
                        setCurrentTab(tabNames.findIndex((name) => newTabName === name));
                        tabRefs[newTabName].current?.scrollIntoView({
                            behavior: 'smooth',
                        });
                    }}
                />
            </TabTitleRow>
            <TabContent>
                {React.Children.map(props.children, (child) => {
                    if (!React.isValidElement(child)) {
                        return null;
                    }

                    return (
                        <div ref={tabRefs[child.props.title]} key={child.props.title}>
                            {child}
                        </div>
                    );
                })}
            </TabContent>
        </TabViewStyled>
    );
};

export const Tab = (props: TabProps) => <div>{props.children()}</div>;
