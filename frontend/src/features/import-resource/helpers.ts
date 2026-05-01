import { TpConcept } from "../../data/interfaces";
import { TpConfigData } from "../../data/store/configSlice";
import { findDataSourceGroupByPath, hasDataSourceData } from "../../util/data-sources/dataSourceStructure";
import { TpDataSource } from "../../util/data-sources/file-parsers/interface";
import { guid } from "../../util/misc";


function hasCompatibleTableStructure(concept: TpConcept, dataSource: TpDataSource): boolean {
    for (const table of concept.tableConcepts) {
        const group = findDataSourceGroupByPath(dataSource, table.path)
        if (!group) return false;
        for (const prop of table.properties)
            if (!hasDataSourceData(dataSource, prop.path)) return false;
    }
    return true;
}


export function getCompatibleExistingConcepts(config: TpConfigData, dataSource: TpDataSource): TpConcept[] {
    // Returns all concepts that are compatible with a given data source,
    // i.e. where all the tables and properties defined in the concept are present in that data source
    const compatibleConcepts: TpConcept[] = [];
    for (const concept of config.theConfig!.ontology.concepts) {
        if (!concept.isTable) {
            if (hasCompatibleTableStructure(concept, dataSource))
                compatibleConcepts.push(concept);
        }
    }
    return compatibleConcepts;
}


export function createNewConceptDefinition(): TpConcept {
    return {
        isLocal: true,
        isTable: false,
        id: 'concept_' + guid().replaceAll('-', '_'),
        name: '',
        namePlural: '',
        description: '',
        tableConcepts: [],
        globalAttributeDefs: [],
    }
}