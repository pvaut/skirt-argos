

import { configSettingChoice, configSettingRange } from "../../../helpers/configSettingTypes";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef, TpElemInfo, TpResourceRenderContext } from "../../../interface";

import { TpCanvas2DRenderLayer, TpHoverPointInfo2D, TpLabelLogical } from "../../interface";
import { TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { createHistogramLayerData } from "./layerHistogram.CreateData";
import { HISTOGRAM_YSCALE_TYPES } from "../../../../../../data/tables/table-aggregations/recipes/histogram";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";


export const LAYERTYPE_HISTOGRAM = 'histogram';

export interface TpLayerDataSpecificsHistogram {
    // contains the data specific to the "histogram" layer type
    bucketMin: number;
    bucketSize: number;
    bucketValuesSel: number[];
    bucketValuesUnsel: number[];
    yLabel: string;
}


function getHoverDataPoint(elemInfo: TpElemInfo, layerData: TpCanvas2DRenderLayer, viewport: TpViewport2D, dispPos: TpPoint2D): TpHoverPointInfo2D | null {
    return null;
}


function getLabels(resourceRenderCtx: TpResourceRenderContext, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layer: TpCanvas2DRenderLayer): TpLabelLogical[] {
    return [];
}


export const canvas2DLayerHistogramDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_HISTOGRAM,
    name: 'Histogram',
    vizQuality: 1,

    canSelectHorizontalRange: true,

    sections: [
        { id: 'values', name: 'Values' },
    ],

    channels: [
        {
            id: 'values',
            name: 'Values',
            sectionId: 'values',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
    ],

    configSettings: [
        {
            id: 'resolutionNudgeFactor',
            name: 'Resolution factor',
            sectionId: 'values',
            settingType: configSettingRange(1, 10, 0.5, 5),
        },
        {
            id: 'yScaleType',
            name: 'Y scale',
            sectionId: 'values',
            settingType: configSettingChoice([
                { id: HISTOGRAM_YSCALE_TYPES.COUNT, name: 'Count' },
                { id: HISTOGRAM_YSCALE_TYPES.LOG1P_COUNT, name: 'Count (log1p)' },
            ]),
        }
    ],

    createLayerData: createHistogramLayerData,
    getHoverDataPoint,
    getLabels,
    getThingsTodoHelp,
};

function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        "Click & drag the mouse to select a value range",
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
