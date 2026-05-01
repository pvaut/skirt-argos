
import { getResourceRenderTemplate, useConfig } from "../../data/helpers";
import { useLocalResourcesStorage } from "../../data/usage/useLocalResourcesStorage";

import { load as loadYaml, dump as dumpYaml } from 'js-yaml';

import styles from './StartPage.module.scss';
import { locDb } from "../../data/local-database/localDatabase";
import FileSelector from "../../util/data-sources/upload-file-selector/FileSelector";
import { getConfirmation } from "../../util/components/simple-modals/ConfirmationPopup";
import { promptUpdateLocalConceptDef } from "../import-resource/PromptImportResource";
import { closeSourceFile, openSourceFileFromBuffer } from "../../util/data-sources/file-parsers/sourceFileParser";
import { processWithWait } from "../../util/processWithWait";
import { useRef, useState } from "react";
import { contextMenuSeparator, promptContextMenuItems } from "../../util/components/context-menu/ContextMenu";
import { CircularButton } from "../../util/components/buttons/circular-button/CircularButton";
import { saveJsonToLocalYaml } from "../../util/download/saveJsonToLocalYaml";
import { ResourceTile } from "./ResourceTile";
import { SearchBar } from "./SearchBar";
import { TpResourceInfo } from "../../data/interfaces";
import { messagePopup, showError } from "../../util/components/simple-modals/MessagePopup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";



interface TpResourceTilesListProps {
}


