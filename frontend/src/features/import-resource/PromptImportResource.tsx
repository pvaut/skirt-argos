import { useEffect, useRef, useState } from "react";
import styles from './PromptImportResource.module.scss';
import { PopupPortal } from "../../util/components/popup-portal/PopupPortal";
import { postAMessage, useMessageListener } from "../../util/messageBus";
import { DataSourcetree } from "./DataSourceTree";
import { TpWizardDef, Wizard } from "../../util/components/wizard/Wizard";
import { createNewLocalResourceInfo, TpConcept, TpConceptTableDefinition, TpResourceInfo } from "../../data/interfaces";
import { ID_NEW_CONCEPT, StepDefineResourceInfo } from "./StepDefineResourceInfo";
import { TpImportResourceContext } from "./interfaces";
import { camelCaseToWords, useConfig } from "../../data/helpers";
import { createNewConceptDefinition, getCompatibleExistingConcepts } from "./helpers";
import { messagePopup } from "../../util/components/simple-modals/MessagePopup";
import { getDataSourceAvailableTables, getDataSourceGroupByPath } from "../../util/data-sources/dataSourceStructure";
import { StepDefineTables } from "./StepDefineTables";
import { StepDefineSingleTable } from "./StepDefineSingleTable";
import { createInternalError, reportException } from "../../util/errors";
import { getDefaultPropertyImportSettings, promptImportPropertyImportSettings } from "./prompt-property-import-settings/PrompPropertyImportSettings";
import { StepIntroUpdateExistingConcept } from "./StepIntroUpdateExistingConcept";
import { SOURCE_FILE_TYPES } from "../../util/data-sources/file-parsers/interface";
import { StepDefineAttribs } from "./StepDefineAttribs";
import { getConfirmation } from "../../util/components/simple-modals/ConfirmationPopup";


const MESSAGE_PROMPT_IMPORT_RESOURCE = "_msgPromptImportResource";

interface TpCtx {
    handleOK?: any;
    handleCancel?: any;
    importResourceCtx: TpImportResourceContext;
}


const STEP_START_IMPORT_RESOURCE = 'start_import_resource';
const STEP_START_EDIT_CONCEPT = 'start_edit_concept';
const STEP_TABLES = 'tables';
const STEP_DEF_GLOBAL_ATTRIBS = "step_def_attribs";


export function promptImportResource(importResourceCtx: TpImportResourceContext):
    Promise<{ resourceDef: TpResourceInfo, newConceptDefinition: TpConcept | null }> {

    return new Promise((resolve, reject) => {

        function handleOK(resourceDef: TpResourceInfo, newConceptDefinition: TpConcept | null) {
            if (resourceDef.conceptId == ID_NEW_CONCEPT)
                resourceDef.conceptId = newConceptDefinition!.id;
            resolve({ resourceDef, newConceptDefinition });
        }

        function handleCancel() { reject(); }

        const ctx: TpCtx = { handleOK, handleCancel, importResourceCtx, };
        postAMessage(MESSAGE_PROMPT_IMPORT_RESOURCE, ctx);
    });
}



export function promptUpdateLocalConceptDef(referenceResourceCtx: TpImportResourceContext):
    Promise<{ newConceptDefinition: TpConcept | null }> {

    return new Promise((resolve, reject) => {

        function handleOK(resourceDef: TpResourceInfo, newConceptDefinition: TpConcept | null) {
            if (resourceDef.conceptId == ID_NEW_CONCEPT)
                resourceDef.conceptId = newConceptDefinition!.id;
            messagePopup({ title: 'Success', description: `Concept ${newConceptDefinition?.name} has been updated` })
            resolve({ newConceptDefinition });
        }

        function handleCancel() {
            reject();
        }

        const ctx: TpCtx = { handleOK, handleCancel, importResourceCtx: referenceResourceCtx, };
        postAMessage(MESSAGE_PROMPT_IMPORT_RESOURCE, ctx);
    });
}



