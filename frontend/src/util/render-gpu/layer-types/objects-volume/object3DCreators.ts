import { getColor, TpColor } from "../../../color/color";
import { createInternalError } from "../../../errors";
import { TpVector, vecAdd, vecDotProd, vecMul, vecNorm, vecProd, vecSize, vector, vecWeightSum } from "../../../geometry/vector";
import { TpVolumeBasis } from "../../../geometry/viewportVolume";
import { TpGPURLayerDataObjectsVolume } from "./interfaces";


export function obj3DAddPoint(objData: TpGPURLayerDataObjectsVolume, pos: TpVector, color: TpColor) {
    objData.posits.push(pos.x); objData.posits.push(pos.y); objData.posits.push(pos.z);
    objData.colors.push(color.r / 255); objData.colors.push(color.g / 255); objData.colors.push(color.b / 255); objData.colors.push(color.a);
}


export function obj3DAddRect(objData: TpGPURLayerDataObjectsVolume, pos: TpVector, dir1: TpVector, dir2: TpVector, color: TpColor) {
    obj3DAddPoint(objData, pos, color);
    obj3DAddPoint(objData, vecAdd(pos, dir1), color);
    obj3DAddPoint(objData, vecAdd(vecAdd(pos, dir1), dir2), color);
    obj3DAddPoint(objData, pos, color);
    obj3DAddPoint(objData, vecAdd(vecAdd(pos, dir1), dir2), color);
    obj3DAddPoint(objData, vecAdd(pos, dir2), color);
}


export function obj3DAddSolidLine(objData: TpGPURLayerDataObjectsVolume, pos1: TpVector, pos2: TpVector, hThickness: number, color: TpColor) {

    const dir = vecWeightSum(1, pos2, -1, pos1);
    const dirNorm = vecNorm(vecWeightSum(1, pos2, -1, pos1));

    let seedDir = vector(0, 0, 1);
    if (vecDotProd(dirNorm, seedDir) > 0.9999) seedDir = vector(0, 1, 0);

    const normal1 = vecNorm(vecProd(dirNorm, seedDir));
    const normal2 = vecProd(dirNorm, normal1);
    if (Math.abs(vecSize(normal2) - 1) > 1E9) throw createInternalError("This should never have happened");

    obj3DAddRect(objData, vecWeightSum(1, pos1, -hThickness, normal2, -hThickness, normal1), dir, vecMul(normal1, 2 * hThickness), color);
    obj3DAddRect(objData, vecWeightSum(1, pos1, +hThickness, normal2, -hThickness, normal1), dir, vecMul(normal1, 2 * hThickness), color);
    obj3DAddRect(objData, vecWeightSum(1, pos1, -hThickness, normal1, -hThickness, normal2), dir, vecMul(normal2, 2 * hThickness), color);
    obj3DAddRect(objData, vecWeightSum(1, pos1, +hThickness, normal1, -hThickness, normal2), dir, vecMul(normal2, 2 * hThickness), color);
}


export function create3DWireFrameBox(renderFramework: TpGPURLayerDataObjectsVolume, volumeBasis: TpVolumeBasis) {
    // NOTE: currently not used anymore
    // return;

    // const thickness = volumeBasis.halfRange / 500;
    // const color = getColor(250,250,250,0.1);

    // function _add(vec1: TpVector, vec2: TpVector) {
    //     obj3DAddSolidLine(renderFramework,
    //         vecWeightSum(1.0, volumeBasis.origin, volumeBasis.halfRange, vec1),
    //         vecWeightSum(1.0, volumeBasis.origin, volumeBasis.halfRange, vec2),
    //         thickness,
    //         color,
    //     );
    // }

    // // X dir
    // _add({ x: -1, y: -1, z: -1 }, { x: +1, y: -1, z: -1 });
    // _add({ x: -1, y: +1, z: -1 }, { x: +1, y: +1, z: -1 });
    // _add({ x: -1, y: +1, z: +1 }, { x: +1, y: +1, z: +1 });
    // _add({ x: -1, y: -1, z: +1 }, { x: +1, y: -1, z: +1 });
    // // Y dir
    // _add({ x: -1, y: -1, z: -1 }, { x: -1, y: +1, z: -1 });
    // _add({ x: +1, y: -1, z: -1 }, { x: +1, y: +1, z: -1 });
    // _add({ x: +1, y: -1, z: +1 }, { x: +1, y: +1, z: +1 });
    // _add({ x: -1, y: -1, z: +1 }, { x: -1, y: +1, z: +1 });
    // // Z dir
    // _add({ x: -1, y: -1, z: -1 }, { x: -1, y: -1, z: +1 });
    // _add({ x: +1, y: -1, z: -1 }, { x: +1, y: -1, z: +1 });
    // _add({ x: +1, y: +1, z: -1 }, { x: +1, y: +1, z: +1 });
    // _add({ x: -1, y: +1, z: -1 }, { x: -1, y: +1, z: +1 });
}
