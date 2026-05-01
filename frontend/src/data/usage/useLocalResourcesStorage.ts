import { useDispatch } from "react-redux";
import { useAppSelector } from "../../util/hooks";
import {
    _addActiveResource, _closeActiveResource, _updateActiveResource,
    _updateChartLayerChannelBinding, _updateChartLayerConfigSetting, _deleteElement,
    _updateBasicWidgetSettings, _addChildElement, _moveElementInParent, _updateOpenedRowsVersion,
    _addComputationRecipe, _deleteComputationRecipe, _modifyComputationRecipe
} from "../store/activeResourcesSlice";
import { TpConcept, TpResourceInfo, TpResourceRenderTemplate } from "../interfaces";
import { createConfigError, createInternalError } from "../../util/errors";
import { _addLocalConceptToConfig, _deleteLocalConceptFromConfig, _saveLocalRenderTemplate } from "../store/configSlice";
import { selectLocalResources, _addLocalResource, _deleteLocalResource, _addLocalConcept, _deleteLocalConcept, _setDownloadProgress } from "../store/localResourcesSlice";


export interface TpLocalResourcesStorage {

    getResourcesList: () => TpResourceInfo[];
    getConceptsList: () => TpConcept[];

    getResource: (uri: string) => TpResourceInfo;
    hasResource: (uri: string) => boolean;
    hasConcept: (id: string) => boolean;
    getConcept: (id: string) => TpConcept;

    addResource: (resource: TpResourceInfo) => void;
    deleteResource: (uri: string) => void;
    addConcept: (concept: TpConcept) => void;
    deleteConcept: (conceptId: string) => void;

    saveRenderTemplate: (renderTemplate: TpResourceRenderTemplate) => void;

    setDownloadProgress: (uri: string, progress: number) => void;
}


export function useLocalResourcesStorage(): TpLocalResourcesStorage {
    const dispatch = useDispatch();
    const localResources = useAppSelector(selectLocalResources);

    return {

        getResourcesList: () => localResources.localResources,

        getResource: (uri: string) => {
            const theResource = structuredClone(localResources.localResources.find(resource => resource.uri == uri));
            if (!theResource)
                throw createConfigError(`Local resource not found: ${uri}`);
            return theResource!;
        },

        hasResource: (uri: string) => {
            return !!localResources.localResources.find(resource => resource.uri == uri);
        },

        getConceptsList: () => localResources.localConcepts,

        hasConcept: (id: string) => {
            return !!localResources.localConcepts.find(concept => concept.id == id);
        },

        getConcept: (id: string) => {
            const concept = localResources.localConcepts.find(concept => concept.id == id);
            if (!concept) throw createInternalError(`Local concept not found: ${id}`);
            return concept;
        },

        addResource: (resource: TpResourceInfo) => {
            dispatch(_addLocalResource({ resource }));
        },

        deleteResource: (uri: string) => {
            dispatch(_deleteLocalResource({ uri }));
        },

        addConcept: (concept: TpConcept) => {
            dispatch(_addLocalConcept({ concept }));
            dispatch(_addLocalConceptToConfig({ concept }));
        },

        deleteConcept: (conceptId: string) => {
            dispatch(_deleteLocalConcept({ conceptId }));
            dispatch(_deleteLocalConceptFromConfig({ conceptId }));
        },

        saveRenderTemplate: (renderTemplate: TpResourceRenderTemplate) => {
            dispatch(_saveLocalRenderTemplate({ renderTemplate }));
        },

        setDownloadProgress: (uri: string, progress: number) => {
            dispatch(_setDownloadProgress({ uri, progress }));
        }

    }
}