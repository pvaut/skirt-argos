

import { TpViewport2D } from "../geometry/viewport2D";
import { TpViewportVolume } from "../geometry/viewportVolume";
import { TpGPURLayerInstance, TpGPURLayerData } from "./layer-types/interfaces";


export interface TpGPURProgramContext {
    theWebGLProgram: any;

    // Used for 2D viewport definition
    locConvFactor: any;
    locConvOffset: any;
    // logical to display conversion is done as coord_display = coord_logical * ConvFactor + ConvOffset
    // display range is (-1,-1) to (+1,+1)

    // Used for 3D Volume projection
    viewPortVolume: {
        locCenter: any;
        locXProj: any;
        locYProj: any;
        locZProj: any;
        locViewDir: any;
        locAspectCorrX: any;
        locAspectCorrY: any;
    }

    attributes: { name: string, location: any }[];
    uniforms: { name: string, location: any }[];
}


export interface TpGPURContext {
    canvas: any;
    gl: any;

    layerTypeProgramsMap: { [layerTypeId: string]: TpGPURProgramContext };

    renderLayers: TpGPURLayerInstance[];
    pixelRatio: number; // conversion canvas pixels to device pixels
    viewport2D?: TpViewport2D; // only applicable for layers that use 2D rendering
    viewportVolume?: TpViewportVolume; // only applicable for layers that use Volume rendering
}


// Source data for a set of rendering layers
export interface TpGPURData {
    //backColor: Color;
    layers: TpGPURLayerData[];

    viewport2D?: TpViewport2D;
    viewportVolume?: TpViewportVolume;
}
