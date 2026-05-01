import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { TpTableData } from "../../../data/tables/interface";
import { getTableColumn } from "../../../data/tables/table";
import { createInternalError } from "../../errors";
import { guid } from "../../misc";
import { getPointsInsidePolygon, TpPoint2D } from "../../geometry/point2D";
import { TpFilterInstance, TpFilterMask, TpFilterTypeDef } from "../interfaces";
import { polygon2String, string2Polygon } from "./filterTypeLasso3D";

export const FILTER_TYPE_LASSO_2D = "Lasso2D";


export interface TpFilterInstanceLasso2D {
    filterType: string;
    uid: string;
    bindingX: string;
    bindingY: string;
    polygon: TpPoint2D[];
}


function createFilterInstance({ bindingX, bindingY, polygon }:
    { bindingX: string, bindingY: string, polygon: TpPoint2D[] })
    : TpFilterInstanceLasso2D {
    return {
        filterType: FILTER_TYPE_LASSO_2D,
        uid: guid(),
        bindingX,
        bindingY,
        polygon,
    }
}


function isSameFilter(filter1Inp: TpFilterInstance, filter2Inp: TpFilterInstance): boolean {
    if ((filter1Inp.filterType != FILTER_TYPE_LASSO_2D) || (filter2Inp.filterType != FILTER_TYPE_LASSO_2D))
        throw createInternalError("Unexpected filter type");
    const filter1 = filter1Inp as TpFilterInstanceLasso2D;
    const filter2 = filter2Inp as TpFilterInstanceLasso2D;
    return (filter1.bindingX == filter2.bindingX) && (filter1.bindingY == filter2.bindingY);
}


function mergeFilters(filterOrigInp: TpFilterInstance, filterToAddInp: TpFilterInstance): TpFilterInstance | null {
    if ((filterOrigInp.filterType != FILTER_TYPE_LASSO_2D) || (filterToAddInp.filterType != FILTER_TYPE_LASSO_2D))
        throw createInternalError("Unexpected filter type");
    const filterOrig = filterOrigInp as TpFilterInstanceLasso2D;
    const filterToAdd = filterToAddInp as TpFilterInstanceLasso2D;
    const newFilter = structuredClone(filterOrig);
    newFilter.polygon = filterToAdd.polygon;
    return newFilter;
}


function applyFilter(tableData: TpTableData, filterInp: TpFilterInstance): TpFilterMask {
    const filter = filterInp as TpFilterInstanceLasso2D;
    const filterMask = getPointsInsidePolygon(
        filter.polygon,
        getTableColumn(tableData, filter.bindingX).values,
        getTableColumn(tableData, filter.bindingY).values,
    );
    return filterMask;
}


function renderFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterInp: TpFilterInstance) {
    const filter = filterInp as TpFilterInstanceLasso2D;
    return (
        <div>
            Lasso selection on <i>{getTableColumn(tableData, filter.bindingX).name}, {getTableColumn(tableData, filter.bindingY).name}</i>
        </div>
    )
}


function exportJSON(filterInp: TpFilterInstance, tableData: TpTableData): any {
    const filter = filterInp as TpFilterInstanceLasso2D;
    return {
        type: FILTER_TYPE_LASSO_2D,
        X: filter.bindingX,
        Y: filter.bindingY,
        polygon: polygon2String(filter.polygon),
    }
}


function importJSON(json: any, tableData: TpTableData): TpFilterInstanceLasso2D {
    return {
        filterType: FILTER_TYPE_LASSO_2D,
        uid: guid(),
        bindingX: json.X,
        bindingY: json.Y,
        polygon: string2Polygon(json.polygon),
    }
}

function toExpression(filterInp: TpFilterInstance, tableData: TpTableData): string { 
    const filter = filterInp as TpFilterInstanceLasso2D;
    return `points2DInPolygon(${filter.bindingX}, ${filter.bindingY}, [${filter.polygon.map(pt => `${pt.x},${pt.y}`).join(', ')}])`;
}


export const filterTypeLasso2D: TpFilterTypeDef = {
    id: FILTER_TYPE_LASSO_2D,
    name: 'Lasso filter (2D)',
    createFilterInstance,
    isSameFilter,
    mergeFilters,
    applyFilter,
    renderFilter,
    exportJSON,
    importJSON,
    toExpression,
}