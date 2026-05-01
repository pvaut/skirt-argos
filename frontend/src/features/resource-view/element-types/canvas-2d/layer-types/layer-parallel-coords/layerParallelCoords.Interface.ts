import { TpColumnData } from "../../../../../../data/tables/interface";
import { TpContourData } from "../../../../../../util/contour/contourData";
import { TpRange } from "../../../../../../util/geometry/viewport2D";


export const LAYERTYPE_PARALLEL_COORDS = 'stripplot';


export interface TpLayerDataSpecificsParallelCoords  {
    columns: TpColumnData[];
    totalRange: TpRange;
    jitter: number;
}