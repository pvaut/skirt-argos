import { TpColumnData, TpTableData } from "../../../../data/tables/interface";
import { getTableColumn } from "../../../../data/tables/table";
import { TpVector } from "../../../../util/geometry/vector";
import { combineRange, getArrayAverage, getArrayValueRange, getRangeSize } from "../../../../util/geometry/viewport2D";
import { TpVolumeBasis } from "../../../../util/geometry/viewportVolume";
import { SYNCGROUP_TYPES, TpElemInfo, TpResourceRenderContext } from "../interface";


export function getChartVolumeBasis(resourceRenderCtx: TpResourceRenderContext, elemInfo: TpElemInfo, ownChannelPosition: TpColumnData): TpVolumeBasis {

    const syncGroup = elemInfo.syncGroups[SYNCGROUP_TYPES.VOLUME];

    function getTable(tableId: string): TpTableData | undefined {
        return resourceRenderCtx.resourceTables.find(table => table.tableData.id == tableId)?.tableData;
    }

    const ownColPosX = ownChannelPosition.subComponents[0];
    const ownColPosY = ownChannelPosition.subComponents[1];
    const ownColPosZ = ownChannelPosition.subComponents[2];

    // We start by taking the range of the target chart
    const consolidatedRangeX = getArrayValueRange(ownColPosX, true);
    const consolidatedRangeY = getArrayValueRange(ownColPosY, true);
    const consolidatedRangeZ = getArrayValueRange(ownColPosZ, true);

    // We start by taking the average position of the target chart as center of the volume
    const volumeCenters: TpVector[] = [{
        x: getArrayAverage(ownColPosX),
        y: getArrayAverage(ownColPosY),
        z: getArrayAverage(ownColPosZ),
    }];

    // In casse this chart is part of a volume sync group, we need to take into account the other members too
    const usedWidgets = [];
    for (const widgetDef of resourceRenderCtx.dashboardWidgetDefs.dataWidgetsML) {
        if (widgetDef.elemTrStateId != elemInfo.elemTrStateId) {
            if (widgetDef.settings)
                if ((syncGroup && widgetDef.settings[SYNCGROUP_TYPES.VOLUME] == syncGroup))
                    usedWidgets.push(widgetDef)
        }
    }

    for (const widgetDef of usedWidgets) {
        const layer = widgetDef.layers[0]; // a bit of a hack: we assume there is a single layer
        const table = getTable(layer.table);
        if (table && layer.encodings.position) {
            const colPosition = getTableColumn(table, layer.encodings.position);
            const colPosX = colPosition.subComponents[0];
            const colPosY = colPosition.subComponents[1];
            const colPosZ = colPosition.subComponents[2];
            combineRange(consolidatedRangeX, getArrayValueRange(colPosX, true));
            combineRange(consolidatedRangeY, getArrayValueRange(colPosY, true));
            combineRange(consolidatedRangeZ, getArrayValueRange(colPosZ, true));
            volumeCenters.push({
                x: getArrayAverage(colPosX),
                y: getArrayAverage(colPosY),
                z: getArrayAverage(colPosZ),
            })
        }
    }

    const consolidatedCenter = { x: 0, y: 0, z: 0 };
    for (const center of volumeCenters) {
        consolidatedCenter.x += center.x;
        consolidatedCenter.y += center.y;
        consolidatedCenter.z += center.z;
    }
    consolidatedCenter.x /= volumeCenters.length;
    consolidatedCenter.y /= volumeCenters.length;
    consolidatedCenter.z /= volumeCenters.length;

    const volumeHalfRange = Math.max(
        consolidatedRangeX.max - consolidatedCenter.x,
        consolidatedCenter.x - consolidatedRangeX.min,
        consolidatedRangeY.max - consolidatedCenter.y,
        consolidatedCenter.y - consolidatedRangeY.min,
        consolidatedRangeZ.max - consolidatedCenter.z,
        consolidatedCenter.z - consolidatedRangeZ.min,
    );

    return {
        origin: consolidatedCenter,
        halfRange: volumeHalfRange,
    }
}
