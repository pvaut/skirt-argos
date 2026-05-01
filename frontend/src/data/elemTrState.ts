
// This keeps track of all "transient state" of elements in resource views
// This is state that we cannot keep in store for various reasons (e.g. performance), and changes should not automatically trigger rerenders
// Example: zoom & pan position of a chart
// We keep it outside the React element state because we do want to preserve it when a React element is (temporarily) destroyed, e.g. because the user switched tabes

import { TpElemInfo } from "../features/resource-view/element-types/interface";
import { createInternalError } from "../util/errors";


// This holds "Transient state" for dashboard elements (which is not kept in the redux store nor in react state)
// For example, the slicing filter applied, zoom & pan infp or 3D camera position

interface TpElemTrState {
    elemTrStateId: string;
    resourceUri: string;
    syncGroups: { [type: string]: string }; // maps SYNCGROUP_TYPES to a sync group identifier set in the dashboard config
    state: { [id: string]: any }; // key-value par=irs for state info
}

// Here we store the info
const elemTrStateMap: { [id: string]: TpElemTrState } = {};


export function getResourceElemTrState(elemInfo: TpElemInfo) {
    if (!elemInfo.elemTrStateId)
        throw createInternalError('Element is missing elemTrStateId');
    const elemTrStateId = elemInfo.elemTrStateId as string;
    if (!elemTrStateMap[elemTrStateId]) { // not yet present in the cache => we add it here
        elemTrStateMap[elemTrStateId] = {
            elemTrStateId,
            resourceUri: elemInfo.resourceUri,
            syncGroups: structuredClone(elemInfo.syncGroups),
            state: {},
        }
    }
    return elemTrStateMap[elemTrStateId];
}

export function updataResourceElemTrStateSyncGroups(elemInfo: TpElemInfo) {
    getResourceElemTrState(elemInfo).syncGroups = structuredClone(elemInfo.syncGroups);
}

// Remove the info from the cache (e.g. when the dashboard is closed)
export function removeResourceElemTrState(uri: string) {
    Object.entries(elemTrStateMap).forEach(([key, val]) => {
        if (val.resourceUri == uri)
            delete elemTrStateMap[key];
    })
}

export function getResourceElemTrStateList(uri: string) {
    const theList: TpElemTrState[] = [];
    Object.entries(elemTrStateMap).forEach(([key, val]) => {
        if (val.resourceUri == uri)
            theList.push(val);
    })
    return theList;
}