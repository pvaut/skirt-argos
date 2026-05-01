import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LOAD_STATUS, TpDashboardAction, TpResourceInfo } from '../interfaces';
import { TpRootState } from './store';
import { getResourceRenderTemplate } from '../helpers';
import { TpConfigData } from './configSlice';
import { findRenderElementByTrStateId, renderTemplateAttachElemTrStateIds, templateElemAttachElemTrStateIds } from './helpers';
import { createConfigError, createInternalError } from '../../util/errors';
import { SOURCE_FILE_TYPES } from '../../util/data-sources/file-parsers/interface';


export interface TpActiveResourcesData {
    activeResources: TpResourceInfo[];
}

const initialState: TpActiveResourcesData = {
    activeResources: [],
};


export const activeResourcesSlice = createSlice({
    name: 'activeResources',
    initialState,
    reducers: {

        _addActiveResource: (state, action: PayloadAction<{ uri: string, name: string, description: string, isLocal: boolean }>) => {
            const { uri, name, description, isLocal } = action.payload;
            const resourceIndex = state.activeResources.map(resource => resource.uri).indexOf(uri);
            if (!isLocal) throw createInternalError(`This should never have happened`);
            if (resourceIndex < 0) {
                state.activeResources.push({
                    uri: uri,
                    name: name,
                    conceptId: '',
                    description: description,
                    tables: [],
                    globalAttributes: [],
                    thumbnail: '',
                    issues: [],
                    status: LOAD_STATUS.ABSENT,
                    openedRowsVersion: 0,
                    isLocal: true,
                    dataSourceType: SOURCE_FILE_TYPES.UNKNOWN,
                    creationTimeStamp: new Date().toISOString(),
                });
            }
        },

        _closeActiveResource: (state, action: PayloadAction<{ uri: string }>) => {
            const { uri } = action.payload;
            state.activeResources = state.activeResources.filter(resource => resource.uri != uri);
        },

        _updateActiveResource: (state, action: PayloadAction<{ resource: TpResourceInfo, config: TpConfigData }>) => {
            // NOTE: we create deep copies of everything here as they will start their own life (e.g. get modified)
            const resource = structuredClone(action.payload.resource);
            resource.renderTemplate = structuredClone(getResourceRenderTemplate(action.payload.config, resource.conceptId));
            renderTemplateAttachElemTrStateIds(resource.renderTemplate);
            const resourceIndex = state.activeResources.map(resource => resource.uri).indexOf(resource.uri);
            if (resourceIndex < 0) {
                state.activeResources.push(resource);
            } else {
                state.activeResources[resourceIndex] = resource;
            }
        },

        _updateChartLayerChannelBinding: (state, action: PayloadAction<{ uri: string, elemTrStateId: string, layerIdx: number | null, channelId: string, newColId: string }>) => {
            const { uri, elemTrStateId, layerIdx, channelId, newColId } = action.payload;
            const renderElement = findRenderElementByTrStateId(state, uri, elemTrStateId);
            if (layerIdx == null) { // single layered widget
                renderElement.encodings[channelId] = newColId;
            } else { // multi layered widget
                const layer = renderElement.layers[layerIdx];
                if (!layer) throw createInternalError(`Could not find layer: ${uri} ${elemTrStateId} ${layerIdx}`);
                layer.encodings[channelId] = newColId;
            }
        },

        _updateChartLayerConfigSetting: (state, action: PayloadAction<{ uri: string, elemTrStateId: string, layerIdx: number | null, configSettingId: string, newValue: any }>) => {
            const { uri, elemTrStateId, layerIdx, configSettingId, newValue } = action.payload;
            const renderElement = findRenderElementByTrStateId(state, uri, elemTrStateId);
            if (layerIdx == null) { // single layered widget
                if (!renderElement.settings) renderElement.settings = {}
                renderElement.settings[configSettingId] = newValue;
            } else { // multi layered widget
                const layer = renderElement.layers[layerIdx];
                if (!layer) throw createInternalError(`Could not find layer: ${uri} ${elemTrStateId} ${layerIdx}`);
                if (!layer.settings) layer.settings = {}
                layer.settings[configSettingId] = newValue;
            }
        },

        _deleteElement: (state, action: PayloadAction<{ uri: string, elemTrStateId: string }>) => {
            const { uri, elemTrStateId } = action.payload;
            const element = findRenderElementByTrStateId(state, uri, elemTrStateId);
            if (!element.parentElemTrStateId) return;
            const parentElement = findRenderElementByTrStateId(state, uri, element.parentElemTrStateId);
            parentElement.elements = parentElement.elements.filter((el: any) => el.elemTrStateId != elemTrStateId);
        },

        _moveElementInParent: (state, action: PayloadAction<{ uri: string, elemTrStateId: string, moveDir: boolean }>) => {
            const { uri, elemTrStateId, moveDir } = action.payload;
            const element = findRenderElementByTrStateId(state, uri, elemTrStateId);
            if (!element.parentElemTrStateId) return;
            const parentElement = findRenderElementByTrStateId(state, uri, element.parentElemTrStateId);
            const elIdx = parentElement.elements.findIndex((el: any) => el.elemTrStateId == elemTrStateId);
            if (elIdx < 0) return;
            if (moveDir) { // move down
                if (elIdx < parentElement.elements.length - 1) {
                    const tmp = parentElement.elements[elIdx];
                    parentElement.elements[elIdx] = parentElement.elements[elIdx + 1]
                    parentElement.elements[elIdx + 1] = tmp;
                }
            } else { // move up
                if (elIdx > 0) {
                    const tmp = parentElement.elements[elIdx];
                    parentElement.elements[elIdx] = parentElement.elements[elIdx - 1]
                    parentElement.elements[elIdx - 1] = tmp;
                }
            }
        },

        _addChildElement: (state, action: PayloadAction<{ uri: string, parentElemTrStateId: string, elemDef: any }>) => {
            const { uri, parentElemTrStateId, elemDef } = action.payload;
            const parentElem = findRenderElementByTrStateId(state, uri, parentElemTrStateId);
            if (!parentElem.elements) throw createInternalError(`Cannot add child element: not a container`);
            parentElem.elements.push(structuredClone(elemDef));
            templateElemAttachElemTrStateIds(parentElem, parentElem.parentElemTrStateId); //  this makes sure that the new element gets all its identifiers in the tree

        },


        _updateBasicWidgetSettings: (state, action: PayloadAction<{ uri: string, elemTrStateId: string, content: any }>) => {
            const { uri, elemTrStateId, content } = action.payload;
            const element = findRenderElementByTrStateId(state, uri, elemTrStateId);
            element.size = {
                width: content.width,
                height: content.height,
            }
            element.settings = content.settings;
        },

        _updateOpenedRowsVersion: (state, action: PayloadAction<{ uri: string }>) => {
            const { uri } = action.payload;
            const resource = state.activeResources.find(res => res.uri == uri)
            if (!resource) throw createConfigError(`Resource not found: ${uri}`);
            resource.openedRowsVersion++;
        },

        _addComputationRecipe: (state, action: PayloadAction<{ uri: string, tableUri: string, id: string, name: string, groupName: string | null, expression: string, description: string, unitName: string, decimalDigits: number | null }>) => {
            const { uri, tableUri, id, name, groupName, expression, description, unitName, decimalDigits } = action.payload;
            const resource = state.activeResources.find(res => res.uri == uri);
            if (!resource) throw createConfigError(`Resource not found: ${uri}`);
            if (!resource.renderTemplate!.computationRecipes) resource.renderTemplate!.computationRecipes = {};
            if (!resource.renderTemplate!.computationRecipes[tableUri]) resource.renderTemplate!.computationRecipes[tableUri] = [];
            resource.renderTemplate!.computationRecipes[tableUri].push({
                id, name, groupName, expression, description, unitName, decimalDigits
            });
        },

        _modifyComputationRecipe: (state, action: PayloadAction<{ uri: string, tableUri: string, id: string, name: string, expression: string, description: string, unitName: string, decimalDigits: number | null }>) => {
            const { uri, tableUri, id, name, expression, description, unitName, decimalDigits } = action.payload;
            const resource = state.activeResources.find(res => res.uri == uri);
            if (!resource) throw createConfigError(`Resource not found: ${uri}`);
            if ((!resource.renderTemplate!.computationRecipes) || (!resource.renderTemplate!.computationRecipes[tableUri])) return;
            for (const recipe of resource.renderTemplate!.computationRecipes[tableUri])
                if (recipe.id == id) {
                    recipe.name = name;
                    recipe.expression = expression;
                    recipe.description = description;
                    recipe.unitName = unitName;
                    recipe.decimalDigits = decimalDigits;
                }
        },

        _deleteComputationRecipe: (state, action: PayloadAction<{ uri: string, tableUri: string, id: string }>) => {
            const { uri, tableUri, id } = action.payload;
            const resource = state.activeResources.find(res => res.uri == uri);
            if (!resource) throw createConfigError(`Resource not found: ${uri}`);
            if ((!resource.renderTemplate!.computationRecipes) || (!resource.renderTemplate!.computationRecipes[tableUri])) return;
            resource.renderTemplate!.computationRecipes[tableUri] =
                resource.renderTemplate!.computationRecipes[tableUri].filter(recipe => recipe.id != id);
        },

        _addOrModifyDashboardAction: (state, _action: PayloadAction<{ resourceUri: string, action: TpDashboardAction }>) => {
            const { resourceUri, action } = _action.payload;
            const resource = state.activeResources.find(res => res.uri == resourceUri);
            if (!resource) throw createConfigError(`Resource not found: ${resourceUri}`);
            if (!resource.renderTemplate!.actions) resource.renderTemplate!.actions = [];
            const idx = resource.renderTemplate!.actions.findIndex(act => act.id == action.id);
            const actionObj: TpDashboardAction = {
                id: action.id,
                name: action.name,
                targetTableId: action.targetTableId,
                actionDef: action.actionDef,
            }
            if (idx < 0) resource.renderTemplate!.actions.push(actionObj);
            else resource.renderTemplate!.actions[idx] = actionObj;
        },

        _deleteDashboardAction: (state, _action: PayloadAction<{ resourceUri: string, actionId: string }>) => {
            const { resourceUri, actionId } = _action.payload;
            const resource = state.activeResources.find(res => res.uri == resourceUri);
            if (!resource) throw createConfigError(`Resource not found: ${resourceUri}`);
            if (!resource.renderTemplate!.actions) return;
            resource.renderTemplate!.actions = resource.renderTemplate!.actions.filter(act => act.id != actionId);
        },


    },
});

// IMPORTANT NOTE:
// don't use the following actions directly, only call the functions returned by useActiveResourcesStorage
export const {
    _addActiveResource,
    _closeActiveResource,
    _updateActiveResource,
    _updateChartLayerChannelBinding,
    _updateChartLayerConfigSetting,
    _deleteElement,
    _moveElementInParent,
    _addChildElement,
    _updateBasicWidgetSettings,
    _updateOpenedRowsVersion,
    _addComputationRecipe,
    _modifyComputationRecipe,
    _deleteComputationRecipe,
    _addOrModifyDashboardAction,
    _deleteDashboardAction,
} = activeResourcesSlice.actions;

export const selectActiveResources = (state: TpRootState) => state.activeResources;

export default activeResourcesSlice.reducer;
