
import { getMLWidgetLayerTypeDef } from "../canvas-2d/canvas2DDefinition";
import { configSettingString } from "../helpers/configSettingTypes";
import { TpDataWidgetLayerTypeDef, TpElemTypeDefDataWidgetML, ELEMTYPE_CLASSES, SYNCGROUP_TYPES } from "../interface";
import { CanvasVolume } from "./CanvasVolume";
import { canvasVolumeLayerPoints3DDefinition } from "./layer-types/layer-points-3d/layerPoints3D.Definition";
import { canvasVolumeLayerPointsVelocityDefinition } from "./layer-types/layer-points-velocity/layerPointsVelocity.Definition";



const WIDGETTYPE_CANVAS_VOLUME = 'canvasVolume';

export const canvasVolumeDefinition: TpElemTypeDefDataWidgetML = {
    id: WIDGETTYPE_CANVAS_VOLUME,
    name: 'Volume Canvas',
    elementClass: ELEMTYPE_CLASSES.DATA_MULTI_LAYER,
    renderComponent: CanvasVolume,

    configSettings: [
        {
            id: 'title',
            name: 'Title',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },
        {
            id: SYNCGROUP_TYPES.VOLUME,
            name: 'Viewport sync group',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },
        {
            id: SYNCGROUP_TYPES.SLICE,
            name: 'Slice sync group',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },

    ],

    layerTypeDefs: [
        canvasVolumeLayerPointsVelocityDefinition,
        canvasVolumeLayerPoints3DDefinition,
    ],
}


export function getCanvasVolumeLayerTypeDef(layerTypeId: string): TpDataWidgetLayerTypeDef {
    return getMLWidgetLayerTypeDef(canvasVolumeDefinition, layerTypeId);
}


