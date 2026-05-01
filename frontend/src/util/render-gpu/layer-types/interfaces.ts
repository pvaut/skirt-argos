import { TpGPURContext, TpGPURProgramContext } from "../interfaces";
import { TpGPURLayerInstanceColoredPoints2D, TpGPURLayerDataColoredPoints2D } from "./colored-points-2D/interfaces";
import { TpGPURLayerDataPointsVelocityVolume, TpGPURLayerInstancePointsVelocityVolume } from "./points-velocity-volume/interfaces";
import { TpGPURLayerDataLinesVelocityVolume, TpGPURLayerInstanceLinesVelocityVolume } from "./lines-velocity-volume/interfaces";
import { TpGPURLayerDataObjectsVolume, TpGPURLayerInstanceObjectsVolume } from "./objects-volume/interfaces";
import { TpGPURLayerDataColoredPointsVolume, TpGPURLayerInstanceColoredPointsVolume } from "./colored-points-volume/interfaces";
import { TpGPURLayerDataColoredPointsBitmap, TpGPURLayerInstanceColoredPointsBitmap } from "./colored-points-bitmap/interfaces";
import { TpGPURLayerDataBitmapRGB, TpGPURLayerInstanceBitmapRGB } from "./bitmap-rgb/interfaces";
import { TpGPURLayerDataWhiteLines2D, TpGPURLayerInstanceWhiteLines2D } from "./white-lines-2D/interfaces";

export enum BUFFER_DATA_TYPES {
    FLOAT = "float",
    BYTE = "byte",
}


// The definition of a single buffer used in a layer type
export interface TpGPUBufferDef {
    name: string,
    dataType: BUFFER_DATA_TYPES,
    size: number, // number of components per vertex
}


// The definition of a single uniform value used in a layer type
export interface TpGPUUniformDef {
    name: string,
    dataType: BUFFER_DATA_TYPES,
    size: number, // number of components in the uniform
}


export enum GPUR_LAYER_TYPES {
    COLORED_POINTS_2D = 'GPURColoredPoints2D',
    COLORED_POINTS_BITMAP = 'GPURColoredPointsBitmap',
    WHITE_LINES_2D = 'GPURWhiteLines2D',
    COLORED_POINTS_VOLUME = 'GPUPColoredPointsVolume',
    BITMAP_RGB = "GPUBitmapRGB",
    POINTS_VELOCITY_VOLUME = 'GPUPointsVelocityVolume',
    LINES_VELOCITY_VOLUME = "GPURLinesVelocityVolume",
    OBJECTS_VOLUME = 'GPUObjectsVolume',
};


export interface TpGPUBufferInfo {
    currentData: any; // we keep track of this, so that we can do a shallow comparison to determine if the data was actually changed
    buffer: WebGLBuffer,
    dataType: BUFFER_DATA_TYPES,
    size: number,
}


// Al possible types of layers
export type TpGPURLayerInstance =
    TpGPURLayerInstanceColoredPoints2D |
    TpGPURLayerInstanceColoredPointsBitmap |
    TpGPURLayerInstanceWhiteLines2D |
    TpGPURLayerInstanceColoredPointsVolume |
    TpGPURLayerInstancePointsVelocityVolume |
    TpGPURLayerInstanceLinesVelocityVolume |
    TpGPURLayerInstanceBitmapRGB |
    TpGPURLayerInstanceObjectsVolume;


// All possible types of layer source data
export type TpGPURLayerData =
    TpGPURLayerDataColoredPoints2D |
    TpGPURLayerDataColoredPointsBitmap |
    TpGPURLayerDataWhiteLines2D |
    TpGPURLayerDataColoredPointsVolume |
    TpGPURLayerDataPointsVelocityVolume |
    TpGPURLayerDataLinesVelocityVolume |
    TpGPURLayerDataBitmapRGB |
    TpGPURLayerDataObjectsVolume;


export interface TpGPURLayerTypeDefinition {
    layerTypeId: string;// Unique identifier of the layer type

    // Defines the buffers & corresponding attributes used by the shaders
    bufferDefs: TpGPUBufferDef[];

    // Defines the uniform values used by the shaders
    uniformDefs: TpGPUUniformDef[];

    // creates the program associated with this type of drawing
    createProgram: (gl: any) => TpGPURProgramContext;

    // initializes a layer instance that will be used to manage the layer drawing
    createInstance: (ctx: TpGPURContext, layerId: string) => TpGPURLayerInstance;

    // sets the data for drawing in an layer instance
    setSourceData: (layerInstance: TpGPURLayerInstance, dataInp: TpGPURLayerData) => void;

    // renders a layer instance
    performRender: (ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) => void;
}