export function ConfigureLocalResourceModal() {

    useMessageListener(MESSAGE_PROMPT_IMPORT_RESOURCE, (type: string, messageBody: any) => {
        setCurrentStepNr(0);
        setCurrentCtx(messageBody as TpCtx);
    });


    const config = useConfig();

    const [currentCtx, setCurrentCtx] = useState<TpCtx | null>(null);
    const [resourceDef, setResourceDef] = useState(createNewLocalResourceInfo(SOURCE_FILE_TYPES.UNKNOWN));
    const [newConceptDefinition, setNewConceptDefinition] = useState<TpConcept | null>(null);
    const [currentStepNr, setCurrentStepNr] = useState(0);

    const treeScrollAreaRef = useRef<HTMLDivElement>(null)

    const existingLocalConcept = currentCtx?.importResourceCtx.existingLocalConcept;
    const editingExistingConcept = !!existingLocalConcept; // if true, the form is used to modify an existing local concept rather than to import a new resource. The datasource provided is used as a reference for the data structure


    let compatibleExistingConcepts: TpConcept[] = [];
    if (currentCtx?.importResourceCtx.dataSource && !editingExistingConcept)
        compatibleExistingConcepts = getCompatibleExistingConcepts(config, currentCtx!.importResourceCtx.dataSource);


    useEffect(() => {  // reset the definition when the input changed
        if (currentCtx) {
            if (!editingExistingConcept) {
                const newResourceDef = createNewLocalResourceInfo(currentCtx.importResourceCtx.dataSource.fileType);
                newResourceDef.name = currentCtx?.importResourceCtx.dataSource.fileName;
                if (compatibleExistingConcepts.length > 0) {
                    newResourceDef.conceptId = compatibleExistingConcepts[0].id;
                    setNewConceptDefinition(null);
                } else {
                    newResourceDef.conceptId = ID_NEW_CONCEPT;
                    setNewConceptDefinition(createNewConceptDefinition());
                }
                setResourceDef(newResourceDef);
            } else {
                setNewConceptDefinition(structuredClone(existingLocalConcept));
            }
        }
    }, [currentCtx]);


    function updateResourceDef(newResourceDef: TpResourceInfo) {
        if (newResourceDef.conceptId == ID_NEW_CONCEPT) {
            if (!newConceptDefinition)
                setNewConceptDefinition(createNewConceptDefinition());
        } else {
            if (newConceptDefinition)
                setNewConceptDefinition(null);
        }
        setResourceDef(structuredClone(newResourceDef));
    }

    function updateNewConceptDef(newConceptDef: TpConcept) {
        setNewConceptDefinition(structuredClone(newConceptDef));
    }

    function updateTableDef(tableDef: TpConceptTableDefinition) {
        if (!newConceptDefinition) throw createInternalError(`Expected new concept def`);
        const idx = newConceptDefinition.tableConcepts.findIndex(tb => tb.path == tableDef.path);
        if (idx < 0) throw createInternalError(`Table ${tableDef.path} not found in concept`);
        newConceptDefinition.tableConcepts[idx] = tableDef;
        setNewConceptDefinition(structuredClone(newConceptDefinition));
    }


    function verifyCanTakeStep(newStepNr: number): boolean {
        if ((currentWizardStepId == STEP_START_IMPORT_RESOURCE) && (newStepNr > currentStepNr)) {
            if (newConceptDefinition) {
                if (!newConceptDefinition.name) {
                    messagePopup({ title: 'Error', description: 'Please enter a name for the new concept', isError: true });
                    return false;
                }
            }
        }
        if ((currentWizardStepId == STEP_TABLES) && (newStepNr > currentStepNr)) {
            if (newConceptDefinition!.tableConcepts.length == 0) {
                messagePopup({ title: 'Error', description: 'Please define at least one table', isError: true });
                return false;
            }
        }
        if (stepTableDefinition && (stepTableDefinition?.properties.length == 0) && (newStepNr > currentStepNr)) {
            messagePopup({ title: 'Error', description: 'Please define at least one property for this table', isError: true });
            return false;
        }
        return true;
    }


    function addTable(path: string) {
        const autoName = camelCaseToWords(path.replaceAll('/', ' ')).trimStart();
        newConceptDefinition?.tableConcepts.push({
            path,
            nameSingle: autoName,
            namePlural: autoName,
            description: '',
            propertyGroups: [],
            properties: [],
            labelColumnPath: null,
        })
        updateNewConceptDef(newConceptDefinition!);
    }

    if (!currentCtx) return null;

    const dataSource = currentCtx.importResourceCtx.dataSource;


    const wizardDef: TpWizardDef = {
        steps: [],
        finishButtonText: '',
    }

    if (!editingExistingConcept) {
        wizardDef.steps.push({ id: STEP_START_IMPORT_RESOURCE, name: 'Resource Info' });
        wizardDef.finishButtonText = 'Create resource';

        if (newConceptDefinition) {
            wizardDef.steps.push({ id: STEP_TABLES, name: 'Define Table(s)' });
            for (const table of newConceptDefinition.tableConcepts)
                wizardDef.steps.push({ id: `DEF_TABLE__${table.path}`, name: `Define table ${table.path}` });
        }
    } else {
        wizardDef.steps.push({ id: STEP_START_EDIT_CONCEPT, name: 'Intro' });
        wizardDef.finishButtonText = 'Update concept';
        if (newConceptDefinition) {
            for (const table of newConceptDefinition.tableConcepts)
                wizardDef.steps.push({ id: `DEF_TABLE__${table.path}`, name: `Define table ${table.path}` });
        }
    }

    if (newConceptDefinition)
        wizardDef.steps.push({ id: STEP_DEF_GLOBAL_ATTRIBS, name: 'Define attributes' });

    const currentWizardStepId = wizardDef.steps[currentStepNr].id;

    let rootGroup = dataSource.root;
    let addedNodes: string[] = [];
    let addableNodes: string[] = [];
    let stepTableDefinition: TpConceptTableDefinition | null = null;

    if (currentWizardStepId == STEP_TABLES) {
        addableNodes = getDataSourceAvailableTables(dataSource);
        addedNodes = newConceptDefinition!.tableConcepts.map(table => table.path);
    }

    if (currentWizardStepId.startsWith('DEF_TABLE__')) {
        const tablePath = currentWizardStepId.split('__')[1];
        stepTableDefinition = newConceptDefinition!.tableConcepts.find(table => table.path == tablePath)!;
        rootGroup = getDataSourceGroupByPath(dataSource, tablePath);
        addableNodes = rootGroup.memberData.map(data => data.path);
        addedNodes = stepTableDefinition!.properties.map(prop => prop.path);
    }


    function addProperty(path: string) {
        try {
            const initialProp = getDefaultPropertyImportSettings(dataSource, path);
            promptImportPropertyImportSettings(dataSource, stepTableDefinition!, initialProp).then(({ prop }) => {
                stepTableDefinition!.properties.push(prop);
                updateNewConceptDef(newConceptDefinition!);
            });
        } catch (e) {
            reportException(e);
        }
    }


    return (
        <PopupPortal
            close={() => {
                getConfirmation({ title: 'Cancel', description: 'Cancel current form?' }).then((accepted) => {
                    if (accepted) {
                        currentCtx.handleCancel();
                        setCurrentCtx(null);
                    }
                });
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.treeArea} ref={treeScrollAreaRef}>
                    <DataSourcetree
                        rootGroup={rootGroup}
                        addableNodes={addableNodes}
                        onAddNode={(path: string) => {
                            if (currentWizardStepId == STEP_TABLES) addTable(path);
                            if (stepTableDefinition) addProperty(path);
                        }}
                        addedNodes={addedNodes}
                    />
                </div>
                <div className={styles.formArea}>
                    <Wizard
                        wizardDef={wizardDef}
                        currentStepNr={currentStepNr}
                        onStepChange={(newStepNr) => {
                            if (!verifyCanTakeStep(newStepNr)) return;
                            if (newStepNr >= wizardDef.steps.length) {
                                currentCtx.handleOK(resourceDef, newConceptDefinition);
                                setCurrentCtx(null);
                            }
                            else {
                                setCurrentStepNr(newStepNr);
                                treeScrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                        }}
                    >
                        {currentWizardStepId == STEP_START_IMPORT_RESOURCE &&
                            <StepDefineResourceInfo
                                importResourceCtx={currentCtx.importResourceCtx}
                                resourceDef={resourceDef}
                                compatibleExistingConcepts={compatibleExistingConcepts}
                                updateResourceDef={updateResourceDef}
                                newConceptDef={newConceptDefinition}
                                updateNewConceptDef={updateNewConceptDef}
                            />}
                        {currentWizardStepId == STEP_START_EDIT_CONCEPT && (
                            <StepIntroUpdateExistingConcept
                                conceptDef={newConceptDefinition!}
                                updateConceptDef={updateNewConceptDef}
                            />
                        )}
                        {currentWizardStepId == STEP_TABLES &&
                            <StepDefineTables
                                importResourceCtx={currentCtx.importResourceCtx}
                                newConceptDef={newConceptDefinition}
                                updateNewConceptDef={updateNewConceptDef}
                            />}
                        {stepTableDefinition &&
                            <StepDefineSingleTable
                                dataSource={dataSource}
                                tableDef={stepTableDefinition}
                                updateTableDef={updateTableDef}
                            />}
                        {(currentWizardStepId == STEP_DEF_GLOBAL_ATTRIBS) && (newConceptDefinition) &&
                            <StepDefineAttribs
                                importResourceCtx={currentCtx.importResourceCtx}
                                newConceptDef={newConceptDefinition}
                                updateNewConceptDef={updateNewConceptDef}
                            />}
                    </Wizard>
                </div>
            </div>
        </PopupPortal>
    );
}