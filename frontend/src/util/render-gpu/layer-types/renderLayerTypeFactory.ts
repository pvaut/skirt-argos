import { createInternalError } from "../../errors";
import { gpurColoredPoints2D } from "./colored-points-2D/renderColoredPoints2D";
import { TpGPURLayerTypeDefinition } from "./interfaces";
import { gpurPointsVelocityVolume } from "./points-velocity-volume/renderPointsVelocityVolume";
import { gpurLinesVelocityVolume } from "./lines-velocity-volume/renderLinesVelocityVolume";
import { gpurObjectsVolume } from "./objects-volume/renderObjectsVolume";
import { gpurColoredPointsVolume } from "./colored-points-volume/renderColoredPointsVolume";
import { gpurColoredPointsBitmap } from "./colored-points-bitmap/renderColoredPointsBitmap";
import { gpurBitmapRGB } from "./bitmap-rgb/renderBitmapRGB";
import { gpurWhiteLines2D } from "./white-lines-2D/renderWhiteLines2D";


export const layerTypesList = [
    gpurColoredPoints2D,
    gpurColoredPointsBitmap,
    gpurColoredPointsVolume,
    gpurWhiteLines2D,
    gpurPointsVelocityVolume,
    gpurLinesVelocityVolume,
    gpurBitmapRGB,
    gpurObjectsVolume,
]


const layerTypesMap: {[id: string]: TpGPURLayerTypeDefinition} = {};
for (const layerType of layerTypesList) {
    if (layerTypesMap[layerType.layerTypeId]) createInternalError(`Duplicate ID: ${layerType.layerTypeId}`);
    layerTypesMap[layerType.layerTypeId] = layerType;
}


export function renderLayerTypeFactory(layerTypeId: string) {
    const layerType = layerTypesMap[layerTypeId];
    if (!layerType) throw createInternalError(`Invalid GPUR layer type: ${layerTypeId}. Possibilities: ${layerTypesList.map(l => l.layerTypeId).join(';')}`);
    return layerType;
}