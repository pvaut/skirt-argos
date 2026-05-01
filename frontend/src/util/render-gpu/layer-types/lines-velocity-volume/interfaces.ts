import { TpSliceData } from "../../../../features/resource-view/element-types/helpers/slicingHelpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";





export interface TpGPURLayerInstanceLinesVelocityVolume {
    layerType: GPUR_LAYER_TYPES.LINES_VELOCITY_VOLUME;
    layerId: string;
    ctx: TpGPURContext;

    buffers: {[name: string]: TpGPUBufferInfo}; // contains the buffer pointers

    sourceData: TpGPURLayerDataLinesVelocityVolume | null;
}


export interface TpGPURLayerDataLinesVelocityVolume {
    layerType: GPUR_LAYER_TYPES.LINES_VELOCITY_VOLUME;
    layerId: string;
    opacity: number;
    isActive: boolean;

    // posX,Y,Z contain the combination of start end end points of the velocity lines
    posX: Float32Array;
    posY: Float32Array;
    posZ: Float32Array;
    lineEdgeType: Uint8Array; // 0= start of line 1= end of line
    selectionMask:  Uint8Array;

    slice?: TpSliceData;
}
