


export function setCanvasFont(canvasCtx: CanvasRenderingContext2D, pixelRatio: number, fontSizePt: number, bold?: boolean) {
    let fontStr = `${fontSizePt * pixelRatio}pt Verdana`;
    if (bold) fontStr = 'bold ' + fontStr;
    canvasCtx.font = fontStr;
}


export function getCanvasTruncatedRenderText(canvasCtx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (canvasCtx.measureText(text).width <= maxWidth) {
        return text;
    }
    let textTruncated = text;
    let truncatedLength = textTruncated.length;
    while (canvasCtx.measureText(textTruncated).width > maxWidth && truncatedLength > 1) {
        truncatedLength--;
        textTruncated = text.substring(0, truncatedLength) + '...';
    }
    return textTruncated;
}


export function renderSimpleHatch(canvasCtx: CanvasRenderingContext2D, dst: number, left: number, top: number, right: number, bottom: number) {
    canvasCtx.save();
    canvasCtx.beginPath();
    canvasCtx.moveTo(left, top);
    canvasCtx.lineTo(right, top);
    canvasCtx.lineTo(right, bottom);
    canvasCtx.lineTo(left, bottom);
    canvasCtx.closePath();
    canvasCtx.clip();
    const x1 = left - (bottom - top);
    const x2 = right + (bottom - top);
    canvasCtx.beginPath();
    for (let i = Math.floor(x1 / dst) * dst; i <= x2; i += dst) {
        canvasCtx.moveTo(i, top);
        canvasCtx.lineTo(i - bottom + top, bottom);
    }
    canvasCtx.stroke();
    canvasCtx.restore()
}