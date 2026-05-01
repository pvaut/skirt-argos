import { TpSliceData } from "../../../../features/resource-view/element-types/helpers/slicingHelpers";
import { TpColor } from "../../../color/color";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";


export interface TpGPURLayerInstanceColoredPointsVolume {
    layerType: GPUR_LAYER_TYPES.COLORED_POINTS_VOLUME;
    layerId: string;
    ctx: TpGPURContext;
    buffers: { [name: string]: TpGPUBufferInfo }; // contains the buffer pointers
    textureColorMap: any;
    sourceData: TpGPURLayerDataColoredPointsVolume | null;
}


export interface TpGPURLayerDataColoredPointsVolume {
    layerType: GPUR_LAYER_TYPES.COLORED_POINTS_VOLUME;
    layerId: string;
    pointSizeFactor: number;
    posX: Float32Array;
    posY: Float32Array;
    posZ: Float32Array;
    selectionMask: Uint8Array;

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

    sizes?: {
        values: Float32Array,
        minVal: number;
        maxVal: number;
        gammaFactor: number;
        scaleOpacityWithSize: boolean;
    }

}
