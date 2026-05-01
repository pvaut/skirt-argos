import { createConfigError } from "../errors";
import { filterTypeCategorical } from "./filter-types/filterTypeCategorical";
import { filterTypeCustom } from "./filter-types/filterTypeCustom";
import { filterTypeLasso2D } from "./filter-types/filterTypeLasso2D";
import { filterTypeLasso3D } from "./filter-types/filterTypeLasso3D";
import { filterTypeManual } from "./filter-types/filterTypeManual";
import { filterTypeRange } from "./filter-types/filterTypeRange";
import { TpFilterTypeDef } from "./interfaces";


const filterTypes: TpFilterTypeDef[] = [
    filterTypeRange,
    filterTypeLasso2D,
    filterTypeCategorical,
    filterTypeManual,
    filterTypeLasso3D,
    filterTypeCustom,
];


const _filterTypesMap: {[id: string]: TpFilterTypeDef} = {};
for (const filterType of filterTypes) _filterTypesMap[filterType.id] = filterType;


export function getFilterTypeDef(id: string): TpFilterTypeDef {
    if (!_filterTypesMap[id])
        throw createConfigError(`Invalid filter type: ${id}`);
    return _filterTypesMap[id];
}