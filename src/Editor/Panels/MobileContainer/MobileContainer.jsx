/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component, Fragment } from 'react';
import './_mobilecontainer.scss';

import MobileTabbedInterface from '../../Util/MobileTabbedInterface/MobileTabbedInterface';
import Timeline from '../Timeline/Timeline';
import Inspector from '../Inspector/Inspector';
import brushIcon from 'resources/toolbar-icons/brush.svg';
import MobileInspector, { inspectorTabs } from './MobileInspector/MobileInspector'
import MobileAssetLibrary from './MobileAssetLibrary/MobileAssetLibrary';
//import AssetLibrary from '../AssetLibrary/AssetLibrary';
import InspectorScriptWindow from '../Inspector/InspectorScriptWindow/InspectorScriptWindow'

import timelineIcon from 'resources/mobile-container-icons/timeline-icon.svg';
import timelineIconActive from 'resources/mobile-container-icons/timeline-icon-active.svg';
import inspectorIcon from 'resources/mobile-container-icons/inspector-icon.svg';
import inspectorIconActive from 'resources/mobile-container-icons/inspector-icon-active.svg';
import codeIcon from 'resources/mobile-container-icons/code-icon.svg';
import codeIconActive from 'resources/mobile-container-icons/code-icon-active.svg';
import assetIcon from 'resources/mobile-container-icons/asset-icon.svg';
import assetIconActive from 'resources/mobile-container-icons/asset-icon-active.svg';

class MobileContainer extends Component {

    // example prop:
    // <TabbedInterface tabs={[{label: "inspector", icon: inspectorIcon, iconActive: inspectorIconActive, iconAlt: "inspector icon"}, 
    //                         {label: "timeline", icon: timelineIcon, iconActive: timelineIconActive, iconAlt: "timeline icon"}]} >
    constructor (props) {
        super(props);

        const availableTabs = MobileContainer.getAvailableTabs(props);
        this.state = {
            availableTabs,
            selectedTab: availableTabs.includes('brush') ? 'brush' : 'timeline',
        };
    }

    static getAvailableTabs(props) {
        const tabs = ['timeline'];
        const inspectorContent = inspectorTabs[props.getSelectionType()];
        if (inspectorContent && inspectorContent.length > 0) tabs.push('inspector');
        if (props.selectionIsScriptable()) tabs.push('code');
        if (props.activeTool === 'brush') tabs.push('brush');
        tabs.push('asset');
        return tabs;
    }

    static getDerivedStateFromProps(props, state) {
        const availableTabs = MobileContainer.getAvailableTabs(props);
        // Prefer Brush, then Inspector, when multiple panels appear together.
        const addedTab = ['brush', 'inspector', 'code'].find(tab =>
            availableTabs.includes(tab) && !state.availableTabs.includes(tab));
        const selectedTab = addedTab || (availableTabs.includes(state.selectedTab)
            ? state.selectedTab : 'timeline');
        if (availableTabs.join() !== state.availableTabs.join() || selectedTab !== state.selectedTab) {
            return { availableTabs, selectedTab };
        }
        return null;
    }

    renderTimeline = (props) => {
        return(
            <Fragment>
                <Timeline 
                    project={props.project}
                    projectDidChange={props.projectDidChange}
                    projectData={props.projectData}
                    getSelectedTimelineObjects={props.getSelectedTimelineObjects}
                    setOnionSkinOptions={props.setOnionSkinOptions}
                    getOnionSkinOptions={props.getOnionSkinOptions}
                    setFocusObject={props.setFocusObject}
                    addTweenKeyframe={props.addTweenKeyframe}
                    onRef={props.onRef}
                    dragSoundOntoTimeline={props.dragSoundOntoTimeline}>
                </Timeline>
            </Fragment>
        )
    }

    renderInpector = (props) => {
        return(
            <Fragment>
                <MobileInspector 
                    getToolSetting={props.getToolSetting}
                    setToolSetting={props.setToolSetting}
                    getSelectionType={props.getSelectionType}
                    getAllSoundAssets={props.getAllSoundAssets}
                    getAllSelectionAttributes={props.getAllSelectionAttributes}
                    setSelectionAttribute={props.setSelectionAttribute}
                    editorActions={props.editorActions}

                    selectionIsScriptable={props.selectionIsScriptable}
                    script={props.script}
                    scriptInfoInterface={props.scriptInfoInterface}
                    deleteScript={props.deleteScript}
                    editScript={props.editScript}

                    fontInfoInterface={props.fontInfoInterface}
                    project={props.project}
                    importFileAsAsset={props.importFileAsAsset}
                    colorPickerType={props.colorPickerType}
                    changeColorPickerType={props.changeColorPickerType}
                    updateLastColors={props.updateLastColors}
                    lastColorsUsed={props.lastColorsUsed}
                    getClipAnimationTypes={props.getClipAnimationTypes}>
                </MobileInspector>
            </Fragment>
        )
    }

    renderCode = (props) => {
        return(
            <Fragment>
                <InspectorScriptWindow
                    script={props.script}
                    deleteScript={props.deleteScript}
                    editScript={props.editScript}
                    scriptInfoInterface={props.scriptInfoInterface}>
                </InspectorScriptWindow>
            </Fragment>
        )
    }

    renderAsset = (props) => {
        return(
            <Fragment>
                <MobileAssetLibrary                         
                    projectData={props.projectData}
                    assets={props.assets}
                    openModal={props.openModal}
                    openImportAssetFileDialog={props.openImportAssetFileDialog}
                    selectObjects={props.selectObjects}
                    clearSelection={props.clearSelection}
                    isObjectSelected={props.isObjectSelected}
                    createAssets={props.createAssets} 
                    importProjectAsWickFile={props.importProjectAsWickFile}
                    createImageFromAsset={props.createImageFromAsset}
                    toast={props.toast}
                    deleteSelectedObjects={props.deleteSelectedObjects}
                    addSoundToActiveFrame={props.addSoundToActiveFrame}>
                </MobileAssetLibrary>
            </Fragment>
        )
    }

    render() {
        const panels = {
            timeline: { icon: timelineIcon, iconActive: timelineIconActive, iconAlt: 'timeline icon', render: () => this.renderTimeline(this.props) },
            inspector: { icon: inspectorIcon, iconActive: inspectorIconActive, iconAlt: 'inspector icon', render: () => this.renderInpector(this.props) },
            code: { icon: codeIcon, iconActive: codeIconActive, iconAlt: 'code editor icon', render: () => this.renderCode(this.props) },
            brush: { icon: brushIcon, iconActive: brushIcon, iconAlt: 'brush settings', render: () => <div className="mobile-brush-panel"><Inspector {...this.props} activeTool="brush" /></div> },
            asset: { icon: assetIcon, iconActive: assetIconActive, iconAlt: 'asset library icon', render: () => this.renderAsset(this.props) },
        };
        return (
            <MobileTabbedInterface className="mobile-container"
                selectedTab={this.state.selectedTab}
                onTabSelect={selectedTab => this.setState({ selectedTab })}
                tabs={this.state.availableTabs.map(label => ({ label, ...panels[label] }))}>
                {this.state.availableTabs.map(label => <Fragment key={label}>{panels[label].render()}</Fragment>)}
            </MobileTabbedInterface>
        );
    }
}

export default MobileContainer;
