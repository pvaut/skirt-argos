import { point2DSubtract, TpPoint2D } from "./point2D";
import { TpVector, vecDotProd, vecMul, vecNorm, vecRotateXAxis, vecRotateYAxis, vecSubtract } from "./vector";
import { createEmptyRange2D, getRangeSize, TpRange2D } from "./viewport2D";


// Use to define how data in a 3D space is rendered;
export interface TpVolumeBasis {
    origin: TpVector;
    halfRange: number;
}


export interface TpViewportVolume {
    pixelRatio: number;
    totalDisplayWidth: number;
    totalDisplayHeight: number;
    displayRange: TpRange2D;
    volumeBasis: TpVolumeBasis;

    zoomFactor: number;
    angleAzim: number // "Yaw", rotation along the Y axis
    angleDeclin: number; // "Pitch", rotation along the X axis
};

export interface TpViewportProjectionMatrix {
    fx0: number; fxx: number; fxy: number; fxz: number;
    fy0: number; fyx: number; fyy: number; fyz: number;
}


export interface TpViewportVolumeCoordConvertors {
    origin: TpVector;
    axisX: TpVector;
    axisY: TpVector;
    axisZUnscaled: TpVector;
    viewDir: TpVector;
    aspectRatio: number;
    projectionMatrix: TpViewportProjectionMatrix;
    logic2Disp: (pos3D: TpVector) => TpPoint2D;
    logic2Elem: (pos3D: TpVector) => TpPoint2D;
}


export function createViewportVolume(): TpViewportVolume {
    return {
        pixelRatio: 2,
        totalDisplayWidth: 1,
        totalDisplayHeight: 1,
        displayRange: createEmptyRange2D(),
        volumeBasis: { origin: { x: 0, y: 0, z: 0 }, halfRange: 1 },
        zoomFactor: 1,
        angleAzim: -0.5,
        angleDeclin: -0.3,
    };
}

export function resetViewportVolumeZoom(viewport: TpViewportVolume) {
    viewport.zoomFactor = 1;
}


export function setViewportVolumeLogicalRange(viewport: TpViewportVolume, volumeBasis: TpVolumeBasis): void {
    viewport.volumeBasis = structuredClone(volumeBasis);
}


export function setViewportVolumeDisplayRange(viewport: TpViewportVolume, displayRange: TpRange2D): void {
    viewport.displayRange = structuredClone(displayRange);
}


export const VOL_MIN_ZOOM = 0.33;
export const VOL_MAX_ZOOM = 50;


export function zoomViewportVolume(viewport: TpViewportVolume, fc: number) {
    viewport.zoomFactor = Math.max(VOL_MIN_ZOOM, Math.min(VOL_MAX_ZOOM, viewport.zoomFactor * fc));
}


export function rotateViewportVolume(viewport: TpViewportVolume, diffX: number, diffY: number) {
    viewport.angleAzim += diffX / 150;
    if (viewport.angleAzim < 0) viewport.angleAzim += 2 * Math.PI;
    if (viewport.angleAzim >= 2 * Math.PI) viewport.angleAzim -= 2 * Math.PI;

    viewport.angleDeclin -= diffY / 150;
    viewport.angleDeclin = Math.max(viewport.angleDeclin, -Math.PI / 2 * 0.95);
    viewport.angleDeclin = Math.min(viewport.angleDeclin, +Math.PI / 2 * 0.95);
}


export function copyViewportViewSettings(sourceViewport: TpViewportVolume, targetViewport: TpViewportVolume) {
    targetViewport.zoomFactor = sourceViewport.zoomFactor;
    targetViewport.angleAzim = sourceViewport.angleAzim;
    targetViewport.angleDeclin = sourceViewport.angleDeclin;
}


export function getViewportVolumeCoordConvertors(viewportVolume: TpViewportVolume): TpViewportVolumeCoordConvertors {

    const factor = 1.0 / viewportVolume.volumeBasis.halfRange;
    const origin = viewportVolume!.volumeBasis.origin;

    let axes: TpVector[] = [
        { x: factor, y: 0, z: 0 }, // X
        { x: 0, y: factor, z: 0 }, // Y
        { x: 0, y: 0, z: factor }  // Z
    ];
    axes = axes.map(axis => vecRotateXAxis(axis, viewportVolume.angleDeclin));
    axes = axes.map(axis => vecRotateYAxis(axis, viewportVolume.angleAzim));

    const axisX = vecMul(axes[0], viewportVolume.zoomFactor);
    const axisY = vecMul(axes[1], viewportVolume.zoomFactor);
    const viewDir = vecNorm(axes[2]);

    const aspectRatio = getRangeSize(viewportVolume.displayRange.y) / getRangeSize(viewportVolume.displayRange.x);
    const locAspectCorrX = aspectRatio < 1 ? aspectRatio : 1;
    const locAspectCorrY = aspectRatio > 1 ? 1 / aspectRatio : 1;

    function logic2DispSlow(pos3D: TpVector): TpPoint2D {
        const posCentered = vecSubtract(pos3D, origin);
        let x = vecDotProd(posCentered, axisX) * locAspectCorrX;
        let y = vecDotProd(posCentered, axisY) * locAspectCorrY;
        x = viewportVolume.displayRange.x.min + 0.5 * (x + 1) * getRangeSize(viewportVolume.displayRange.x);
        y = viewportVolume.displayRange.y.max - 0.5 * (y + 1) * getRangeSize(viewportVolume.displayRange.y);
        return { x, y };
    }

    // Note: acceleration: precalculate the vector matrix operation factors
    const cent = logic2DispSlow({ x: 0, y: 0, z: 0 });
    const dx = point2DSubtract(logic2DispSlow({ x: 1, y: 0, z: 0 }), cent);
    const dy = point2DSubtract(logic2DispSlow({ x: 0, y: 1, z: 0 }), cent);
    const dz = point2DSubtract(logic2DispSlow({ x: 0, y: 0, z: 1 }), cent);
    const fx0 = cent.x;
    const fxx = dx.x;
    const fxy = dy.x;
    const fxz = dz.x;
    const fy0 = cent.y;
    const fyx = dx.y;
    const fyy = dy.y;
    const fyz = dz.y;

    function logic2DispFast(pos3D: TpVector): TpPoint2D {
        return {
            x: fx0 + fxx * pos3D.x + fxy * pos3D.y + fxz * pos3D.z,
            y: fy0 + fyx * pos3D.x + fyy * pos3D.y + fyz * pos3D.z,
        }
    }

    function logic2Elem(pos3D: TpVector): TpPoint2D {
        return {
            x: (fx0 + fxx * pos3D.x + fxy * pos3D.y + fxz * pos3D.z) * viewportVolume.pixelRatio,
            y: (fy0 + fyx * pos3D.x + fyy * pos3D.y + fyz * pos3D.z) * viewportVolume.pixelRatio,
        }
    }

    return {
        logic2Disp: logic2DispFast,
        logic2Elem,
        origin,
        axisX,
        axisY,
        axisZUnscaled: axes[2],
        viewDir,
        aspectRatio,
        projectionMatrix: { fx0, fxx, fxy, fxz, fy0, fyx, fyy, fyz },
    };
}
