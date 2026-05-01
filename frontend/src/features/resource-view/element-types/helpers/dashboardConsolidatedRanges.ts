
import { TpTableData } from "../../../../data/tables/interface";
import { getTableColumn } from "../../../../data/tables/table";
import { createInternalError } from "../../../../util/errors";
import { combineRange, getArrayValueRange, TpRange } from "../../../../util/geometry/viewport2D";

import { SYNCGROUP_TYPES, TpResourceRenderContext } from "../interface";





export function getDashboardConsolidatedRange(resourceRenderCtx: TpResourceRenderContext, syncGroupType: string, syncGroup: string): TpRange | undefined {

    const ranges: TpRange[] = [];

    function getTable(tableId: string): TpTableData | undefined {
        return resourceRenderCtx.resourceTables.find(table => table.tableData.id == tableId)?.tableData;
    }

    function getRange(tableId: string, columnId: string): TpRange | undefined {
        const table = getTable(tableId);
        if (!table) return undefined;
        return getArrayValueRange(getTableColumn(table, columnId), true);
    }

    let channelId = "";
    if (syncGroupType == SYNCGROUP_TYPES.XAXIS) channelId = "x";
    if (syncGroupType == SYNCGROUP_TYPES.YAXIS) channelId = "y";
    if (syncGroupType == SYNCGROUP_TYPES.SLICE) channelId = "slice";
    if (!channelId) throw createInternalError(`Unknown sync type: ${syncGroupType}`);

    for (const widgetDef of resourceRenderCtx.dashboardWidgetDefs.dataWidgetsML) {
        if (widgetDef.settings)
            for (const layer of widgetDef.layers) {
                if (widgetDef.settings[syncGroupType] == syncGroup)
                    if (layer.encodings[channelId]) {
                        const range = getRange(layer.table, layer.encodings[channelId]);
                        if (range) ranges.push(range);
                    }
            }
    }

    if (ranges.length == 0) return undefined;
    const consolidatedRange = ranges[0];
    for (let i = 1; i < ranges.length; i++)
        combineRange(consolidatedRange, ranges[i]);
    return consolidatedRange;
}