import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { TpTableData } from "../../../data/tables/interface";
import { getTableColumn } from "../../../data/tables/table";
import { createInternalError } from "../../errors";
import { guid, perfTimerStart, perfTimerStop } from "../../misc";
import { getPointsInsidePolygon, TpPoint2D } from "../../geometry/point2D";
import { TpFilterInstance, TpFilterMask, TpFilterTypeDef } from "../interfaces";
import { getViewportVolumeCoordConvertors, TpViewportProjectionMatrix, TpViewportVolume } from "../../geometry/viewportVolume";

export const FILTER_TYPE_LASSO_3D = "Lasso3D";


export interface TpFilterInstanceLasso3D {
    filterType: string;
    uid: string;
    bindingPosition: string;
    filteringSteps: {
        projectionMatrix: TpViewportProjectionMatrix;
        polygon: TpPoint2D[];
        isRestricting: boolean;
        isExcluding: boolean;
    }[];
}


function createFilterInstance({ bindingPosition, polygon, viewport, isRestricting, isExcluding }:
    { bindingPosition: string, polygon: TpPoint2D[], viewport: TpViewportVolume, isRestricting: boolean, isExcluding: boolean })
    : TpFilterInstanceLasso3D {
    return {
        filterType: FILTER_TYPE_LASSO_3D,
        uid: guid(),
        bindingPosition,
        filteringSteps: [{
            polygon,
            projectionMatrix: getViewportVolumeCoordConvertors(viewport).projectionMatrix,
            isRestricting,
            isExcluding,
        }],
    }
}


function isSameFilter(filter1Inp: TpFilterInstance, filter2Inp: TpFilterInstance): boolean {
    if ((filter1Inp.filterType != FILTER_TYPE_LASSO_3D) || (filter2Inp.filterType != FILTER_TYPE_LASSO_3D))
        throw createInternalError("Unexpected filter type");
    const filter1 = filter1Inp as TpFilterInstanceLasso3D;
    const filter2 = filter2Inp as TpFilterInstanceLasso3D;
    return filter1.bindingPosition == filter2.bindingPosition;
}


function mergeFilters(filterOrigInp: TpFilterInstance, filterToAddInp: TpFilterInstance): TpFilterInstance | null {
    if ((filterOrigInp.filterType != FILTER_TYPE_LASSO_3D) || (filterToAddInp.filterType != FILTER_TYPE_LASSO_3D))
        throw createInternalError("Unexpected filter type");
    const filterOrig = filterOrigInp as TpFilterInstanceLasso3D;
    const filterToAdd = filterToAddInp as TpFilterInstanceLasso3D;
    if (filterToAdd.filteringSteps.length != 1) throw createInternalError(`Invalid filter to add: expected 1 step`)
    if (!filterToAdd.filteringSteps[0].isRestricting) { // we simply replace the filter
        const newFilter = structuredClone(filterOrig);
        newFilter.filteringSteps = structuredClone(filterToAdd.filteringSteps);
        return newFilter;
    } else { // we add this as a restriction
        const newFilter = structuredClone(filterOrig);
        newFilter.filteringSteps.push(structuredClone(filterToAdd.filteringSteps[0]));
        return newFilter;
    }
}


