import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";


export interface TpGPURLayerInstanceObjectsVolume {
    layerType: GPUR_LAYER_TYPES.OBJECTS_VOLUME;
    layerId: string;
    ctx: TpGPURContext;

    buffers: {[name: string]: TpGPUBufferInfo}; // contains the buffer pointers

    sourceData: TpGPURLayerDataObjectsVolume | null;
}


export interface TpGPURLayerDataObjectsVolume {
    layerType: GPUR_LAYER_TYPES.OBJECTS_VOLUME;
    layerId: string;
    posits: number[]; // x, y,z sequentally
    colors: number[]; //r,g,b,a sequentally

}
