import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TpAppConfig, TpConcept, TpResourceRenderTemplate } from '../interfaces';
import { TpRootState } from './store';
import { getTableConceptId } from '../helpers';


export interface TpConfigData {
    theConfig: TpAppConfig | null;
    conceptsMap: { [id: string]: TpConcept };
}


const initialState: TpConfigData = {
    theConfig: null, // set to null because config is not yet loaded
    conceptsMap: {},
};

function _addOrUpdateConceptInState(state: TpConfigData, concept: TpConcept) {
    const existingIndex = state.theConfig!.ontology.concepts.findIndex(existingConcept => existingConcept.id == concept.id);
    if (existingIndex < 0)
        state.theConfig!.ontology.concepts.push(concept);
    else
        state.theConfig!.ontology.concepts[existingIndex] = concept;
    state.conceptsMap[concept.id] = concept
}



export const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {

        _setConfig: (state, action: PayloadAction<{ config: TpAppConfig }>) => {
            state.theConfig = structuredClone(action.payload.config);
            state.conceptsMap = {};
            if (state.theConfig) {
                for (const concept of state.theConfig.ontology.concepts)
                    state.conceptsMap[concept.id] = concept;
            }
        },

        _addLocalConceptToConfig: (state, action: PayloadAction<{ concept: TpConcept }>) => {
            const concept = action.payload.concept;
            _addOrUpdateConceptInState(state, concept);
            for (const tableDef of concept.tableConcepts) {
                const tableConcept: TpConcept = {
                    isLocal: true,
                    isTable: true,
                    id: getTableConceptId(concept.id, tableDef.path),
                    name: tableDef.nameSingle,
                    namePlural: tableDef.namePlural,
                    description: tableDef.description,
                    tableConcepts: [],
                    globalAttributeDefs: [],
                }
                _addOrUpdateConceptInState(state, tableConcept);
            }
        },

        _deleteLocalConceptFromConfig: (state, action: PayloadAction<{ conceptId: string }>) => {
            const conceptId = action.payload.conceptId;
            state.theConfig!.ontology.concepts = state.theConfig!.ontology.concepts.filter(concept => concept.id != conceptId);;
            delete state.conceptsMap[conceptId];
        },

        _saveLocalRenderTemplate: (state, action: PayloadAction<{ renderTemplate: TpResourceRenderTemplate }>) => {
            const renderTemplate = action.payload.renderTemplate;
            const tplIdx = state.theConfig!.resourceRenderTemplates.findIndex(tpl => tpl.targetConcept == renderTemplate.targetConcept);
            if (tplIdx < 0) {
                state.theConfig!.resourceRenderTemplates.push(structuredClone(renderTemplate));
            } else {
                state.theConfig!.resourceRenderTemplates[tplIdx] = structuredClone(renderTemplate);
            }
        },

    },
});

export const {
    _setConfig,
    _addLocalConceptToConfig,
    _deleteLocalConceptFromConfig,
    _saveLocalRenderTemplate,
} = configSlice.actions;

export const selectConfig = (state: TpRootState) => state.config;

export default configSlice.reducer;
