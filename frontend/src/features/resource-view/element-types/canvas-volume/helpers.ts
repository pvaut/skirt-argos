
import { theAppColorSchema } from "../../../../util/color/appColorSchema";
import { changeOpacity, color2String, interpolateColors } from "../../../../util/color/color";
import { executeForm } from "../../../../util/components/form/Form";
import { filterTypeRange } from "../../../../util/filters/filter-types/filterTypeRange";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { TpVector, vecDotProd, vecNorm } from "../../../../util/geometry/vector";
import { TpRange } from "../../../../util/geometry/viewport2D";
import { getViewportVolumeCoordConvertors, TpViewportVolume, VOL_MAX_ZOOM, VOL_MIN_ZOOM } from "../../../../util/geometry/viewportVolume";
import { postAMessage } from "../../../../util/messageBus";
import { SYNCGROUP_TYPES, TpElemInfo } from "../interface";
import { getCanvasVolumeLayerTypeDef } from "./canvasVolumeDefinition";
import { MESSAGE_CANVASVOLUME_SYNC_POV } from "./interface";
import { TpCanvasVolumeTransientData } from "./rendering";


async function promptFilterUnionType(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
        executeForm({
            name: 'Volume filter logic',
            fields: [],
            customFormElement: "A filter is already in place. How do you want to treat the new filter?",
            buttons: [
                { id: 'replace', name: 'Replace with new filter' },
                { id: 'restrict', name: 'Narrow down to new filter' },
                { id: 'exclude', name: 'Exclude new filter' },
            ]
        }).then((result) => {
            resolve((result as any).buttonId);
        })
    });
}


export async function performLassoSelectionVolume(trData: TpCanvasVolumeTransientData, lassoPointsDisplay: TpPoint2D[],
    sliceInfo: { colId: string, range: TpRange } | null, isRestricting: boolean) {

    for (const layerData of trData.renderData!.layers) {
        if (layerData.visualSetup) {
            const visualSetup = layerData.visualSetup!;
            const tableUri = visualSetup.tableData.tableUri;
            const layerTypeDef = getCanvasVolumeLayerTypeDef(layerData.layerTypeId);
            if (layerTypeDef.canLassoDraw) {
                const theViewportVolume = structuredClone(trData.viewportVolume); // Note: we need to take a clone now because promptFilterUnionType might stop full screen mode, changing the chart dimensions
                let filter = layerData.createLassoFilter!(lassoPointsDisplay, visualSetup, theViewportVolume, isRestricting, false);
                if ((!isRestricting) && trData.loadedTables!.hasFilterStep(tableUri, filter)) {
                    const restrictType = await promptFilterUnionType();
                    if (restrictType == 'restrict')
                        filter = layerData.createLassoFilter!(lassoPointsDisplay, visualSetup, theViewportVolume, true, false);
                    if (restrictType == 'exclude')
                        filter = layerData.createLassoFilter!(lassoPointsDisplay, visualSetup, theViewportVolume, true, true);
                }
                trData.loadedTables!.addFilter(tableUri, filter);
                if (sliceInfo) {
                    setTimeout(() => {
                        const filter2 = filterTypeRange.createFilterInstance({
                            range: sliceInfo!.range,
                            binding: sliceInfo!.colId,
                        });
                        trData.loadedTables!.addFilter(tableUri, filter2);
                    }, 100);
                }
            }
        }
    }
}


export function broadcastSyncViewportVolume(viewportVolume: TpViewportVolume, sourceElemInfo: TpElemInfo) {
    // When the viewport of a 3D volume chart is changed, make sure the update is applied to all other charts in the same sync group
    if (!sourceElemInfo.syncGroups[SYNCGROUP_TYPES.VOLUME]) return;
    postAMessage(MESSAGE_CANVASVOLUME_SYNC_POV, {
        syncGroup: sourceElemInfo.syncGroups[SYNCGROUP_TYPES.VOLUME],
        viewportVolume,
        sourceElemTrStateId: sourceElemInfo.elemTrStateId,
    });
}


const orientationSphereCentX = 45;
const orientationSphereCentY = 45;
const orientationSphereRadius = 40;


export function isInOrientationSphere(trData: TpCanvasVolumeTransientData, pos: TpPoint2D): boolean {
    const rd = Math.sqrt((pos.x - orientationSphereCentX) ** 2 + (pos.y - orientationSphereCentY) ** 2);
    return rd <= orientationSphereRadius * 1.5;
}


