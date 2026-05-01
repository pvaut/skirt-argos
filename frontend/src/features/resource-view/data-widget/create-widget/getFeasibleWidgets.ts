import { isNumberObject } from "util/types";
import { isNumericalDataType, TpTableData } from "../../../../data/tables/interface";
import { getTableColumn } from "../../../../data/tables/table";
import { guid } from "../../../../util/misc";
import { canvas2DDefinition } from "../../element-types/canvas-2d/canvas2DDefinition";
import { canvasVolumeDefinition } from "../../element-types/canvas-volume/canvasVolumeDefinition";
import { getElemTypeDefList } from "../../element-types/elementsFactory";
import { isColumnCompatileWithChannel } from "../../element-types/helpers/helpers";
import { ELEMTYPE_CLASSES, TpDataWidgetChannelDef, TpElemTypeDefDataWidgetSL } from "../../element-types/interface";
import { tableViewDefinition } from "../../element-types/table-view/tableViewDefinition";
import { canvas2DLayerParallelCoordsDefinition } from "../../element-types/canvas-2d/layer-types/layer-parallel-coords/layerParallelCoords.Definition";

export interface TpFeasibleWidgetCreationContext {
    dataTable: TpTableData,
    colIds: string[]
}

export interface TpFeasibleWidgetDefinition {
    name: string;
    elemDef: any;
    vizQuality: number;
}

interface TpChannelMatchInfo {
    matchedChannels: { channelId: string, colId: string }[];
    missingRequiredChannels: string[];
    missingColIds: string[];
    feasible: boolean;
}


function matchChannels(ctx: TpFeasibleWidgetCreationContext, channels: TpDataWidgetChannelDef[]): TpChannelMatchInfo {
    const usedColIds: { [id: string]: boolean } = {};
    const matchedChannels: { channelId: string, colId: string }[] = [];
    const missingRequiredChannels: string[] = [];
    for (const channel of channels) {
        let isMatched = false;
        for (const colId of ctx.colIds) {
            if ((!usedColIds[colId]) && (!isMatched)) {
                const colInfo = getTableColumn(ctx.dataTable, colId);
                if (isColumnCompatileWithChannel(channel, colInfo)) {
                    usedColIds[colId] = true;
                    matchedChannels.push({ channelId: channel.id, colId });
                    isMatched = true;
                }
            }
        }
        if ((!isMatched) && (channel.required)) missingRequiredChannels.push(channel.id);
    }
    const missingColIds: string[] = [];
    for (const colId of ctx.colIds)
        if (!usedColIds[colId]) missingColIds.push(colId);
    return {
        matchedChannels,
        missingRequiredChannels,
        missingColIds,
        feasible: (missingColIds.length == 0) && (missingRequiredChannels.length == 0)
    }
}

function generatorTableView(ctx: TpFeasibleWidgetCreationContext): TpFeasibleWidgetDefinition[] {
    if (ctx.colIds.length == 0) return [];
    const columns = ctx.colIds.map(colId => ({
        id: colId,
        width: 150,
    }))
    return [
        {
            name: tableViewDefinition.name,
            vizQuality: 0,
            elemDef: {
                elemTrStateId: guid(),
                type: tableViewDefinition.id,
                size: {
                    height: '600px',
                    width: '100%',
                },
                table: ctx.dataTable.id,
                encodings: {},
                settings: {
                    columns,
                }
            }

        }
    ];
}

function generatorParallelCoordinates(ctx: TpFeasibleWidgetCreationContext): TpFeasibleWidgetDefinition[] {
    if (ctx.colIds.length < 2) return [];
    for (const colId of ctx.colIds) {
        const colInfo = getTableColumn(ctx.dataTable, colId);
        if (!isNumericalDataType(colInfo.dataType)) return [];
    }
    const columns = ctx.colIds.map(colId => ({
        id: colId,
    }))
    return [

        {
            name: canvas2DLayerParallelCoordsDefinition.name,
            vizQuality: canvas2DLayerParallelCoordsDefinition.vizQuality,
            elemDef: {
                elemTrStateId: guid(),
                type: canvas2DDefinition.id,
                size: {
                    height: '600px',
                    width: '100%',
                },
                layers: [{
                    type: canvas2DLayerParallelCoordsDefinition.id,
                    encodings: {},
                    settings: {
                        columns,
                    },
                    table: ctx.dataTable.id,
                }]
            }
        }

    ];
}


