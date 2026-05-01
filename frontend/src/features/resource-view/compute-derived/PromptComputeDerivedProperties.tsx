import { useState } from "react";
import { useActiveResourcesStorage } from "../../../data/usage/useActiveResourcesStorage";
import { useTablesStorage } from "../../../data/usage/useTablesStorage";
import { postAMessage, useMessageListener } from "../../../util/messageBus";
import { TpResourceRenderContext } from "../element-types/interface";
import { PopupPortal } from "../../../util/components/popup-portal/PopupPortal";
import { ColumnPickerList } from "../data-widget/create-widget/ColumnPickerList";

import stylesCreateWidget from '../data-widget/create-widget/PromptCreateWidget.module.scss';
import styles from './PromptComputeDerivedProperties.module.scss';
import { TpComputationRecipe, TpIssue, TpResourceInfo } from "../../../data/interfaces";
import { StyledButton } from "../../../util/components/buttons/styled-button/StyledButton";
import { DerivedPropertyEditor } from "./DerivedPropertyEditor";
import { generateUniquePropertyId } from "../../../util/misc";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getTableComputationExpressionDependencies, parseTableComputationExpression } from "../../../util/table-computations/tableComputationExpression";
import { createOrUpdateDerivedProperty } from "../../../data/usage/useLoadTable";
import ReactCodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { getConfirmation } from "../../../util/components/simple-modals/ConfirmationPopup";
import { TpTableData } from "../../../data/tables/interface";
import { CopyClipboardButton } from "../../../util/components/buttons/copy-clipboard-button/CopyClipboardButton";
import { messagePopup } from "../../../util/components/simple-modals/MessagePopup";
import { computeCtxAddDataTable, computeCtxAddResourceAttributes, createComputeCtx } from "../../../util/table-computations/helpers";
import { COMPUTATION_TYPES } from "../../../util/table-computations/interface";


const MESSAGE_PROMPT_COMPUTE_DERIVED = "_msgMESSAGE_PROMPT_COMPUTE_DERIVED";


function getComputationRecipes(resourceInfo: TpResourceInfo, tableId: string): TpComputationRecipe[] {
    if (!resourceInfo.renderTemplate ||
        (!resourceInfo.renderTemplate.computationRecipes) ||
        (!resourceInfo.renderTemplate.computationRecipes[tableId])) return [];
    return resourceInfo.renderTemplate.computationRecipes[tableId]
}


interface TpCtx {
    resourceRenderCtx: TpResourceRenderContext;
}


export function editComputeDerivedProperties(resourceRenderCtx: TpResourceRenderContext) {
    const ctx: TpCtx = { resourceRenderCtx };
    let isRestricted = false;
    for (const table of resourceRenderCtx.resourceTables) {
        if (table.tableInfo.restrictionFilterSteps.length > 0)
            isRestricted = true;
    }
    if (isRestricted) {
        messagePopup({ title: "Error", description: "Please remove restrictions before computing new columns", isError: true });
    } else {
        postAMessage(MESSAGE_PROMPT_COMPUTE_DERIVED, ctx);
    }
}


function getDependentRecipeInfos(resourceInfo: TpResourceInfo, dataTable: TpTableData, recipesList: TpComputationRecipe[], id: string): TpComputationRecipe[] {
    const theList: TpComputationRecipe[] = [];

    const dependentColIdsMap: { [colId: string]: boolean } = { [id]: true };

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_COLUMN);
    computeCtxAddDataTable(computeCtx, dataTable, false, false);
    computeCtxAddResourceAttributes(computeCtx, resourceInfo);

    for (const recipe of recipesList) {
        const computation = parseTableComputationExpression(
            computeCtx,
            recipe.expression,
            (issue: TpIssue) => { }
        );
        let isDependent = false;
        const dependentColumns = getTableComputationExpressionDependencies(computeCtx, computation);
        for (const column of dependentColumns)
            if (dependentColIdsMap[column.id]) isDependent = true;
        if (isDependent) {
            dependentColIdsMap[recipe.id] = true;
            theList.push(recipe);
        }
    }
    return theList;
}


