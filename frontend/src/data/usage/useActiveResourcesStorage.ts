import { useDispatch } from "react-redux";
import { useAppSelector } from "../../util/hooks";
import { _addActiveResource, _closeActiveResource, selectActiveResources, _updateActiveResource, _updateChartLayerChannelBinding, _updateChartLayerConfigSetting, _deleteElement, _updateBasicWidgetSettings, _addChildElement, _moveElementInParent, _updateOpenedRowsVersion, _addComputationRecipe, _deleteComputationRecipe, _modifyComputationRecipe, _addOrModifyDashboardAction, _deleteDashboardAction } from "../store/activeResourcesSlice";
import { TpDashboardAction, TpResourceInfo } from "../interfaces";
import { createConfigError } from "../../util/errors";
import { TpConfigData } from "../store/configSlice";
import { guid } from "../../util/misc";


export interface TpOpenedRowInfo {
    // Information about an "opened" table row
    tableUri: string;
    rowKeyIndex: number; // index in full, original table
}


// NOTE: we keep info about opened rows outside the store, because we use this in dynamic rendering of overlays
// that do not need to trigger expensive component rerenders
const _resourceOpenedRows: { [uri: string]: TpOpenedRowInfo[] } = {};

export function getOpenedRows(resourceInfo?: TpResourceInfo | null): TpOpenedRowInfo[] {
    if (!resourceInfo) return [];
    if (!_resourceOpenedRows[resourceInfo.uri]) return [];
    return _resourceOpenedRows[resourceInfo.uri];
}

export interface TpActiveResourcesStorage {

    getActiveResourcesList: () => TpResourceInfo[];
    hasActiveResource: (uri: string) => boolean;
    getActiveResource: (uri: string) => TpResourceInfo;
    addActiveResource: (uri: string, name: string, description: string, isLocal: boolean) => void;
    updateActiveResource: (resource: TpResourceInfo, config: TpConfigData) => void;
    closeActiveResource: (uri: string) => void;


    // Functions editing the dashboard elements of an opened resource
    deleteElement: (uri: string, elemTrStateId: string) => void;
    moveElementInParent: (uri: string, elemTrStateId: string, moveDir: boolean) => void;
    addChildElement: (uri: string, parentElemTrStateId: string, elemDefInp: any) => void;
    updateBasicWidgetSettings: (uri: string, elemTrStateId: string, settings: {}) => void;

    // Functions changing the configuration of a data widget for an opened resource
    updateChartLayerChannelBinding: (uri: string, elemTrStateId: string, layerIdx: number | null, channelId: string, newColId: string) => void;
    updateChartLayerConfigSetting: (uri: string, elemTrStateId: string, layerIdx: number | null, configSettingId: string, newValue: any) => void;

    // Functions managing the set of "opened" table rows, which appear in a side view after clicking on a table row
    addOpenedRow: (uri: string, tableUri: string, rowKeyIndex: number) => void;
    closeOpenedRow: (uri: string, tableUri: string, rowKeyIndex: number) => void;
    closeAllOpenedRows: (uri: string) => void;

    // Functions for computation recipes of derived properties
    addComputationRecipe: (uri: string, tableUri: string, id: string, name: string, groupName: string | null, expression: string, description: string, unitName: string, decimalDigits: number | null) => void;
    modifyComputationRecipe: (uri: string, tableUri: string, id: string, name: string, expression: string, description: string, unitName: string, decimalDigits: number | null) => void;
    deleteComputationRecipe: (uri: string, tableUri: string, id: string) => void;

    addOrModifyDashboardAction: (resourceUri: string, action: TpDashboardAction) => void;
    deleteDashboardAction: (resourceUri: string, actionId: string) => void;

}




