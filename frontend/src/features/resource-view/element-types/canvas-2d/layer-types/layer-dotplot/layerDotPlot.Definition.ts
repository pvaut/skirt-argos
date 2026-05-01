

import { configSettingBoolean, configSettingChoice, configSettingGammaFactor, configSettingRange } from "../../../helpers/configSettingTypes";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef, TpElemInfo, TpResourceRenderContext } from "../../../interface";

import { TpCanvas2DRenderLayer, TpHoverPointInfo2D, TpLabelLogical } from "../../interface";
import { TpRange, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { createHistogramLayerData } from "./layerDotPlot.CreateData";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";
import { QUANT_AGGR_TYPES, TpDotPlotData } from "../../../../../../data/tables/table-aggregations/recipes/dotPlot";
import { chartNumericalColorConfigSettings } from "../../../helpers/chartDefinitions";
import { TpColor } from "../../../../../../util/color/color";


export const LAYERTYPE_DOTPLOT = 'dotplot';

export interface TpLayerDataSpecificsDotPlot {
    // contains the data specific to the "dot plot" layer type
    data: TpDotPlotData;
    sizeGammaFactor: number;
    colorValueRange: TpRange,
    restrictedColorValueRange: TpRange,
    colorRamp: TpColor[],
    colorGammaFactor: number;
    radiusFactor: number;
}


function getHoverDataPoint(elemInfo: TpElemInfo, layerData: TpCanvas2DRenderLayer, viewport: TpViewport2D, dispPos: TpPoint2D): TpHoverPointInfo2D | null {
    return null;
}


function getLabels(resourceRenderCtx: TpResourceRenderContext, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layer: TpCanvas2DRenderLayer): TpLabelLogical[] {
    return [];
}


const resolChoices = configSettingChoice([20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200].map(val => ({ id: String(val), name: String(val) })), "50");

export const canvas2DLayerDotPlotDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_DOTPLOT,
    name: 'Dot plot',
    vizQuality: 0.5,

    canLassoDraw: true,

    sections: [
        { id: 'coordinates', name: 'Coordinates' },
        { id: 'colors', name: 'Colors' },
        { id: 'contours', name: 'Density Contours' },
    ],

    channels: [
        {
            id: 'x',
            name: 'X axis',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
        {
            id: 'y',
            name: 'Y axis',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
        {
            id: 'color',
            name: 'Color data',
            sectionId: 'colors',
            required: false,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
    ],

    configSettings: [
        {
            id: 'resolution',
            name: 'Resolution',
            sectionId: 'coordinates',
            settingType: resolChoices,
        },
        {
            id: 'sizeGammaFactor',
            name: 'Size gamma factor',
            sectionId: 'coordinates',
            settingType: configSettingGammaFactor(),
        },
        {
            id: 'radiusFactor',
            name: 'Radius factor',
            sectionId: 'coordinates',
            settingType: configSettingChoice([1, 1.25, 1.5].map(val => ({ id: String(val), name: String(val) }))),
        },
        {
            id: 'quantAggrType',
            name: 'Aggregation',
            sectionId: 'colors',
            visibleIf: `isNumericalProperty($color)`,
            settingType: configSettingChoice([
                { id: QUANT_AGGR_TYPES.AVERAGE, name: "Average" },
                { id: QUANT_AGGR_TYPES.SUM, name: "Sum" },
            ]),
        },
        ...chartNumericalColorConfigSettings(false),

        {
            id: 'contourShow',
            name: 'Show contours',
            sectionId: 'contours',
            settingType: configSettingBoolean(true),
        },
        {
            id: 'contourLevelCount',
            name: 'Contour level count',
            sectionId: 'contours',
            visibleIf: `$contourShow`,
            settingType: configSettingChoice([5, 10, 15].map(val => ({ id: String(val), name: String(val) })), "10"),
        },
        {
            id: 'contourSmoothingKernelWidth',
            name: 'Contour smoothing kernel',
            sectionId: 'contours',
            visibleIf: `$contourShow`,
            settingType: configSettingChoice([1, 2, 3, 4].map(val => ({ id: String(val), name: String(val) })), "2"),
        },
    ],

    createLayerData: createHistogramLayerData,
    getHoverDataPoint,
    getLabels,
    getThingsTodoHelp,
};

function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        "Click & drag the mouse to perform a lasso selection",
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