export function renderOrientationSphere(trData: TpCanvasVolumeTransientData, canvasCtx: CanvasRenderingContext2D, highlight: boolean) {
    trData.canvasOverlay;
    const pixelRatio = trData.viewportVolume.pixelRatio;

    var sizeWidth = canvasCtx.canvas.width;
    var sizeHeight = canvasCtx.canvas.height;
    if ((sizeWidth < 250) || (sizeHeight < 250)) return;// we do this to avoid weird transient effects at first rendering, when the resolution is not yet set correctly;

    const centX = orientationSphereCentX * pixelRatio;
    const centY = orientationSphereCentY * pixelRatio;
    const radius = orientationSphereRadius * pixelRatio;

    const shadowRadius = highlight ? radius * 1.6 : radius * 1.3;
    let gradient = canvasCtx.createRadialGradient(centX, centY, radius * 1, centX, centY, shadowRadius);
    gradient.addColorStop(0, color2String(theAppColorSchema.colorBg3));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    canvasCtx.fillStyle = gradient;
    canvasCtx.beginPath();
    canvasCtx.arc(centX, centY, radius * shadowRadius, 0, 2 * Math.PI);
    canvasCtx.fill();

    canvasCtx.fillStyle = color2String(interpolateColors(theAppColorSchema.colorFg, theAppColorSchema.colorBg3, 0.1));
    if (highlight)
        canvasCtx.fillStyle = color2String(interpolateColors(theAppColorSchema.colorSp2, theAppColorSchema.colorBg3, 0.35));
    canvasCtx.beginPath();
    canvasCtx.arc(centX, centY, radius, 0, 2 * Math.PI);
    canvasCtx.fill();

    let { axisX, axisY, viewDir } = getViewportVolumeCoordConvertors(trData.viewportVolume);
    axisX = vecNorm(axisX);
    axisY = vecNorm(axisY);

    const colorFg = color2String(changeOpacity(theAppColorSchema.colorFg, highlight ? 0.85 : 0.65));
    const colorIm = color2String(changeOpacity(theAppColorSchema.colorFg, highlight ? 0.5 : 0.2));
    const colorBack = color2String(changeOpacity(theAppColorSchema.colorFg, highlight ? 0.1 : 0.1));

    canvasCtx.lineWidth = 2 * pixelRatio;
    function drawBigCircle(generator: (ang: number) => TpVector) {
        const itCount = 200;

        let currentOnFg: boolean | null = null;
        let first = true;
        for (let it = 0; it <= itCount; it++) {
            const ang = (it / itCount) * 2 * Math.PI;
            const pos = generator(ang);
            const x = centX + 0.97 * radius * vecDotProd(axisX, pos);
            const y = centY - 0.97 * radius * vecDotProd(axisY, pos);
            const onFg = vecDotProd(viewDir, pos) > 0;
            if (onFg !== currentOnFg) {
                if (!first) canvasCtx.stroke();
                first = true;
                canvasCtx.beginPath();
                currentOnFg = onFg;
                canvasCtx.strokeStyle = onFg ? colorFg : colorBack;
            }
            if (first) {
                canvasCtx.moveTo(x, y);
                first = false;
            }
            else
                canvasCtx.lineTo(x, y);
        }
        if (!first)
            canvasCtx.stroke();
    }

    function drawDir(dir: TpVector) {
        canvasCtx.strokeStyle = colorIm;
        canvasCtx.beginPath();
        canvasCtx.moveTo(centX, centY);
        canvasCtx.lineTo(centX + radius * vecDotProd(axisX, dir), centY - radius * vecDotProd(axisY, dir));
        canvasCtx.stroke();
    }

    drawDir({ x: 1, y: 0, z: 0 });
    drawDir({ x: 0, y: 1, z: 0 });
    drawDir({ x: 0, y: 0, z: 1 });

    drawBigCircle(ang => ({ x: Math.cos(ang), y: Math.sin(ang), z: 0 }));
    drawBigCircle(ang => ({ x: Math.cos(ang), z: Math.sin(ang), y: 0 }));
    drawBigCircle(ang => ({ z: Math.cos(ang), y: Math.sin(ang), x: 0 }));

    gradient = canvasCtx.createRadialGradient(centX, centY, radius * 0.6, centX, centY, radius * 1.02);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, color2String(interpolateColors(theAppColorSchema.colorFg, theAppColorSchema.colorBg3, 0.3)));
    canvasCtx.fillStyle = gradient;
    canvasCtx.beginPath();
    canvasCtx.arc(centX, centY, radius, 0, 2 * Math.PI);
    canvasCtx.fill();

    gradient = canvasCtx.createRadialGradient(centX - radius * 0.3, centY - radius * 0.3, radius * 0.1, centX - radius * 0.3, centY - radius * 0.3, radius * 0.95);
    gradient.addColorStop(0, color2String(changeOpacity(theAppColorSchema.colorFg, 0.2)));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    canvasCtx.fillStyle = gradient;
    canvasCtx.beginPath();
    canvasCtx.arc(centX, centY, radius, 0, 2 * Math.PI);
    canvasCtx.fill();


    if (highlight) {
        // render zoom indication
        canvasCtx.lineWidth = 2 * pixelRatio;
        const zoomFrac = (1 + Math.log(trData.viewportVolume.zoomFactor) - Math.log(VOL_MIN_ZOOM)) / (1 + Math.log(VOL_MAX_ZOOM) - Math.log(VOL_MIN_ZOOM));
        const zoomIndicY1 = centY - radius * zoomFrac;
        const zoomIndicY2 = centY + radius * zoomFrac;
        const zoomColor = color2String(interpolateColors(theAppColorSchema.colorSp2, theAppColorSchema.colorBg3, 0.6));
        canvasCtx.fillStyle = zoomColor
        canvasCtx.strokeStyle = zoomColor;
        canvasCtx.beginPath();
        canvasCtx.moveTo(centX + radius * 1.1, zoomIndicY1 + pixelRatio);
        canvasCtx.lineTo(centX + radius * 1.1, zoomIndicY2 - pixelRatio);
        canvasCtx.stroke();

        const arrowX = pixelRatio * 4;
        const arrowY = pixelRatio * 6;
        canvasCtx.beginPath();
        canvasCtx.moveTo(centX + radius * 1.1, zoomIndicY1);
        canvasCtx.lineTo(centX + radius * 1.1 + arrowX, zoomIndicY1 + arrowY);
        canvasCtx.lineTo(centX + radius * 1.1 - arrowX, zoomIndicY1 + arrowY);
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.beginPath();
        canvasCtx.moveTo(centX + radius * 1.1, zoomIndicY2);
        canvasCtx.lineTo(centX + radius * 1.1 + arrowX, zoomIndicY2 - arrowY);
        canvasCtx.lineTo(centX + radius * 1.1 - arrowX, zoomIndicY2 - arrowY);
        canvasCtx.closePath();
        canvasCtx.fill();
    }
}