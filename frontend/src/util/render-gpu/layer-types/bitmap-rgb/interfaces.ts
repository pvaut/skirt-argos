import { TpSliceData } from "../../../../features/resource-view/element-types/helpers/slicingHelpers";
import { TpColor } from "../../../color/color";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";





export interface TpGPURLayerInstanceBitmapRGB {
    layerType: GPUR_LAYER_TYPES.BITMAP_RGB;
    layerId: string;
    ctx: TpGPURContext;

    buffers: { [name: string]: TpGPUBufferInfo }; // contains the buffer pointers

    textureColorMap: any;
    sourceData: TpGPURLayerDataBitmapRGB | null;
}

interface TRGBConversionColorSettings {
    norm: number;
};

// Source data used to render a set of colored points with a fixed size
export interface TpGPURLayerDataBitmapRGB {
    layerType: GPUR_LAYER_TYPES.BITMAP_RGB;
    layerId: string;
    pixelSizeX: number;
    pixelSizeY: number;
    posX: Float32Array;
    posY: Float32Array;
    colorSourceR: Float32Array;
    colorSourceG: Float32Array;
    colorSourceB: Float32Array;
    selectionMask: Uint8Array;
    settingsGlobal: {
        background: number;
        softening: number;
        stretch: number;
        colorSaturationBuffer: number;
    }
    settingsR: TRGBConversionColorSettings;
    settingsG: TRGBConversionColorSettings;
    settingsB: TRGBConversionColorSettings;
}
