import { createInternalError } from "../errors";


export interface TpVector {
    x: number,
    y: number,
    z: number;
}


export function vector(x: number, y: number, z: number): TpVector {
    return { x, y, z };
}


export function isVector(vec: TpVector): boolean {
    return ('x' in vec) && ('y' in vec) && ('z' in vec);
}


export function vecRotateYAxis(vec: TpVector, angle: number): TpVector {
    const cs = Math.cos(angle);
    const sn = Math.sin(angle);
    return {
        x: vec.x * cs - vec.z * sn,
        y: vec.y,
        z: vec.x * sn + vec.z * cs,
    }
}


export function vecRotateXAxis(vec: TpVector, angle: number): TpVector {
    const cs = Math.cos(angle);
    const sn = Math.sin(angle);
    return {
        x: vec.x,
        y: vec.y * cs - vec.z * sn,
        z: vec.y * sn + vec.z * cs,
    }
}


export function vecWeightSum(...args: any[]): TpVector {
    // argument list: set of combinations of number & vector
    const rs = { x: 0, y: 0, z: 0 }
    for (let i = 0; i < args.length; i += 2) {
        const weight = args[i];
        const vec = args[i + 1];
        if (typeof weight != 'number') throw createInternalError(`Invalid argument list for vecWeightSum`);
        if (!isVector(vec)) throw createInternalError(`Invalid argument list for vecWeightSum`);
        rs.x += weight * vec.x;
        rs.y += weight * vec.y;
        rs.z += weight * vec.z;
    }
    return rs;
}


export function vecAdd(vec1: TpVector, vec2: TpVector): TpVector {
    return {
        x: vec1.x + vec2.x,
        y: vec1.y + vec2.y,
        z: vec1.z + vec2.z,
    }
}


export function vecSubtract(vec1: TpVector, vec2: TpVector): TpVector {
    return {
        x: vec1.x - vec2.x,
        y: vec1.y - vec2.y,
        z: vec1.z - vec2.z,
    }
}


export function vecMul(vec: TpVector, fc: number): TpVector {
    return {
        x: vec.x * fc,
        y: vec.y * fc,
        z: vec.z * fc,
    }
}


export function vecSize(vec: TpVector): number {
    return Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
}


export function vecNorm(vec: TpVector): TpVector {
    const size = vecSize(vec);
    return {
        x: vec.x / size,
        y: vec.y / size,
        z: vec.z / size,
    }
}


export function vecDotProd(vec1: TpVector, vec2: TpVector): number {
    return vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z;
}


export function vecProd(vec1: TpVector, vec2: TpVector): TpVector {
    return {
        x: vec1.y * vec2.z - vec1.z * vec2.y,
        y: vec1.z * vec2.x - vec1.x * vec2.z,
        z: vec1.x * vec2.y - vec1.y * vec2.x
    };
}