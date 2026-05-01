import { TpGPURData } from "../../../../util/render-gpu/interfaces";
import { TpGPURLayerData } from "../../../../util/render-gpu/layer-types/interfaces";
import { TpViewportVolume, TpVolumeBasis } from "../../../../util/geometry/viewportVolume";
import { TpCanvas2DLegendHor, TpViewportMargins } from "../canvas-2d/interface";
import { TpVisualSetup } from "../helpers/helpers";
import { TpLayerCustomData } from "../interface";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { TpFilterInstance } from "../../../../util/filters/interfaces";


export const LAYERTYPE_VOLUME_POINTS = 'volumePoints';
export const LAYERTYPE_VOLUME_POINTS_VELOCITY = 'volumePointsVelocity';

export const MESSAGE_CANVASVOLUME_REDRAW = "MESSAGE_CANVASVOLUME_REDRAW";
export const MESSAGE_CANVASVOLUME_SYNC_POV = "MESSAGE_CANVASVOLUME_SYNC_POV";

export const MESSAGE_STOP_VOL_POV_ANIM = "MESSAGE_STOP_VOL_POV_ANIM";
export const MESSAGE_VOL_POV_ANIM_INCR = "MESSAGE_VOL_POV_ANIM_INCR";


export interface TpCanvasVolumeRenderLayer {
    // Infomation about a single layer in the chart
    layerTypeId: string;
    visualSetup?: TpVisualSetup,
    gpuLayers: TpGPURLayerData[],
    renderCentral?: (canvasCtx: CanvasRenderingContext2D, viewportVolume: TpViewportVolume, layerData: TpCanvasVolumeRenderLayer) => void;
    legendsHor: TpCanvas2DLegendHor[],
    chartTitle: string;
    volumeBasis: TpVolumeBasis;
    volumeUnitName: string | null;
    xAxisName: string;
    yAxisName: string;
    createLassoFilter?: (lassoPoints: TpPoint2D[], visualSetup: TpVisualSetup, viewportVolume: TpViewportVolume, isRestricting: boolean, isExcluding: boolean) => TpFilterInstance;
    customData: TpLayerCustomData;// here we put data that is specific for the type of layer
}



export interface TpCanvasVolumeRenderData {
    isDataComplete: boolean;
    layers: TpCanvasVolumeRenderLayer[];
    gpurData: TpGPURData;
    centralViewportMargins: TpViewportMargins;
    chartTitle: string;
    canLassoDraw?: boolean;
}

export interface TpHoverPointInfoVolume {
    targetLayer: TpCanvasVolumeRenderLayer;
    rowKeyIndex: number; //index in the original, full size table
    elemPos: TpPoint2D; // takes into account pixelRatio
    label: string;
}
