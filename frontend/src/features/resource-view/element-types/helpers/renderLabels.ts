import { setCanvasFont } from "../../../../util/canvasTools";
import { changeOpacity, color2String, getColor, interpolateColors } from "../../../../util/color/color";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { isPointInRange2D, range2DOverlaps, TpRange2D, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { TpHoverPointInfo2D, TpLabelElem } from "../canvas-2d/interface";
import { TpHoverPointInfoVolume } from "../canvas-volume/interface";


export function drawHoverPoint(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, hoverPointInfo: TpHoverPointInfo2D | TpHoverPointInfoVolume) {
    {
        const labelBgColor = getColor(255, 255, 255);
        const labelFgColor = getColor(0, 0, 0);

        const pixelRatio = centralViewport.pixelRatio;
        setCanvasFont(canvasCtx, centralViewport.pixelRatio, 9);
        const marginX = 6 * pixelRatio;
        const textWidth = canvasCtx.measureText(hoverPointInfo.label).width;
        const boxWidth = textWidth + 2 * marginX;
        let boxLeft = hoverPointInfo.elemPos.x - textWidth / 2 - marginX;
        let boxHeight = 17 * pixelRatio;
        let boxTop = 42 * pixelRatio;
        if (boxLeft < 0) boxLeft = 0;
        const crossHairSizeInner = 5 * pixelRatio;
        const crossHairSizeOuter = 25 * pixelRatio;
        boxLeft = Math.min(boxLeft, centralViewport.totalDisplayWidth * pixelRatio - boxWidth);

        const drawCrossHair = (width: number) => {
            canvasCtx.fillRect(hoverPointInfo.elemPos.x - width / 2, hoverPointInfo.elemPos.y + crossHairSizeInner, width, crossHairSizeOuter - crossHairSizeInner);
            canvasCtx.fillRect(hoverPointInfo.elemPos.x - width / 2, hoverPointInfo.elemPos.y - crossHairSizeOuter, width, crossHairSizeOuter - crossHairSizeInner);
            canvasCtx.fillRect(hoverPointInfo.elemPos.x - crossHairSizeOuter, hoverPointInfo.elemPos.y - width / 2, crossHairSizeOuter - crossHairSizeInner, width);
            canvasCtx.fillRect(hoverPointInfo.elemPos.x + crossHairSizeInner, hoverPointInfo.elemPos.y - width / 2, crossHairSizeOuter - crossHairSizeInner, width);
        }

        canvasCtx.fillStyle = color2String(changeOpacity(labelFgColor, 0.5));
        drawCrossHair(4 * pixelRatio);
        canvasCtx.fillStyle = color2String(labelBgColor);
        drawCrossHair(2 * pixelRatio);

        canvasCtx.fillStyle = color2String(interpolateColors(labelFgColor, labelBgColor, 0.75));
        canvasCtx.beginPath();
        canvasCtx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, boxHeight / 2);
        canvasCtx.fill();
        canvasCtx.fillStyle = color2String(labelBgColor);
        canvasCtx.textBaseline = "middle";
        canvasCtx.fillText(hoverPointInfo.label, boxLeft + marginX, boxTop + boxHeight / 2);

        if (boxTop + boxHeight < hoverPointInfo.elemPos.y - crossHairSizeOuter) {
            canvasCtx.setLineDash([3 * pixelRatio, 3 * pixelRatio]);
            canvasCtx.strokeStyle = color2String(labelBgColor);
            canvasCtx.lineWidth = pixelRatio * 1;
            canvasCtx.beginPath();
            canvasCtx.moveTo(hoverPointInfo.elemPos.x, boxTop + boxHeight);
            canvasCtx.lineTo(hoverPointInfo.elemPos.x, hoverPointInfo.elemPos.y - crossHairSizeOuter);
            canvasCtx.stroke();
            canvasCtx.setLineDash([]);
        }

    }
}