function applyFilter(tableData: TpTableData, filterInp: TpFilterInstance): TpFilterMask {
    const pf = perfTimerStart();
    const filter = filterInp as TpFilterInstanceLasso3D;
    const positColumn = getTableColumn(tableData, filter.bindingPosition);
    const values3DX = positColumn.subComponents[0].values;
    const values3DY = positColumn.subComponents[1].values;
    const values3DZ = positColumn.subComponents[2].values;

    let filterMask: Uint8Array | undefined;
    for (const filteringStep of filter.filteringSteps) {
        const { fx0, fxx, fxy, fxz, fy0, fyx, fyy, fyz } = filteringStep.projectionMatrix;
        const values2DX: number[] = [];
        const values2DY: number[] = [];
        for (let i = 0; i < values3DX.length; i++) {
            const x = values3DX[i], y = values3DY[i], z = values3DZ[i];
            values2DX.push(fx0 + fxx * x + fxy * y + fxz * z);
            values2DY.push(fy0 + fyx * x + fyy * y + fyz * z);
        }
        const filterMaskStep = getPointsInsidePolygon(filteringStep.polygon, values2DX, values2DY);
        if (!filterMask) filterMask = filterMaskStep;
        else {
            if (!filteringStep.isExcluding) {
                for (let i = 0; i < filterMaskStep.length; i++)
                    if (!filterMaskStep[i]) (filterMask!)[i] = 0;
            } else {
                for (let i = 0; i < filterMaskStep.length; i++)
                    if (filterMaskStep[i]) (filterMask!)[i] = 0;
            }
        }
    }
    perfTimerStop(pf, "apply lasso filter");
    return filterMask!;
}


function renderFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterInp: TpFilterInstance) {
    const filter = filterInp as TpFilterInstanceLasso3D;
    return (
        <div>
            Lasso selection on <i>{getTableColumn(tableData, filter.bindingPosition).name}</i>
        </div>
    )
}


function exportJSON(filterInp: TpFilterInstance, tableData: TpTableData): any {
    const filter = filterInp as TpFilterInstanceLasso3D;
    return {
        type: FILTER_TYPE_LASSO_3D,
        position: filter.bindingPosition,
        filters: filter.filteringSteps.map(step => ({
            isExcluding: step.isExcluding,
            projectionMatrix: step.projectionMatrix,
            polygon: polygon2String(step.polygon),
        }))
    }
}


function importJSON(json: any, tableData: TpTableData): TpFilterInstanceLasso3D {
    return {
        filterType: FILTER_TYPE_LASSO_3D,
        uid: guid(),
        bindingPosition: json.position,
        filteringSteps: json.filters.map((filter: any) => ({
            isExcluding: filter.isExcluding,
            projectionMatrix: filter.projectionMatrix,
            polygon: string2Polygon(filter.polygon),
        }))
    }
}


export function polygon2String(polygon: TpPoint2D[]): string {
    const vals: number[] = [];
    for (const pt of polygon) { vals.push(pt.x); vals.push(pt.y) };
    return vals.map(vl => String(vl)).join(';');
}


export function string2Polygon(inp: string): TpPoint2D[] {
    const vals = inp.split(';').map(valStr => parseFloat(valStr));
    if (vals.length % 2 != 0) throw "Uneven number of values in polygon";
    const polygon: TpPoint2D[] = [];
    for (let i = 0; i < vals.length; i += 2)
        polygon.push({ x: vals[i], y: vals[i + 1] })
    return polygon;
}



function toExpression(filterInp: TpFilterInstance, tableData: TpTableData): string {
    const filter = filterInp as TpFilterInstanceLasso3D;
    const exprSteps: string[] = [];
    for (const step of filter.filteringSteps) {
        const projMat = step.projectionMatrix;
        const projectionParamsString = [projMat.fx0, projMat.fxx, projMat.fxy, projMat.fxz, projMat.fy0, projMat.fyx, projMat.fyy, projMat.fyz].join(', ');
        let expr = `points3DInPolygon(${filter.bindingPosition}, ${projectionParamsString},  [${step.polygon.map(pt => `${pt.x},${pt.y}`).join(', ')}])`
        if (step.isExcluding) expr = '!' + expr;
        exprSteps.push(expr);
    }
    return exprSteps.join(` && `);
}


export const filterTypeLasso3D: TpFilterTypeDef = {
    id: FILTER_TYPE_LASSO_3D,
    name: 'Lasso filter (3D)',
    createFilterInstance,
    isSameFilter,
    mergeFilters,
    applyFilter,
    renderFilter,
    exportJSON,
    importJSON,
    toExpression,
}