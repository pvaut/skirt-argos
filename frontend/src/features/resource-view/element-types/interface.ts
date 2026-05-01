import { TpResourceInfo } from "../../../data/interfaces";
import { TpColumnData, TpTableData } from "../../../data/tables/interface";
import { } from "../../../util/render-gpu/interfaces";
import { TpGPURLayerData } from "../../../util/render-gpu/layer-types/interfaces";
import { TpPoint2D } from "../../../util/geometry/point2D";
import { TpRange2D, TpViewport2D } from "../../../util/geometry/viewport2D";
import { TpVisualSetup } from "./helpers/helpers";
import { TpFilterInstance, TpFilterMask } from "../../../util/filters/interfaces";
import { TpDataWidgetCtx } from "../data-widget/interface";
import { TpCanvas2DLegendHor, TpCanvas2DRenderLayer, TpHoverPointInfo2D, TpLabelLogical } from "./canvas-2d/interface";
import { TpSizingContext } from "./helpers/elemSizeInfo";
import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { TpCanvasVolumeRenderData, TpCanvasVolumeRenderLayer, TpHoverPointInfoVolume } from "./canvas-volume/interface";
import { TpLayerDataSpecificsScatter2D } from "./canvas-2d/layer-types/layer-scatter-2d/layerScatter2D.Interface";
import { TpLayerDataSpecificsHistogram } from "./canvas-2d/layer-types/layer-histogram/layerHistogram.Definition";
import { TpLayerDataSpecificsPointsVelocityVolume } from "./canvas-volume/layer-types/layer-points-velocity/layerPointsVelocity.Interface";
import { TpViewportVolume } from "../../../util/geometry/viewportVolume";
import { TpFormField } from "../../../util/components/form/Form";
import { TpLayerDataSpecificsDotPlot } from "./canvas-2d/layer-types/layer-dotplot/layerDotPlot.Definition";
import { TpLayerDataSpecificsParallelCoords } from "./canvas-2d/layer-types/layer-parallel-coords/layerParallelCoords.Interface";

export const MESSAGE_OPENEDROWS_UPDATE = "_msgOpenedRowsUpdate";

export enum ELEMTYPE_CLASSES {
    BASIC = "widgetClassBasic", // basic = does not visualise any data
    DATA_SINGLE_LAYER = "widgetClassDataSingleLayer",
    DATA_MULTI_LAYER = "widgetClassDataMultiLayer",
}

export enum ELEMTYPES {
    HORIZONTAL_GROUP = 'horizontalGroup',
    VERTICAL_GROUP = 'verticalGroup',
    TAB_GROUP = 'tabGroup',
    STATIC_TEXT = 'staticText',
    ACTION_BUTTON = "actionButton",
}

export enum CHANNEL_TYPES {
    NUMERICAL = "channelTypeNumerical",
    CATEGORICAL = "channelTypeCategorical",
    VECTOR3D = "channelTypeVector3d",
    SORTABLE = "channelTypeSortable",
    COLOR = "channelTypeColor",
    GRID_AXIS = "channelTypeGridAxis",
    ANY = "channelTypeAny",
}

// Used to synchronise cerain channrls across plots (e.g. X & Y axis during zooming & panning)
export enum SYNCGROUP_TYPES {
    XAXIS = "syncGroupXAxis",
    YAXIS = "syncGroupYAxis",
    SLICE = "syncGroupSlice",
    VOLUME = "syncGroupVolume",
}

export interface TpResourceRenderContext {
    resourceInfo: TpResourceInfo;
    resourceTables: { tableInfo: TpLoadedTableInfo, tableData: TpTableData }[];
    dashboardEditMode: boolean;
    parentElemInfo: {
        inHorizontalGroup?: boolean;
        inVerticalGroup?: boolean;
        inTabGroup?: boolean;
        firstInGroup?: boolean;
        lastInGroup?: boolean;
    }
    dashboardWidgetDefs: TpDashboardWidgetDefs;
    volumeAnimating: boolean;

    addOpenedRow: (tableUri: string, rowKeyIndex: number) => void;
    closeOpenedRow: (tableUri: string, rowKeyIndex: number) => void
}

