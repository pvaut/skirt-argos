

import { configSettingChoice, configSettingRange } from "../../../helpers/configSettingTypes";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef } from "../../../interface";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";
import { LAYERTYPE_BITMAPRGB } from "./layerBitmapRGB.Interface";
import { createBitmapRGBLayerData } from "./layerBitmapRGB.CreateData";
import { getHoverDataPoint_ScatterPlot, getLabels_Scatterplot } from "../layer-scatter-2d/layerScatter2D.Definition";





export const canvas2DLayerBitmapRGBDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_BITMAPRGB,
    name: 'RGB Bitmap',
    vizQuality: 1,

    canLassoDraw: true,

    sections: [
        { id: 'coordinates', name: 'Coordinates' },
        { id: 'colorR', name: 'Red' },
        { id: 'colorG', name: 'Green' },
        { id: 'colorB', name: 'Blue' },
        { id: 'conversion', name: 'RGB conversion' },
    ],

    channels: [
        {
            id: 'x',
            name: 'X axis',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.GRID_AXIS,
        },
        {
            id: 'y',
            name: 'Y axis',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.GRID_AXIS,
        },
        {
            id: 'colorR',
            name: 'Red data source',
            sectionId: 'colorR',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
        {
            id: 'colorG',
            name: 'Green data source',
            sectionId: 'colorG',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
        {
            id: 'colorB',
            name: 'Blue data source',
            sectionId: 'colorB',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
    ],

    configSettings: [


        {
            id: 'backgroundFactor',
            name: 'Background factor',
            sectionId: 'conversion',
            settingType: configSettingRange(-5, 10, 0.1, 0),
        },

        {
            id: 'stretchFactor',
            name: 'Stretch factor',
            sectionId: 'conversion',
            settingType: configSettingRange(1, 10, 0.2, 5),
        },

        {
            id: 'softeningFactor',
            name: 'Softening factor',
            sectionId: 'conversion',
            settingType: configSettingRange(0.1, 10, 0.1, 5),
        },


        {
            id: 'colorSaturationBuffer',
            name: 'Color saturation buffer',
            sectionId: 'conversion',
            settingType: configSettingRange(0, 10, 0.1, 0),
        },

       
        {
            id: 'normPerColor',
            name: 'Normalize color channels',
            sectionId: 'conversion',
            settingType: configSettingChoice([
                {id: 'perColor', name: "Individual"},
                {id: 'common', name: "Common"},
            ]),
        },

        {
            id: 'scalingFactorR',
            name: 'R source scaling',
            sectionId: 'colorR',
            settingType: configSettingRange(1, 10, 0.2, 5),
        },
        {
            id: 'scalingFactorG',
            name: 'G source scaling',
            sectionId: 'colorG',
            settingType: configSettingRange(1, 10, 0.2, 5),
        },
        {
            id: 'scalingFactorB',
            name: 'B source scaling',
            sectionId: 'colorB',
            settingType: configSettingRange(1, 10, 0.2, 5),
        },

        
    ],

    createLayerData: createBitmapRGBLayerData,
    getHoverDataPoint: getHoverDataPoint_ScatterPlot,
    getLabels: getLabels_Scatterplot,
    getThingsTodoHelp,
};


function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        "Click & drag the mouse to perform a lasso selection",
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
