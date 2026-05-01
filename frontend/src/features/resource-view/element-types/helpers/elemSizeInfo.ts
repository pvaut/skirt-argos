import { createConfigError, createInternalError } from "../../../../util/errors";


export enum SIZE_DIM {
    VERT = "vert",
    HOR = "hor"
};


export interface TpSizingContext {
    // determines if the width or height are contrained to a total size (e.g. viewport, or sized parent element), or can grow indefinetely
    widthConstrained: boolean;
    heightConstrained: boolean;
}


export interface TpSizeInfo1D {
    value: number;
    isPercentage: boolean; // if not => in pixels
}


export function parseSizeInfoString(sizeInfoStr: string): TpSizeInfo1D {
    if (typeof sizeInfoStr != "string") throw createConfigError('Size info is not a string');
    if (sizeInfoStr.endsWith("px")) return {
        value: parseFloat(sizeInfoStr.substring(0, sizeInfoStr.length - 2)),
        isPercentage: false,
    }
    if (sizeInfoStr.endsWith("%")) return {
        value: parseFloat(sizeInfoStr.substring(0, sizeInfoStr.length - 1)),
        isPercentage: true,
    }
    throw createConfigError(`Invalid size string: ${sizeInfoStr}`);
}


export function getWidgetSize(elemDef: any, dim: SIZE_DIM): TpSizeInfo1D | null {
    if (dim == SIZE_DIM.VERT)
        return elemDef.size?.height ? parseSizeInfoString(elemDef.size.height) : null;
    if (dim == SIZE_DIM.HOR)
        return elemDef.size?.width ? parseSizeInfoString(elemDef.size.width) : null;
    throw createInternalError(`Invalid sizing dim" ${dim}`);
}


export interface TpCssSizeInfo {
    sizeString: string | null; // if present, this string can be used in css width or height
    sizeConstrained: boolean;
}


export function getChildrenSizingInfo(children: any[], dim: SIZE_DIM, sizeConstrained: boolean): TpCssSizeInfo[] {

    if (!sizeConstrained) {
        // Total size is not constrained
        const sizeInfoChildren: TpCssSizeInfo[] = [];
        for (const childDef of children) {
            const childSizeInfo = getWidgetSize(childDef, dim);
            if (!childSizeInfo) {
                sizeInfoChildren.push({
                    sizeString: null,
                    sizeConstrained: false,
                });
            } else {
                if (!childSizeInfo.isPercentage) {
                    sizeInfoChildren.push({
                        sizeString: `${childSizeInfo.value}px`,
                        sizeConstrained: true,
                    });
                } else {
                    throw createConfigError(`A relative size child widget size cannot be part of an unconstrained parent size (${dim})`)
                }
            }
        }
        return sizeInfoChildren;
    } else {
        // Total size is constrained
        // First, we get the sum of all fractions
        let totalPercentageSize = 0;
        let totalAbsoluteSize = 0;
        let childCountWithRelativeSize = 0;
        for (const childDef of children) {
            const childSizeInfo = getWidgetSize(childDef, dim);
            if (!childSizeInfo) throw createConfigError(`In a constrained parent size, a child widget should always have a defined size (${dim})`);
            if (childSizeInfo.isPercentage) {
                totalPercentageSize += childSizeInfo.value;
                childCountWithRelativeSize++;
            }
            else
                totalAbsoluteSize += childSizeInfo.value;
        }
        if (totalPercentageSize == 0) totalPercentageSize = 100;

        const sizeInfoChildren: TpCssSizeInfo[] = [];
        for (const childDef of children) {
            const childSizeInfo = getWidgetSize(childDef, dim)!;
            if (childSizeInfo.isPercentage) {
                const relativeSize = Math.min(childSizeInfo.value, childSizeInfo.value / totalPercentageSize * 100);
                let sizeString = `${relativeSize}%`;
                if (totalAbsoluteSize>0) {
                    const attributedAbsoluteSize = Math.round(totalAbsoluteSize / childCountWithRelativeSize);
                    sizeString = `calc(${relativeSize}% - ${attributedAbsoluteSize}px)`;
                    totalAbsoluteSize -= attributedAbsoluteSize;
                    childCountWithRelativeSize--;
                } 
                sizeInfoChildren.push({
                    sizeString,
                    sizeConstrained: true,
                });
            } else {
                sizeInfoChildren.push({
                    sizeString: `${childSizeInfo.value}px`,
                    sizeConstrained: true,
                });
            }

        }
        return sizeInfoChildren;
    }

}
