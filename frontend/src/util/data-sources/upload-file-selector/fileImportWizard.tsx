import { getConcept, getTableConceptId, path2Id } from "../../../data/helpers";
import { TpConcept, TpResourceInfo } from "../../../data/interfaces";
import { locDb } from "../../../data/local-database/localDatabase";
import { TpConfigData } from "../../../data/store/configSlice";
import { TpLocalResourcesStorage } from "../../../data/usage/useLocalResourcesStorage";
import { promptImportResource } from "../../../features/import-resource/PromptImportResource";
import { executeForm, TpForm } from "../../components/form/Form";
import { messagePopup, showError } from "../../components/simple-modals/MessagePopup";
import { createInternalError, reportException } from "../../errors";
import { processWithWait } from "../../processWithWait";
import { TpMemFile } from "../file-parsers/interface";
import { loadMemFile } from "../file-parsers/memFile";
import { closeSourceFile, getSourceFileType, openSourceFileFromBuffer } from "../file-parsers/sourceFileParser";



export function addTablesToResource(config: TpConfigData | null, resourceDef: TpResourceInfo, newConceptDefinition: TpConcept | null) {
    if (!config && !newConceptDefinition) throw createInternalError(`Missing some context`);
    const concept = newConceptDefinition || getConcept(config!, resourceDef.conceptId);
    for (const table of concept.tableConcepts) {
        resourceDef.tables.push({
            id: path2Id(table.path),
            concept: getTableConceptId(concept.id, table.path),
        })
    }
}


async function addNewResource(config: TpConfigData, localResourcesStorage: TpLocalResourcesStorage, resourceDef: TpResourceInfo, newConceptDefinition: TpConcept | null, memFile: TpMemFile) {
    addTablesToResource(config, resourceDef, newConceptDefinition);
    if (newConceptDefinition) {
        await locDb.addConceptDef(newConceptDefinition);
        localResourcesStorage.addConcept(newConceptDefinition);
    }
    localResourcesStorage.addResource(resourceDef);
    await locDb.addResource(resourceDef, memFile);
}


async function confirmLargeFileSize(file: File): Promise<boolean> {

    return new Promise((resolve, reject) => {

        const theForm: TpForm = {
            name: 'WARNING',
            fields: [],
            customFormElement: (<>
                <p>This is a large source file ({(file.size / 1E9).toFixed(2)}Gb). Due to limitations of the web browser, importing this file may fail.</p>
                <p>What are my options?</p>
                <ul>
                    <li>Proceed anyway with an import attempt</li>
                    <li>Abort the current import, and reduce the file size by including fewer columns</li>
                    <li>Abort the current import, and reduce the file size by subsampling the table data</li>
                </ul>
            </>),
            buttons: [{ id: 'ok', name: 'Proceed' }, { id: 'cancel', name: 'Abort' }],
        }
        executeForm(theForm).then((rs) => {
            resolve((rs as any).buttonId == 'ok');
        }).catch(() => { resolve(false) })

    });
}


export async function fileImportWizard(config: TpConfigData, localResourcesStorage: TpLocalResourcesStorage, file: File, clearInput: () => void) {

    if (file.size > 1E9)
        if (!await confirmLargeFileSize(file)) return;

    const buffer = await loadMemFile(file);

    try {
        const sourceFileType = getSourceFileType(file.name);

        processWithWait("Loading source file",
            () => openSourceFileFromBuffer(sourceFileType, file.name, buffer)
        ).then((dataSource) => {
            if (dataSource.error) {
                showError(`Unable to read data source file (${dataSource.error})`);
                return;
            }
            clearInput();
            if (dataSource.error) {
                messagePopup({ title: "Error", description: dataSource.error, isError: true });
            } else {
                promptImportResource({ dataSource, })
                    .then(async (resp) => {
                        closeSourceFile(dataSource);
                        await addNewResource(config, localResourcesStorage, resp.resourceDef, resp.newConceptDefinition, buffer)
                    })
                    .catch(() => {
                        closeSourceFile(dataSource);
                    });
            }
        })

    } catch (e) {
        reportException(e);
    }

}