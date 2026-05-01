import { TpConcept } from "../../data/interfaces";
import { TpDataSource } from "../../util/data-sources/file-parsers/interface";




export interface TpImportResourceContext {
    dataSource: TpDataSource;
    existingLocalConcept? : TpConcept; // if set, the form is used to modify an existing local concept rahter than to import a new resource. The datasource provided is then only used as a reference for the data structure
}


