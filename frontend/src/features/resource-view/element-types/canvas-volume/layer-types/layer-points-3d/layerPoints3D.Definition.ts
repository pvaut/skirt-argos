

import { chartNumericalColorConfigSettings } from "../../../helpers/chartDefinitions";
import { configSettingBoolean, configSettingGammaFactor, configSettingRange } from "../../../helpers/configSettingTypes";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef } from "../../../interface";
import { LAYERTYPE_VOLUME_POINTS, LAYERTYPE_VOLUME_POINTS_VELOCITY } from "../../interface";

import { getHoverDataPoint3D, getLabels3D, thingsTodoHelp3D } from "../layer-points-velocity/layerPointsVelocity.Definition";
import { createVolumePoints3DLayerData } from "./layerPoints3D.CreateData";






export const canvasVolumeLayerPoints3DDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_VOLUME_POINTS,
    name: '3D Points',
    vizQuality: 1,

    canLassoDraw: true,

    sections: [
        { id: 'coordinates', name: 'Coordinates' },
        { id: 'colors', name: 'Colors' },
        { id: 'size', name: 'Point size' },
        { id: 'slicing', name: 'Slicing' },
    ],

    channels: [
        {
            id: 'position',
            name: 'Position',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.VECTOR3D,
        },
        {
            id: 'color',
            name: 'Color',
            sectionId: 'colors',
            required: false,
            dataType: CHANNEL_TYPES.COLOR,
        },
        {
            id: 'size',
            name: 'Size',
            sectionId: 'size',
            required: false,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
        {    // allows tbe user to dynamically change a filtering of a numerical component; signature use case: for 3D coordinates, the Z coordinate when X and Y are plotted
            id: 'slice',
            name: 'Slice data',
            sectionId: 'slicing',
            required: false,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
    ],

    configSettings: [
        ...chartNumericalColorConfigSettings(true),
        {
            id: 'pointSizeFactor',
            name: 'Point size factor',
            sectionId: 'coordinates',
            settingType: configSettingRange(0, 10, 0.2, 4),
        },

        {
            id: 'sizeGammaFactor',
            name: 'Size gamma factor',
            sectionId: 'size',
            settingType: configSettingGammaFactor(),
            visibleIf: "!!$size",
        },

        {
            id: 'scaleOpacityWithSize',
            name: 'Scale with opacity',
            sectionId: 'size',
            settingType: configSettingBoolean(false),
            visibleIf: 'isNumericalProperty($size)',
        },


    ],

    createLayerData: createVolumePoints3DLayerData,
    getHoverDataPoint: getHoverDataPoint3D,
    getLabels: getLabels3D,
    getThingsTodoHelp,
};

function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        ...thingsTodoHelp3D,
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
