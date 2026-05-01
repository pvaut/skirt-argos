import { createSlice, Dispatch, PayloadAction } from "@reduxjs/toolkit";
import { LOAD_STATUS, TpConcept, TpResourceInfo, TpResourceRenderTemplate } from "../interfaces";
import { TpRootState } from "./store";
import { TpLocDBLoadInfo } from "../local-database/localDatabase";
import { _saveLocalRenderTemplate } from "./configSlice";



export interface TpLocalResourcesData {
    localResources: TpResourceInfo[];
    localConcepts: TpConcept[];
}

const initialState: TpLocalResourcesData = {
    localResources: [],
    localConcepts: [],
};


export const localResourcesSlice = createSlice({
    name: 'localResources',
    initialState,
    reducers: {

        _addLocalResource: (state, action: PayloadAction<{ resource: TpResourceInfo }>) => {
            const { resource } = action.payload;
            const existingIdx = state.localResources.findIndex(existingResource => existingResource.uri == resource.uri);
            if (existingIdx < 0)
                state.localResources.push(resource);
            else
                state.localResources[existingIdx] = resource;
        },

        _setDownloadProgress: (state, action: PayloadAction<{ uri: string, progress: number }>) => {
            const { uri, progress } = action.payload;
            const existingIdx = state.localResources.findIndex(existingResource => existingResource.uri == uri);
            if (existingIdx >= 0)
                state.localResources[existingIdx].downloadProgress = progress;
        },

        _setLocalResourceLoaded: (state, action: PayloadAction<{ uri: string }>) => {
            const { uri } = action.payload;
            const resource = state.localResources.find(res => res.uri == uri);
            if (resource) resource.status = LOAD_STATUS.PRESENT;
        },

        _deleteLocalResource: (state, action: PayloadAction<{ uri: string }>) => {
            const { uri } = action.payload;
            state.localResources = state.localResources.filter(res => res.uri != uri);
        },

        _addLocalConcept: (state, action: PayloadAction<{ concept: TpConcept }>) => {
            const { concept } = action.payload;
            const existingIdx = state.localConcepts.findIndex(existingConcept => existingConcept.id == concept.id);
            if (existingIdx < 0)
                state.localConcepts.push(concept);
            else
                state.localConcepts[existingIdx] = concept;
        },

        _deleteLocalConcept: (state, action: PayloadAction<{ conceptId: string }>) => {
            const { conceptId } = action.payload;
            state.localConcepts = state.localConcepts.filter(concept => concept.id != conceptId);
        },

    },
});

// IMPORTANT NOTE:
// don't use the following actions directly, only call the functions returned by useActiveResourcesStorage
export const {
    _addLocalResource,
    _setDownloadProgress,
    _deleteLocalResource,
    _setLocalResourceLoaded,
    _addLocalConcept,
    _deleteLocalConcept,
} = localResourcesSlice.actions;

export const selectLocalResources = (state: TpRootState) => state.localResources;

export default localResourcesSlice.reducer;

export interface TpLocalResourcesSetInfo {
    resources: TpResourceInfo[];
    concepts: TpConcept[];
}

export function loadLocalResources(db: TpLocDBLoadInfo, dispatch: Dispatch): TpLocalResourcesSetInfo {
    for (const resource of db.localResources) {
        dispatch(_addLocalResource({ resource }));
    }
    for (const concept of db.localConcepts) {
        dispatch(_addLocalConcept({ concept }));
    }
    return {
        resources: db.localResources,
        concepts: db.localConcepts,
    }
}

export function loadLocalTemplates(db: TpLocDBLoadInfo, dispatch: Dispatch) {
    for (const renderTemplate of db.localRenderTemplates) {
        dispatch(_saveLocalRenderTemplate({ renderTemplate }));
    }
}