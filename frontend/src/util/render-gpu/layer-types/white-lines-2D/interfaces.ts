import { TpSliceData } from "../../../../features/resource-view/element-types/helpers/slicingHelpers";
import { TpColor } from "../../../color/color";
import { TpGPURContext } from "../../interfaces";
import { RENDER_TYPES } from "../colored-points-2D/interfaces";
import { GPUR_LAYER_TYPES, TpGPUBufferInfo } from "../interfaces";




export interface TpGPURLayerInstanceWhiteLines2D {
    layerType: GPUR_LAYER_TYPES.WHITE_LINES_2D;
    layerId: string;
    ctx: TpGPURContext;

    buffers: {[name: string]: TpGPUBufferInfo}; // contains the buffer pointers

    sourceData: TpGPURLayerDataWhiteLines2D | null;
}


// Source data used to render a set of colored points with a fixed size
export interface TpGPURLayerDataWhiteLines2D {
    layerType: GPUR_LAYER_TYPES.WHITE_LINES_2D;
    layerId: string;
    opacity: number; // ignored in case of RENDER_TYPES.OPAQUE
    intensity: number;
    renderType: RENDER_TYPES.TRANSLUCENT | RENDER_TYPES.LUMINOUS | RENDER_TYPES.OPAQUE;
    posX: Float32Array;
    posY: Float32Array;
}