export function useActiveResourcesStorage(): TpActiveResourcesStorage {
    const dispatch = useDispatch();
    const activeResources = useAppSelector(selectActiveResources);


    return {

        getActiveResourcesList: () => {
            return activeResources.activeResources;
        },

        hasActiveResource: (uri: string) => {
            return !!activeResources.activeResources.find(resource => resource.uri == uri);

        },

        getActiveResource: (uri: string) => {
            const resource = activeResources.activeResources.find(resource => resource.uri == uri);
            if (!resource) throw createConfigError(`Resource not found: ${uri}`);
            return resource;
        },

        addActiveResource: (uri: string, name: string, description: string, isLocal: boolean) => {
            dispatch(_addActiveResource({ uri, name, description, isLocal }));
        },

        updateActiveResource: (resource: TpResourceInfo, config: TpConfigData) => {
            if (!resource.globalAttributes) debugger;
            dispatch(_updateActiveResource({ resource, config }));

        },

        closeActiveResource: (uri: string) => {
            dispatch(_closeActiveResource({ uri }));
        },

        updateChartLayerChannelBinding: (uri: string, elemTrStateId: string, layerIdx: number | null, channelId: string, newColId: string) => {
            dispatch(_updateChartLayerChannelBinding({ uri, elemTrStateId, layerIdx, channelId, newColId }));
        },

        updateChartLayerConfigSetting: (uri: string, elemTrStateId: string, layerIdx: number | null, configSettingId: string, newValue: any) => {
            dispatch(_updateChartLayerConfigSetting({ uri, elemTrStateId, layerIdx, configSettingId, newValue }));
        },

        deleteElement: (uri: string, elemTrStateId: string) => {
            dispatch(_deleteElement({ uri, elemTrStateId }));
        },

        moveElementInParent: (uri: string, elemTrStateId: string, moveDir: boolean) => {
            dispatch(_moveElementInParent({ uri, elemTrStateId, moveDir }));
        },

        addChildElement: (uri: string, parentElemTrStateId: string, elemDefInp: any) => {
            const elemDef = structuredClone(elemDefInp);
            elemDef.elemTrStateId = guid();
            elemDef.parentElemTrStateId = parentElemTrStateId
            dispatch(_addChildElement({ uri, parentElemTrStateId, elemDef }));
        },

        updateBasicWidgetSettings: (uri: string, elemTrStateId: string, content: {}) => {
            dispatch(_updateBasicWidgetSettings({ uri, elemTrStateId, content: content }));
        },

        addOpenedRow: (uri: string, tableUri: string, rowKeyIndex: number) => {
            if (!_resourceOpenedRows[uri]) _resourceOpenedRows[uri] = [];
            if (_resourceOpenedRows[uri].find(row => (row.tableUri == tableUri) && (row.rowKeyIndex == rowKeyIndex)))
                return; //already opened
            _resourceOpenedRows[uri].push({ tableUri, rowKeyIndex });
            dispatch(_updateOpenedRowsVersion({ uri }));
        },

        closeOpenedRow: (uri: string, tableUri: string, rowKeyIndex: number) => {
            if (!_resourceOpenedRows[uri]) _resourceOpenedRows[uri] = [];
            _resourceOpenedRows[uri] = _resourceOpenedRows[uri].filter(row => (row.tableUri != tableUri) || (row.rowKeyIndex != rowKeyIndex));
            dispatch(_updateOpenedRowsVersion({ uri }));
        },

        closeAllOpenedRows: (uri: string) => {
            _resourceOpenedRows[uri] = [];
            dispatch(_updateOpenedRowsVersion({ uri }));
        },

        addComputationRecipe: (uri: string, tableUri: string, id: string, name: string, groupName: string | null, expression: string, description: string, unitName: string, decimalDigits: number | null) => {
            dispatch(_addComputationRecipe({ uri, tableUri, id, name, groupName, expression, description, unitName, decimalDigits }));
        },

        modifyComputationRecipe: (uri: string, tableUri: string, id: string, name: string, expression: string, description: string, unitName: string, decimalDigits: number | null) => {
            dispatch(_modifyComputationRecipe({ uri, tableUri, id, name, expression, description, unitName, decimalDigits }));
        },

        deleteComputationRecipe: (uri: string, tableUri: string, id: string) => {
            dispatch(_deleteComputationRecipe({ uri, tableUri, id }));
        },

        addOrModifyDashboardAction: (resourceUri: string, action: TpDashboardAction) => {
            dispatch(_addOrModifyDashboardAction({ resourceUri, action }));
        },

        deleteDashboardAction: (resourceUri: string, actionId: string) => {
            dispatch(_deleteDashboardAction({ resourceUri, actionId }));
        },


    }
}