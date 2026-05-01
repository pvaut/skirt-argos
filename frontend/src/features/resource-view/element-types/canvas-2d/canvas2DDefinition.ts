import { createConfigError } from "../../../../util/errors";
import { configSettingBoolean, configSettingString } from "../helpers/configSettingTypes";
import { TpDataWidgetLayerTypeDef, TpElemTypeDefDataWidgetML, ELEMTYPE_CLASSES, SYNCGROUP_TYPES } from "../interface";
import { Canvas2D } from "./Canvas2D";
import { canvas2DLayerBitmapRGBDefinition } from "./layer-types/layer-bitmap-rgb/layerBitmapRGB.Definition";
import { canvas2DLayerDotPlotDefinition } from "./layer-types/layer-dotplot/layerDotPlot.Definition";
import { canvas2DLayerHistogramDefinition } from "./layer-types/layer-histogram/layerHistogram.Definition";
import { canvas2DLayerParallelCoordsDefinition } from "./layer-types/layer-parallel-coords/layerParallelCoords.Definition";
import { canvas2DLayerScatter2DDefinition } from "./layer-types/layer-scatter-2d/layerScatter2D.Definition";
import { canvas2DLayerStripPlotDefinition } from "./layer-types/layer-stripplot/layerStripPlot.Definition";


const WIDGETTYPE_CANVAS_2D = 'canvas2D';

export const canvas2DDefinition: TpElemTypeDefDataWidgetML = {
    id: WIDGETTYPE_CANVAS_2D,
    name: '2D Canvas',
    elementClass: ELEMTYPE_CLASSES.DATA_MULTI_LAYER,
    renderComponent: Canvas2D,

    configSettings: [
        {
            id: 'title',
            name: 'Title',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },
        {
            id: 'aspectRatio11',
            name: '1:1 aspect ratio',
            sectionId: '',
            settingType: configSettingBoolean(false),
        },
        {
            id: 'hideXYAxes',
            name: 'Hide axes',
            sectionId: '',
            settingType: configSettingBoolean(false),
        },
        {
            id: SYNCGROUP_TYPES.XAXIS,
            name: 'X axis sync group',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },
        {
            id: SYNCGROUP_TYPES.YAXIS,
            name: 'Y axis sync group',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },
        {
            id: SYNCGROUP_TYPES.SLICE,
            name: 'Slice sync group',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },
    ],

    layerTypeDefs: [
        canvas2DLayerHistogramDefinition,
        canvas2DLayerScatter2DDefinition,
        canvas2DLayerDotPlotDefinition,
        canvas2DLayerStripPlotDefinition,
        canvas2DLayerBitmapRGBDefinition,
        canvas2DLayerParallelCoordsDefinition,
    ],
}

export function getMLWidgetLayerTypeDef(widgetTypeDef: TpElemTypeDefDataWidgetML, layerTypeId: string): TpDataWidgetLayerTypeDef {
    const layerTypeDef = widgetTypeDef.layerTypeDefs.find(layerTypeDef => layerTypeDef.id == layerTypeId);
    if (!layerTypeDef) {
        debugger;
        throw createConfigError(`Invalid layer type for ${widgetTypeDef.id}: ${layerTypeId}`);
    }
    return layerTypeDef;
}

export function getCanvas2DLayerTypeDef(layerTypeId: string): TpDataWidgetLayerTypeDef {
    return getMLWidgetLayerTypeDef(canvas2DDefinition, layerTypeId);
}