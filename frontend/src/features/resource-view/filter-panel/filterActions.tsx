import { TpConcept, TpIssue, TpResourceInfo } from "../../../data/interfaces";
import { TpActiveResourcesData } from "../../../data/store/activeResourcesSlice";
import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { TpTableData } from "../../../data/tables/interface";
import { TpActiveResourcesStorage } from "../../../data/usage/useActiveResourcesStorage";
import { createOrUpdateDerivedProperty } from "../../../data/usage/useLoadTable";
import { TpTableStorage } from "../../../data/usage/useTablesStorage";
import { executeForm, TpForm, TpFormExecutionContext } from "../../../util/components/form/Form";
import { createFormString } from "../../../util/components/form/formFieldTypes";
import { createUserError, reportException } from "../../../util/errors";
import { getFilterTypeDef } from "../../../util/filters/filterTypeFactory";
import { TpFilterInstance } from "../../../util/filters/interfaces";
import { generateUniquePropertyId, guid } from "../../../util/misc";
import { computeCtxAddDataTable, createComputeCtx } from "../../../util/table-computations/helpers";
import { COMPUTATION_TYPES } from "../../../util/table-computations/interface";
import { parseTableComputationExpression } from "../../../util/table-computations/tableComputationExpression";
import { addWidget } from "../helpers";
import { shrollDashboardToBottom } from "../ResourceView";
import { createFilterStepsExport, importFilterSteps, showFilterEditor } from "./FilterEditor";



export function promptEditFilterStep(displayedTableInfo: { resourceInfo: TpResourceInfo, tableInfo: TpLoadedTableInfo, tableData: TpTableData, concept: TpConcept }, tablesStorage: TpTableStorage, filter: TpFilterInstance) {
    const filterType = getFilterTypeDef(filter.filterType);
    if (filterType.promptEditFilter) {
        filterType.promptEditFilter(displayedTableInfo.tableInfo, displayedTableInfo.tableData, filter).then((updatedFilter: TpFilterInstance) => {
            tablesStorage.addFilter(displayedTableInfo.tableInfo.uri, updatedFilter);
        })
    }
}


export async function promptFilterActions(activeResourcesStorage: TpActiveResourcesStorage, tablesStorage: TpTableStorage, resourceInfo: TpResourceInfo, tableInfo: TpLoadedTableInfo, tableData: TpTableData) {

    const hasFilter = tableInfo.currentFilterSteps.length > 0;
    const form: TpForm = {
        name: 'Filter definition',
        fields: [],
        buttons: [],
    }
    if (hasFilter) form.buttons.push({ id: 'copy', name: "Copy to clipboard" });
    form.buttons.push({ id: 'paste', name: "Paste from clipboard" });
    form.buttons.push({ id: 'edit', name: "Edit" });
    if (hasFilter) form.buttons.push({ id: 'convert', name: "Convert to property" });
    const resp = await executeForm(form);
    const choice = (resp as any).buttonId;

    if (choice == 'copy') {
        const text = createFilterStepsExport(tableInfo.currentFilterSteps, tableData);
        await navigator.clipboard.writeText(text);
    }
    if (choice == 'paste') {
        const text = await navigator.clipboard.readText();
        try {
            importFilterSteps(tablesStorage, tableInfo, tableData, text);
            close();
        } catch (e) { reportException(e) }
    }
    if (choice == 'edit')
        showFilterEditor(resourceInfo, tableInfo, tableData);
    if (choice == 'convert')
        promptConvertFilterToProp(activeResourcesStorage, tablesStorage, resourceInfo, tableInfo, tableData);
}


async function promptConvertFilterToProp(activeResourcesStorage: TpActiveResourcesStorage, tablesStorage: TpTableStorage, resourceInfo: TpResourceInfo, tableInfo: TpLoadedTableInfo, tableData: TpTableData) {
    const fieldPropName = createFormString('propName', "Property name", "Current filter", 1);
    fieldPropName.validator = (ctx: TpFormExecutionContext, value: any) => {
        if (!value) throw "Property name should not be empty";
    };

    const form: TpForm = {
        name: 'Convert filter to property',
        fields: [fieldPropName],
        buttons: [],
    }
    const resp = await executeForm(form);
    createPropertyFromFilter(activeResourcesStorage, tablesStorage, resourceInfo, tableInfo, tableData, (resp as any).data.propName, "Filters")
}


function createPropertyFromFilter(activeResourcesStorage: TpActiveResourcesStorage, tablesStorage: TpTableStorage, resourceInfo: TpResourceInfo, tableInfo: TpLoadedTableInfo, dataTable: TpTableData, propName: string, propGroupName: string) {

    let expression: string;
    try {
        expression = createExpressionFromFilter(tableInfo, dataTable);
    } catch (e) {
        reportException(e);
        return;
    }

    const id = generateUniquePropertyId(dataTable, propName);
    activeResourcesStorage.addComputationRecipe(resourceInfo.uri, dataTable.id,id, propName, "Filters", expression, "", "", null);

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_COLUMN);
    computeCtxAddDataTable(computeCtx, dataTable, false, false);

    const computation = parseTableComputationExpression(
        computeCtx,
        expression,
        (issue: TpIssue) => { }
    );
    createOrUpdateDerivedProperty(
        resourceInfo, dataTable,
        id, propName, propGroupName, "", "", null,
        computeCtx, computation,
    );

    tablesStorage.recalculateFilter(dataTable.tableUri);
    tablesStorage.incrementVersion(dataTable.tableUri); // used to trigger an update of the dashboard, in case charts depend on this derived prop

    const widgetInfo = {
        elemDef: {
            elemTrStateId: guid(),
            type: "categoricalFacet",
            size: { height: "600px", width: "100%" },
            encodings: { categories: id },
            table: dataTable.id
        },
        name: propName,
    }

    addWidget(activeResourcesStorage, resourceInfo, widgetInfo);
    shrollDashboardToBottom(resourceInfo.uri);
}


function createExpressionFromFilter(tableInfo: TpLoadedTableInfo, dataTable: TpTableData): string {
    const tokens: string[] = [];
    for (const step of tableInfo.currentFilterSteps) {
        const filterType = getFilterTypeDef(step.filterType);
        if (!filterType.toExpression) throw createUserError(`Cannot convert this filter to an expressiuon`);
        tokens.push(filterType.toExpression(step, dataTable));
    }

    return tokens.map(tok => `(${tok})`).join(' && ');
}