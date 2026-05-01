import { TpSliceData } from "../../../../features/resource-view/element-types/helpers/slicingHelpers";
import { TpColor } from "../../../color/color";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";





export interface TpGPURLayerInstanceColoredPointsBitmap {
    layerType: GPUR_LAYER_TYPES.COLORED_POINTS_BITMAP;
    layerId: string;
    ctx: TpGPURContext;

    buffers: {[name: string]: TpGPUBufferInfo}; // contains the buffer pointers

    textureColorMap: any;
    sourceData: TpGPURLayerDataColoredPointsBitmap | null;
}


// Source data used to render a set of colored points with a fixed size
export interface TpGPURLayerDataColoredPointsBitmap {
    layerType: GPUR_LAYER_TYPES.COLORED_POINTS_BITMAP;
    layerId: string;
    pixelSizeX: number;
    pixelSizeY: number;
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