function generatorDataWidgetSL(ctx: TpFeasibleWidgetCreationContext): TpFeasibleWidgetDefinition[] {
    const feasibleWidgets: TpFeasibleWidgetDefinition[] = [];

    for (const elemTypeInp of getElemTypeDefList()) {
        if (elemTypeInp.elementClass == ELEMTYPE_CLASSES.DATA_SINGLE_LAYER) {
            const elemTypeDef = elemTypeInp as TpElemTypeDefDataWidgetSL;
            if (elemTypeDef.id != tableViewDefinition.id) { // table views are treated as a special case
                const matchInfo = matchChannels(ctx, elemTypeDef.channels);
                if (matchInfo.feasible) {
                    const encodings: any = {};
                    for (const match of matchInfo.matchedChannels)
                        encodings[match.channelId] = match.colId;
                    feasibleWidgets.push(
                        {
                            name: elemTypeDef.name,
                            vizQuality: elemTypeDef.vizQuality,
                            elemDef: {
                                elemTrStateId: guid(),
                                type: elemTypeDef.id,
                                size: {
                                    height: '600px',
                                    width: '100%',
                                },
                                encodings,
                                table: ctx.dataTable.id,
                            }
                        }
                    );
                }
            }
        }
    }
    return feasibleWidgets;
}

function generatorDataWidgetCanvas2DLayer(ctx: TpFeasibleWidgetCreationContext): TpFeasibleWidgetDefinition[] {
    const feasibleWidgets: TpFeasibleWidgetDefinition[] = [];

    for (const layerTypeDef of canvas2DDefinition.layerTypeDefs)
        if (layerTypeDef.vizQuality >= 0) {
            const matchInfo = matchChannels(ctx, layerTypeDef.channels);
            if (matchInfo.feasible) {
                const encodings: any = {};
                for (const match of matchInfo.matchedChannels)
                    encodings[match.channelId] = match.colId;
                feasibleWidgets.push(
                    {
                        name: layerTypeDef.name,
                        vizQuality: layerTypeDef.vizQuality,
                        elemDef: {
                            elemTrStateId: guid(),
                            type: canvas2DDefinition.id,
                            size: {
                                height: '600px',
                                width: '100%',
                            },
                            layers: [{
                                type: layerTypeDef.id,
                                encodings,
                                table: ctx.dataTable.id,
                            }]
                        }
                    }
                );
            }

        }

    return feasibleWidgets;
}

function generatorDataWidgetCanvasVolumeLayer(ctx: TpFeasibleWidgetCreationContext): TpFeasibleWidgetDefinition[] {
    const feasibleWidgets: TpFeasibleWidgetDefinition[] = [];

    for (const layerTypeDef of canvasVolumeDefinition.layerTypeDefs) {
        const matchInfo = matchChannels(ctx, layerTypeDef.channels);
        if (matchInfo.feasible) {
            const encodings: any = {};
            for (const match of matchInfo.matchedChannels)
                encodings[match.channelId] = match.colId;
            feasibleWidgets.push(
                {
                    name: layerTypeDef.name,
                    vizQuality: layerTypeDef.vizQuality,
                    elemDef: {
                        elemTrStateId: guid(),
                        type: canvasVolumeDefinition.id,
                        size: {
                            height: '600px',
                            width: '100%',
                        },
                        layers: [{
                            type: layerTypeDef.id,
                            encodings,
                            table: ctx.dataTable.id,
                        }]
                    }
                }
            );
        }

    }

    return feasibleWidgets;
}


const generators = [generatorDataWidgetSL, generatorDataWidgetCanvas2DLayer, generatorDataWidgetCanvasVolumeLayer, generatorParallelCoordinates, generatorTableView];

export interface TpFeasibleWidgetInfo {
    message?: string;
    feasibleWidgets: TpFeasibleWidgetDefinition[];
}

export function getFeasibleWidgets(ctx: TpFeasibleWidgetCreationContext): TpFeasibleWidgetInfo {
    const feasibleWidgets: TpFeasibleWidgetDefinition[] = [];
    let message: string | undefined = undefined;

    for (const generator of generators)
        feasibleWidgets.push(...generator(ctx));

    if (feasibleWidgets.length == 0) {
        if (ctx.colIds.length == 0)
            message = "Select one or more columns to see compatible charts";
        else
            message = "No charts are found to be compatible with the currently selected columns. Select different columms to see compatible charts";
    }

    feasibleWidgets.sort((a, b) => b.vizQuality - a.vizQuality);

    return {
        feasibleWidgets,
        message
    };
}