import { configureStore } from '@reduxjs/toolkit';

import localResourcesSliceReducer from './localResourcesSlice';
import activeResourcesReducer from './activeResourcesSlice';
import loadedTableReducer from './loadedTablesSlice';
import configReducer from './configSlice'
export const theStore = configureStore({
    reducer: {
        config: configReducer, // The global configuration
        localResources: localResourcesSliceReducer, // All locally stored concepts & resources
        activeResources: activeResourcesReducer, // All resources that are currently opened in the app
        loadedTables: loadedTableReducer, // All currengtly loaded data tables, belonging to active concepts
    },
});

export type TpRootState = ReturnType<typeof theStore.getState>;
export type TpAppDispatch = typeof theStore.dispatch;

export function globalGetStoreState(): TpRootState {
    return theStore.getState();
}

export function globalGetDispatch(): TpAppDispatch {
    return theStore.dispatch;
}