export function PromptComputeDerivedPropertiesModal() {

    const tablesStorage = useTablesStorage();
    const activeResourcesStorage = useActiveResourcesStorage();


    const [currentTableIdx, setCurrentTableIdx] = useState(0);
    const [currentCtx, setCurrentCtx] = useState<TpCtx | null>(null);

    const [editingExistingId, setEditingExistingId] = useState<string | null>(null);
    const [editingNew, setEditingNew] = useState(false);
    const [computingRecipe, setComputingRecipe] = useState<string | null>(null);
    const [computingRecipeText, setComputingRecipeText] = useState("");

    const editing = editingExistingId || editingNew;

    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    useMessageListener(MESSAGE_PROMPT_COMPUTE_DERIVED, (type: string, messageBody: any) => {
        setCurrentTableIdx(0);
        setCurrentCtx(messageBody as TpCtx);
        setSelectedColumns([]);
        setEditingExistingId(null);
        setEditingNew(false);
    });

    if (!currentCtx) return null;
    if (currentCtx.resourceRenderCtx.resourceTables.length == 0) return null;
    const dataTable = currentCtx.resourceRenderCtx.resourceTables[currentTableIdx].tableData;
    if (!dataTable) return null;

    // Note: we get it from the store, in order to have the up-to-date version
    const resourceInfo = activeResourcesStorage.getActiveResource(currentCtx.resourceRenderCtx.resourceInfo.uri);

    const renderedTables = currentCtx.resourceRenderCtx.resourceTables.map((table, idx) => (
        <div
            className={(idx == currentTableIdx) ? stylesCreateWidget.tableActive : stylesCreateWidget.table}
            key={table.tableData.id}
            onClick={() => {
                if (idx != currentTableIdx) {
                    setSelectedColumns([]);
                    setCurrentTableIdx(idx);
                }
            }}
        >
            {table.tableData.name}
        </div>
    ));

    const recipes = getComputationRecipes(resourceInfo, currentCtx.resourceRenderCtx.resourceTables[currentTableIdx].tableData.id);

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_COLUMN);
    computeCtxAddDataTable(computeCtx, dataTable, false, false);
    computeCtxAddResourceAttributes(computeCtx, currentCtx.resourceRenderCtx.resourceInfo);

    const renderedRecipes = recipes.map(recipe => {
        const issues: string[] = []
        const computation = parseTableComputationExpression(
            computeCtx,
            recipe.expression,
            (issue: TpIssue) => { issues.push(issue.message) }
        );
        return (
            <div key={recipe.id} className={editing ? styles.computeItemWrapper : styles.computeItemWrapperCanEdit}>
                {(editingExistingId != recipe.id) && (
                    <div
                        onClick={() => { if (!editing) setEditingExistingId(recipe.id) }}
                    >
                        <div className={styles.computeItemName}>{recipe.name || recipe.id}</div>
                        <div className={styles.identifier}><CopyClipboardButton content={recipe.id} />{recipe.id}</div>
                        <div>
                            <ReactCodeMirror
                                value={recipe.expression}
                                width="100%"
                                extensions={[javascript({ jsx: true })]}
                                theme={'dark'}
                                editable={false}
                                // autoFocus={true}
                                basicSetup={{
                                    lineNumbers: false
                                }}
                            />

                        </div>
                        {!editing &&
                            <div
                                className={styles.computeItemRemoveButton}
                                onClick={(ev) => {
                                    getConfirmation({ title: "Confirmation", description: "Are you sure you want to permanently delete this computed property?" }).then((accepted) => {
                                        if (!accepted) return;
                                        activeResourcesStorage.deleteComputationRecipe(resourceInfo.uri, dataTable.id, recipe.id);
                                    });
                                    ev.stopPropagation();
                                }}
                            >
                                <FontAwesomeIcon icon="trash-can" />
                            </div>}
                        {(issues.length > 0) && <div className={styles.issues}>{issues.join('; ')}</div>}
                    </div>
                )}
                {(editingExistingId == recipe.id) && (<DerivedPropertyEditor
                    initialName={recipe.name}
                    initialExpression={recipe.expression}
                    initialDescription={recipe.description}
                    initialUnitName={recipe.unitName}
                    initialDecimalDigits={recipe.decimalDigits}
                    resourceInfo={currentCtx.resourceRenderCtx.resourceInfo}
                    dataTable={dataTable}
                    onOK={(name: string, expression: string, description: string, unitName: string, decimalDigits: number | null) => updateExistingRecipe(recipe.id, name, expression,description, unitName, decimalDigits)}
                />)}
                {(computingRecipe == recipe.id) && <div className={styles.computingTag}>Computing {computingRecipeText}</div>}
            </div>
        )
    });

    function updateExistingRecipe(id: string, name: string, expression: string, description: string, unitName:string, decimalDigits: number | null) {
        setEditingExistingId(null);
        activeResourcesStorage.modifyComputationRecipe(resourceInfo.uri, dataTable.id, id, name, expression, description, unitName, decimalDigits);
        setTimeout(() => {
            computeDerivedColumns([
                { id, name, groupName: null, expression,description, unitName, decimalDigits, },
                ...getDependentRecipeInfos(currentCtx?.resourceRenderCtx.resourceInfo!, dataTable, recipes, id)
            ]);
        }, 100);
    }

    function startEditNew() { setEditingNew(true) }

    function addNewRecipe(name: string, expression: string, description: string, unitName:string, decimalDigits: number | null) {
        setEditingNew(false);
        const id = generateUniquePropertyId(dataTable, name);
        activeResourcesStorage.addComputationRecipe(resourceInfo.uri, dataTable.id, id, name, null, expression, description, unitName, decimalDigits);
        setTimeout(() => {
            computeDerivedColumns([
                { id, name, groupName: null, expression, description, unitName, decimalDigits }
            ]);
        }, 100);
    }

    function computeDerivedColumns(recipes: TpComputationRecipe[]) {

        setComputingRecipe(recipes[0].id);
        setComputingRecipeText(recipes.map(recipe => recipe.name).join(', '));
        setTimeout(() => {
            for (const recipe of recipes) {
                const computation = parseTableComputationExpression(
                    computeCtx,
                    recipe.expression,
                    (issue: TpIssue) => { }
                );
                createOrUpdateDerivedProperty(resourceInfo, dataTable,
                    recipe.id, recipe.name, null, recipe.description, recipe.unitName, recipe.decimalDigits,
                    computeCtx, computation);

            }
            tablesStorage.recalculateFilter(dataTable.tableUri);
            tablesStorage.incrementVersion(dataTable.tableUri); // used to trigger an update of the dashboard, in case charts depend on this derived prop
        }, 50);
        setTimeout(() => { setComputingRecipe(null); }, 150);
    }

    return (
        <PopupPortal
            close={() => {
                setCurrentCtx(null);
            }}
        >
            <div className={styles.wrapper}>
                <div className={stylesCreateWidget.leftPart}>
                    <div className={stylesCreateWidget.tables}>
                        {renderedTables}
                    </div>
                    <div className={stylesCreateWidget.columns}>
                        <ColumnPickerList
                            dataTable={dataTable}
                            singleSelectedColumn={null}
                            multiSelectedColumns={selectedColumns}
                            showIdentifiers={true}
                        //onClickColumn={handleClickColumn}
                        />
                    </div>
                </div>

                <div className={styles.computeArea}>

                    {renderedRecipes}

                    {editingNew && <DerivedPropertyEditor
                        resourceInfo={currentCtx.resourceRenderCtx.resourceInfo}
                        dataTable={dataTable}
                        initialDecimalDigits={null}
                        onOK={addNewRecipe}
                    />}

                    {(!editing) && (
                        <div style={{ paddingTop: "25px" }}>
                            <StyledButton
                                text="New computed property..."
                                onClick={startEditNew}
                            />
                        </div>)
                    }

                </div>

            </div>
        </PopupPortal>
    );
}