
import { TpFilterInstance } from "../../../../util/filters/interfaces";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { TpGPURData } from "../../../../util/render-gpu/interfaces";
import { TpGPURLayerData } from "../../../../util/render-gpu/layer-types/interfaces";
import { TpRange, TpRange2D, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../helpers/helpers";
import { TpElemInfo, TpLayerCustomData } from "../interface";
import { TpCanvasVolumeRenderLayer } from "../canvas-volume/interface";
import { TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { TpCanvas2DTransientData } from "./rendering";


export const MESSAGE_UPDATE_SLICE = "MESSAGE_UPDATE_SLICE";

export const MESSAGE_CANVAS2D_REDRAW = "MESSAGE_CANVAS2D_REDRAW";

export interface TpViewportMargins {
    top: number,
    left: number,
    bottom: number,
    right: number,
}

export interface TpAxisCategories {
    categories: string[];
}

export interface TpCanvas2DLegendHor {
    id: string;
    height: number;
    layerData: TpCanvas2DRenderLayer | TpCanvasVolumeRenderLayer;
    elemInfo: TpElemInfo;
    lastRenderedDisplayRange?: TpRange2D;
    customData?: {};
    render: (legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) => void;

    mouseHoverInfo?: (legend: TpCanvas2DLegendHor, pos: TpPoint2D) => any;
    handleMouseDown?: (legend: TpCanvas2DLegendHor, pos: TpPoint2D) => any;
    handleMouseDrag?: (legend: TpCanvas2DLegendHor, pos: TpPoint2D, mouseDragInfo: any) => void;
    handleMouseUp?: (legend: TpCanvas2DLegendHor, mouseDragInfo: any) => void;
}


export interface TpCanvas2DRenderLayer {
    // Infomation about a single layer in the chart
    layerTypeId: string;
    visualSetup?: TpVisualSetup,
    canvasRange: TpRange2D, // the logical data range for this layer
    gpuLayers: TpGPURLayerData[],
    renderCentral?: (canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layerData: TpCanvas2DRenderLayer) => void;
    renderCentralOverlay?: (canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layerData: TpCanvas2DRenderLayer, trData: TpCanvas2DTransientData) => void;
    legendsHor: TpCanvas2DLegendHor[],
    chartTitle: string;
    xAxisName: string;
    yAxisName: string;
    xAxisCategories?: TpAxisCategories;
    createLassoFilter?: (lassoPoints: TpPoint2D[], visualSetup: TpVisualSetup) => TpFilterInstance;
    createHorizontalRangeFilter?: (range: TpRange, visualSetup: TpVisualSetup) => TpFilterInstance;
    customData: TpLayerCustomData;// here we put data that is specific for the type of layer
}

export interface TpCanvas2DRenderData {
    isDataComplete: boolean;
    layers: TpCanvas2DRenderLayer[];
    gpurData: TpGPURData;
    centralViewportMargins: TpViewportMargins;
    chartTitle: string;
    xAxisName: string;
    yAxisName: string;
    xAxisCategories: TpAxisCategories | null; // is set, the x axis represents a categorical property rather than a numerical one
    canLassoDraw?: boolean;
}


export interface TpHoverPointInfo2D {
    targetLayer: TpCanvas2DRenderLayer;
    rowKeyIndex: number; //index in the original, full size table
    elemPos: TpPoint2D; // takes into account pixelRatio
    label: string;
    customData?: any;
}

export interface TpLabelLogical {
    logicX: number;
    logicY: number;
    logicZ?: number;
    labelText: string;
}

export interface TpLabelElem {
    elemPos: TpPoint2D;
    labelText: string;
}