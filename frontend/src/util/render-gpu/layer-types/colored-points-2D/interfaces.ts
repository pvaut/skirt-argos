import { TpSliceData } from "../../../../features/resource-view/element-types/helpers/slicingHelpers";
import { TpColor } from "../../../color/color";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";


export enum RENDER_TYPES {
    TRANSLUCENT = "translucent",
    OPAQUE = "opaque",
    LUMINOUS = "luminous",
}



export interface TpGPURLayerInstanceColoredPoints2D {
    layerType: GPUR_LAYER_TYPES.COLORED_POINTS_2D;
    layerId: string;
    ctx: TpGPURContext;

    buffers: {[name: string]: TpGPUBufferInfo}; // contains the buffer pointers

    textureColorMap: any;
    sourceData: TpGPURLayerDataColoredPoints2D | null;
}


// Source data used to render a set of colored points with a fixed size
export interface TpGPURLayerDataColoredPoints2D {
    layerType: GPUR_LAYER_TYPES.COLORED_POINTS_2D;
    layerId: string;
    pointSizeFactor: number;
    opacity: number; // ignored in case of RENDER_TYPES.OPAQUE
    renderType: RENDER_TYPES.TRANSLUCENT | RENDER_TYPES.LUMINOUS | RENDER_TYPES.OPAQUE;
    posX: Float32Array;
    posY: Float32Array;
    selectionMask:  Uint8Array;

    slice?: TpSliceData;

    colorNumerical?: {
        values: Float32Array;
        minVal: number;
        maxVal: number;
        gammaFactor: number;
        colorRamp: TpColor[];
    }
    colorCategorical?: {
        values: Float32Array;
        colorPalette: TpColor[];
    }
}
