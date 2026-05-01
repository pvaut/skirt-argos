import { createTempDataTable } from "../../features/import-resource/prompt-property-import-settings/PropertyTransformationEditor";
import { getDataSourceDataDef } from "../../util/data-sources/dataSourceStructure";
import { TpDataSource } from "../../util/data-sources/file-parsers/interface";

import { createConfigError } from "../../util/errors";
import { computeCtxAddDataTable, computeCtxAddSourceDataAttributes, createComputeCtx } from "../../util/table-computations/helpers";
import { COMPUTATION_TYPES } from "../../util/table-computations/interface";
import { evalTableComputationExpressionSync, parseTableComputationExpression } from "../../util/table-computations/tableComputationExpression";
import { TpIssue, TpConceptTablePropertyDefinition } from "../interfaces";
import { TpColumnData } from "../tables/interface";


// Appplies the transformation defined at the concept level for a particular table property (column)
export function computeTransformation(dataSource: TpDataSource, prop: TpConceptTablePropertyDefinition, column: TpColumnData) {
    const transformationExpression = prop.transformationExpression;
    if ((!column.values) || (!transformationExpression) || (transformationExpression == 'x')) return; // nothing needs to be done in this case

    const tempDataTable = createTempDataTable(prop);
    tempDataTable.columns[0].values = column.values;

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_COLUMN);
    computeCtxAddDataTable(computeCtx, tempDataTable, false, false);
    const propDataSet = getDataSourceDataDef(dataSource, prop.path);
    computeCtxAddSourceDataAttributes(computeCtx, propDataSet.attributes);

    const issues: string[] = [];

    const computation = parseTableComputationExpression(
        computeCtx,
        transformationExpression,
        (issue: TpIssue) => { issues.push(issue.message) }
    );

    if (issues.length > 0) throw createConfigError(`Unable to transform column ${prop.path}: ${issues.join('; ')}`);

    column.values = evalTableComputationExpressionSync(computeCtx, computation);

}