export function ResourceTilesList({ }: TpResourceTilesListProps) {

    const [searchText, setSearchText] = useState("");
    const [activeConceptFilter, setActiveConceptFilter] = useState<string | null>(null);


    const config = useConfig();
    const localResourcesStorage = useLocalResourcesStorage();

    const localResources = localResourcesStorage.getResourcesList();

    const refMenuButton = useRef<HTMLDivElement>(null);
    const conceptImportRef = useRef<HTMLInputElement | null>(null);

    function importConceptDef() {
        if (conceptImportRef.current) { conceptImportRef.current.click(); }
    }

    async function handleConceptImportFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        const contentText = await file.text();
        try {
            const contentObj = loadYaml(contentText) as any;
            if (!contentObj.conceptDefinition || !contentObj.dashboardTemplate || !contentObj.conceptDefinition.id)
                throw "Inalid file structure";
            const conceptId = contentObj.conceptDefinition.id;
            if (localResourcesStorage.hasConcept(conceptId))
                throw `Concept with id "${conceptId}" is already present`;
            await locDb.addConceptDef(contentObj.conceptDefinition);
            localResourcesStorage.addConcept(contentObj.conceptDefinition);
            localResourcesStorage.saveRenderTemplate(contentObj.dashboardTemplate);
            locDb.storeConceptRenderTemplate(conceptId, contentObj.dashboardTemplate);

        } catch (e) {
            showError(`Unable to import concept definition yaml file: ${String(e)}`);
        }
    }

    function removeUnusedConcepts() {
        const usedConceptMap: { [id: string]: boolean } = {};
        for (const resource of localResources) usedConceptMap[resource.conceptId] = true;
        const unusedConcepts = localResourcesStorage.getConceptsList().filter(concept => !usedConceptMap[concept.id]);
        if (unusedConcepts.length == 0) {
            messagePopup({ title: "Confirmation", description: "There are no unused concept definitions" });
        } else {
            getConfirmation({ title: "Confirmation", description: `Do you want to permanently remove the unused concept(s) ${unusedConcepts.map(concept => `"${concept.name}"`).join(', ')} ?` }).then(async (accepted) => {
                if (!accepted) return;
                for (const concept of unusedConcepts) {
                    localResourcesStorage.deleteConcept(concept.id);
                    locDb.removeConcept(concept.id);
                }
            });
        }

    }

    function removeAllLocal() {
        getConfirmation({ title: "Confirmation", description: "Are you sure you want to permanently delete all locally stored resources?" }).then(async (accepted) => {
            if (!accepted) return;
            await locDb.removeAll();
            location.reload();
        });
    }

    function editExistingLocalConcept(referenceResourceUri: string) {
        const referenceResource = localResourcesStorage.getResource(referenceResourceUri);
        const existingLocalConcept = localResourcesStorage.getConcept(referenceResource.conceptId);
        locDb.loadResourceSourceData(referenceResourceUri).then(data => {

            processWithWait(
                "Loading data",
                () => openSourceFileFromBuffer(referenceResource.dataSourceType, referenceResourceUri, data!)
            ).then((dataSourceFile) => {
                promptUpdateLocalConceptDef({ dataSource: dataSourceFile, existingLocalConcept })
                    .then((resp) => {
                        const updatedConcept = resp.newConceptDefinition!;
                        locDb.addConceptDef(updatedConcept!);
                        localResourcesStorage.addConcept(updatedConcept);
                        closeSourceFile(dataSourceFile);
                    })
                    .catch(() => {
                        closeSourceFile(dataSourceFile);
                    });
            })

        });
    }

    function exportConceptDef(referenceResourceUri: string) {
        const referenceResource = localResourcesStorage.getResource(referenceResourceUri);
        const conceptDefinition = localResourcesStorage.getConcept(referenceResource.conceptId);
        const dashboardTemplate = getResourceRenderTemplate(config, conceptDefinition.id);
        const data = {
            conceptDefinition,
            dashboardTemplate,
        }
        saveJsonToLocalYaml(data, `${conceptDefinition.id}.yaml`);
    }


    function isResourceInFilter(resource: TpResourceInfo): boolean {
        if (!searchText) return true;
        const adaptedSearchtext = searchText.toLocaleLowerCase();
        if (resource.name.toLocaleLowerCase().includes(adaptedSearchtext)) return true;
        if (resource.description.toLocaleLowerCase().includes(adaptedSearchtext)) return true;
        const conceptDefinition = localResourcesStorage.getConcept(resource.conceptId);
        if (conceptDefinition.name.toLocaleLowerCase().includes(adaptedSearchtext)) return true;
        return false;
    }

    const renderedConcepts = localResourcesStorage.getConceptsList().filter(concept => !concept.isTable).map(concept => (
        <div
            key={concept.id}
            className={activeConceptFilter == concept.id ? styles.conceptTagActive : styles.conceptTag}
            onClick={() => {
                if (activeConceptFilter != concept.id) setActiveConceptFilter(concept.id);
                else setActiveConceptFilter(null);
            }}
        >
            <span style={{ display: 'inline-block', position: 'relative', top: '-3px', opacity: 0.3, fontSize: '120%', paddingRight: '3px' }}>
                <FontAwesomeIcon icon="filter" />
            </span>
            {concept.name}
        </div>
    ));

    const renderedResources =
        localResources
            .filter(resource => (!activeConceptFilter) || (activeConceptFilter == resource.conceptId))
            .filter(resource => isResourceInFilter(resource))
            // .toSorted((a, b) => a.name.localeCompare(b.name))
            .toSorted((a, b) => a.creationTimeStamp == b.creationTimeStamp ? 0 : (a.creationTimeStamp < b.creationTimeStamp ? -1 : 1))
            .map(resource => (
                <div key={resource.uri} style={{ display: 'inline-block' }}>
                    <ResourceTile
                        resource={resource}
                        searchText={searchText}
                        associatedConcept={localResourcesStorage.getConcept(resource.conceptId)}
                        editExistingLocalConcept={editExistingLocalConcept}
                        exportConceptDef={exportConceptDef}
                    />
                </div>
            ));




    function promptContextMenu() {
        promptContextMenuItems(refMenuButton.current!, {
            items: [
                {
                    name: 'Import concept definition...',
                    description: 'Import the definition of a concept from a yaml file that was exported from Argos.',
                    action: importConceptDef,
                },
                contextMenuSeparator,
                {
                    name: 'Remove unused concepts...',
                    description: 'Permanently remove all concept definitions that are not currently used by any resource.',
                    action: removeUnusedConcepts,
                },
                {
                    name: 'Remove all local data...',
                    description: 'Permanently remove all resources that have been stored locally, and reverting to the default Argos example set.',
                    action: removeAllLocal,
                }
            ]
        });
    }

    return (<div>

        <div>
            <h1 style={{display: 'inline-block'}}>Resources Overview</h1>
            <div style={{ display: 'inline-block', verticalAlign: 'top', paddingTop: 38, paddingLeft: 10 }}>
                <div ref={refMenuButton}>
                    <CircularButton
                        icon="bars"
                        onClick={promptContextMenu}
                    />
                </div>
            </div>
        </div>
        <SearchBar
            updateSearch={(newText: string) => setSearchText(newText)}
        />
        <div style={{ textAlign: 'center' }}>
            <div className={styles.conceptTagSet}>
                {renderedConcepts}
            </div>
        </div>
        {(renderedResources.length == 0) && <div style={{ textAlign: 'center', fontStyle: 'italic' }}>No resources found</div>}
        <div className={styles.tilesGrid}>
            {renderedResources}
            {!activeConceptFilter && (
                <div style={{ margin: '15px', display: 'inline-block', verticalAlign: 'top' }}>
                    <FileSelector />
                </div>
            )}
        </div>
        <input
            ref={conceptImportRef}
            type="file"
            accept=".yaml"
            style={{ display: 'none' }}
            onChange={handleConceptImportFileSelect}
        />

    </div>);
}