export interface TpElemInfo {
    resourceUri: string;
    elemTrStateId: string;
    syncGroups: { [syncGroupType: string]: string }; // maps SYNCGROUP_TYPES to a sync group identifier set in the dashboard config
}

export interface TpElemProps {
    resourceRenderCtx: TpResourceRenderContext;
    elemDef: any;
    sizingContext: TpSizingContext;
}

export interface TpElemTypeDefBasic {
    id: string;
    name: string;
    elementClass: ELEMTYPE_CLASSES.BASIC,
    renderComponent: any; //  the component rendering the element
    configSettings: TpDataWidgetConfigSettingDef[];

    createCustomSettingElement?: (resourceRenderCtx: TpResourceRenderContext) => any;
}

export interface TpSectionDef {
    id: string;
    name: string;
}

// A channel defines a single source of data used in a data widget, sich as the X axis of a scatterplot
export interface TpDataWidgetChannelDef {
    id: string,
    name: string,
    sectionId: string;
    required: boolean;
    dataType: CHANNEL_TYPES,
}

export interface TpDataWidgetConfigSettingDef {
    id: string;
    name: string;
    sectionId: string;
    settingType: any;
    generator?: (resourceRenderCtx: TpResourceRenderContext, elemDef: any) => TpFormField;
    visibleIf?: string; // treated as an expression that can use $channelId and $configSettingId
}

// Defines a widget that uses table data, and has a single layer
export interface TpElemTypeDefDataWidgetSL {
    id: string;
    name: string;
    elementClass: ELEMTYPE_CLASSES.DATA_SINGLE_LAYER,
    renderComponent: any; //  the component rendering the element
    vizQuality: number;//the higher the score, the better quality vizualization

    sections: TpSectionDef[];
    channels: TpDataWidgetChannelDef[];

    configSettings: TpDataWidgetConfigSettingDef[];

    getThingsTodoHelp: (visualSetup: TpVisualSetup) => any[];
}

// Defines a single layer in a multi-layer data widget
export interface TpDataWidgetLayerTypeDef {
    id: string,
    name: string,
    sections: TpSectionDef[];
    channels: TpDataWidgetChannelDef[]; // the different aspects of the plot (X, Y axis, color coding...)
    configSettings: TpDataWidgetConfigSettingDef[];
    vizQuality: number;//the higher the score, the better quality vizualization


    canLassoDraw?: boolean;
    canSelectHorizontalRange?: boolean;

    createLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvas2DRenderLayer | TpCanvasVolumeRenderLayer;
    getHoverDataPoint(elemInfo: TpElemInfo, layerData: TpCanvas2DRenderLayer | TpCanvasVolumeRenderLayer, viewport: TpViewport2D | TpViewportVolume, dispPos: TpPoint2D): TpHoverPointInfo2D | TpHoverPointInfoVolume | null;
    getLabels(resourceRenderCtx: TpResourceRenderContext, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, layer: TpCanvas2DRenderLayer | TpCanvasVolumeRenderLayer): TpLabelLogical[];

    getThingsTodoHelp: (visualSetup: TpVisualSetup) => any[];

}

// Defines a widget that uses table data, and has multiple layers
export interface TpElemTypeDefDataWidgetML {
    id: string;
    name: string;
    elementClass: ELEMTYPE_CLASSES.DATA_MULTI_LAYER,
    renderComponent: any; //  the component rendering the element

    configSettings: TpDataWidgetConfigSettingDef[];
    layerTypeDefs: TpDataWidgetLayerTypeDef[];
}

export type TpElemTypeDef = TpElemTypeDefBasic | TpElemTypeDefDataWidgetSL | TpElemTypeDefDataWidgetML;


export type TpLayerCustomData = TpLayerDataSpecificsScatter2D | TpLayerDataSpecificsHistogram | TpLayerDataSpecificsDotPlot | TpLayerDataSpecificsPointsVelocityVolume | TpLayerDataSpecificsParallelCoords; // All types of custom data should be added here with | combination



export interface TpDashboardWidgetDefs {
    dataWidgetsSL: any[];
    dataWidgetsML: any[];
}