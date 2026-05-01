import { TpContourData } from "../../../../../../util/contour/contourData";
import { TpRange } from "../../../../../../util/geometry/viewport2D";


export const LAYERTYPE_STRIPPLOT = 'stropplot';


export interface TpLayerDataSpecificsStripPlot  {
    // contains the that that is specific to the "points" layer type
    sliceValueRange?: TpRange;
    contourData?: TpContourData;
}