export function renderLabels(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, labelInfoSet: TpLabelElem[]) {
    const pixelRatio = centralViewport.pixelRatio;

    const labelHeight = 14 * pixelRatio;
    const marginX = 2 * pixelRatio;
    setCanvasFont(canvasCtx, pixelRatio, 8);

    const positionedLabels: {
        labelArea: TpRange2D;
        labelText: string;
        targetPoint: TpPoint2D;
        isAbove: boolean; // if true, label is above target point. if false, it is below
    }[] = [];

    function tryPosition(labelLeft: number, labelWidth: number, yCenter: number, labelText: string, targetPoint: TpPoint2D, isUp: boolean): boolean {
        if ((yCenter < labelHeight) || (yCenter + labelHeight > centralViewport.totalDisplayHeight * pixelRatio)) return false;
        const labelArea: TpRange2D = {
            x: { min: labelLeft, max: labelLeft + labelWidth },
            y: { min: yCenter - labelHeight / 2, max: yCenter + labelHeight / 2 },
        }
        for (const existingLabels of positionedLabels)
            if (range2DOverlaps(labelArea, existingLabels.labelArea)) return false;
        positionedLabels.push({
            labelArea,
            labelText,
            targetPoint,
            isAbove: isUp,
        });
        return true;
    }

    const labelOffset = 30 * pixelRatio; // minimum distance between target point and label

    const labelFgColor = getColor(255, 255, 255);
    const labelBgColor = getColor(0, 0, 0, 0.5);
    const arrowOffset1 = 3 * pixelRatio;
    const arrowOffset2 = 9 * pixelRatio;
    const arrowWidth = 1.5 * pixelRatio;
    canvasCtx.textBaseline = "middle";

    for (const labelInfo of labelInfoSet) {
        const elemPos: TpPoint2D = labelInfo.elemPos;
        const labelText = labelInfo.labelText;
        if (isPointInRange2D(centralViewport.displayRange, { x: elemPos.x / pixelRatio, y: elemPos.y / pixelRatio })) {

            const textWidth = canvasCtx.measureText(labelText).width;
            const labelWidth = textWidth + 2 * marginX;

            let labelLeft = elemPos.x - textWidth / 2 - marginX;
            labelLeft = Math.max(0, labelLeft);
            labelLeft = Math.min(labelLeft, centralViewport.totalDisplayWidth * pixelRatio - textWidth - 2 * marginX);

            for (let tryOffsetRow = 0; tryOffsetRow < 20; tryOffsetRow++) {
                const tryYCenterAbove = elemPos.y - labelOffset - tryOffsetRow * labelHeight * 1.1;
                if (tryPosition(labelLeft, labelWidth, tryYCenterAbove, labelText, elemPos, true)) break;
                const tryYCenterBelow = elemPos.y + labelOffset + tryOffsetRow * labelHeight * 1.1;
                if (tryPosition(labelLeft, labelWidth, tryYCenterBelow, labelText, elemPos, false)) break;
            }
        }
    }

    // Draw arrows first
    canvasCtx.strokeStyle = color2String(labelFgColor);
    canvasCtx.lineWidth = pixelRatio * 1;
    for (const label of positionedLabels) {
        if (label.isAbove) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(label.targetPoint.x, label.targetPoint.y - arrowOffset1);
            canvasCtx.lineTo(label.targetPoint.x, label.labelArea.y.max);
            canvasCtx.moveTo(label.labelArea.x.min, label.labelArea.y.max);
            canvasCtx.lineTo(label.labelArea.x.max, label.labelArea.y.max);
            canvasCtx.stroke();
            canvasCtx.beginPath();
            canvasCtx.moveTo(label.targetPoint.x, label.targetPoint.y - arrowOffset1);
            canvasCtx.lineTo(label.targetPoint.x + arrowWidth, label.targetPoint.y - arrowOffset2);
            canvasCtx.lineTo(label.targetPoint.x - arrowWidth, label.targetPoint.y - arrowOffset2);
            canvasCtx.closePath();
            canvasCtx.fill();
            canvasCtx.stroke();
        } else {
            canvasCtx.beginPath();
            canvasCtx.moveTo(label.targetPoint.x, label.targetPoint.y + arrowOffset1);
            canvasCtx.lineTo(label.targetPoint.x, label.labelArea.y.min);
            canvasCtx.moveTo(label.labelArea.x.min, label.labelArea.y.min);
            canvasCtx.lineTo(label.labelArea.x.max, label.labelArea.y.min);
            canvasCtx.stroke();
            canvasCtx.beginPath();
            canvasCtx.moveTo(label.targetPoint.x, label.targetPoint.y + arrowOffset1);
            canvasCtx.lineTo(label.targetPoint.x + arrowWidth, label.targetPoint.y + arrowOffset2);
            canvasCtx.lineTo(label.targetPoint.x - arrowWidth, label.targetPoint.y + arrowOffset2);
            canvasCtx.closePath();
            canvasCtx.fill();
            canvasCtx.stroke();
        }

    }

    // Draw actual labels second
    for (const label of positionedLabels) {
        canvasCtx.fillStyle = color2String(labelBgColor);
        canvasCtx.fillRect(label.labelArea.x.min, label.labelArea.y.min, label.labelArea.x.max - label.labelArea.x.min, labelHeight);;

        canvasCtx.fillStyle = color2String(labelFgColor);
        canvasCtx.fillText(label.labelText, label.labelArea.x.min + marginX, label.labelArea.y.min + labelHeight / 2);

    }
}
