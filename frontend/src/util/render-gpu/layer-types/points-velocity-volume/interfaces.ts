import { TpSliceData } from "../../../../features/resource-view/element-types/helpers/slicingHelpers";
import { TpColor } from "../../../color/color";
import { TpVector } from "../../../geometry/vector";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";





export interface TpGPURLayerInstancePointsVelocityVolume {
    layerType: GPUR_LAYER_TYPES.POINTS_VELOCITY_VOLUME;
    layerId: string;
    ctx: TpGPURContext;

    buffers: {[name: string]: TpGPUBufferInfo}; // contains the buffer pointers

    textureColorMap: any;
    sourceData: TpGPURLayerDataPointsVelocityVolume | null;
}


export interface TpGPURLayerDataPointsVelocityVolume {
    layerType: GPUR_LAYER_TYPES.POINTS_VELOCITY_VOLUME;
    layerId: string;
    pointSizeFactor: number;
    posX: Float32Array;
    posY: Float32Array;
    posZ: Float32Array;
    velX: Float32Array;
    velY: Float32Array;
    velZ: Float32Array;
    selectionMask:  Uint8Array;

    slice?: TpSliceData;

    velocCalib: {
        velocCenter: TpVector;
        velocHalfRange: number;
    }

    velocColor: {
        colorRamp: TpColor[];
    }
}
