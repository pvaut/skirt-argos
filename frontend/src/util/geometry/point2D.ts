
import { createInternalError } from "../errors";
import { createFilterMask } from "../filters/helpers";


export interface TpPoint2D {
    x: number,
    y: number,
}


export function distPoints2DFast(pt1: TpPoint2D, pt2: TpPoint2D) {
    return Math.abs(pt1.x - pt2.x) + Math.abs(pt1.y - pt2.y);
}


export function point2DSubtract(pt1: TpPoint2D, pt2: TpPoint2D): TpPoint2D {
    return {
        x: pt1.x - pt2.x,
        y: pt1.y - pt2.y,
    }
}


export function getPointsInsidePolygon(
    polygonPoints: TpPoint2D[],
    tryPointsX: any, // should be array-like
    tryPointsY: any, // should be array-like
): Uint8Array {
    // return value: selection mask for tryPoints
    const tryPointCount = tryPointsX.length;
    if (tryPointCount != tryPointsY.length) throw createInternalError("Incompatible array sizes");

    const filterMask = createFilterMask(tryPointCount, true);

    let minRangeX = Number.MAX_VALUE;
    let maxRangeX = -Number.MAX_VALUE;
    let minRangeY = Number.MAX_VALUE;
    let maxRangeY = -Number.MAX_VALUE;
    for (const pt of polygonPoints) {
        if (minRangeX > pt.x) minRangeX = pt.x;
        if (maxRangeX < pt.x) maxRangeX = pt.x;
        if (minRangeY > pt.y) minRangeY = pt.y;
        if (maxRangeY < pt.y) maxRangeY = pt.y;
    }

    const polygonTestData: {yi: number, yj:number, yf: number, yo: number}[] = [];
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
        const xi = polygonPoints[i].x;
        const yi = polygonPoints[i].y;
        const xj = polygonPoints[j].x;
        let yj = polygonPoints[j].y;
        if (yi ==yj) yj -= 1E-99;
        polygonTestData.push({
            yi,
            yj,
            yf: (xj - xi) / (yj - yi),
            yo: ((xj - xi) * (0 - yi)) / (yj - yi) + xi
        });
    }


    for (let ptNr = 0; ptNr < tryPointCount; ptNr++) {
        const x = tryPointsX[ptNr];
        const y = tryPointsY[ptNr];
        let inside = false;
        if ((x >= minRangeX) && (x <= maxRangeX) && (y >= minRangeY) && (y <= maxRangeY))
            for (const pt of polygonTestData) {
                if (pt.yi > y != pt.yj > y && x < pt.yf * y + pt.yo) 
                    inside = !inside;
            }
        filterMask[ptNr] = inside ? 1 : 0;
    }

    return filterMask;
}
