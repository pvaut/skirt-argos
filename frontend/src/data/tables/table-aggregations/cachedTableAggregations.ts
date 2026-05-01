import { createInternalError } from "../../../util/errors";
import { TpTableData } from "../interface";
import { aggDotPlot } from "./recipes/dotPlot";
import { aggHistogram } from "./recipes/histogram";
import { aggNumStats } from "./recipes/numStats";


const cachedAggregations : {[aggKey: string]: { tableUri: string, result: any}} = {};

const recipes = [aggHistogram, aggDotPlot, aggNumStats];

export function clearCachedTableAggregations(tableData: TpTableData) {
    for (const key of Object.keys(cachedAggregations)) {
        if (cachedAggregations[key].tableUri == tableData.tableUri)
            delete cachedAggregations[key];
    }
}

// Returns an aggregation over a data table (e.g. a histogram)
// For efficiency reasons, the results are cached

export function getTableAggregation<T>(tableData: TpTableData, aggregationType: string, settings: any): T {
    const agg_key = `${tableData.tableUri}__${aggregationType}__${JSON.stringify(settings)}`;
    if (cachedAggregations[agg_key])
        return cachedAggregations[agg_key].result as T;

    const recipe = recipes.find(recipe => recipe.recipeId == aggregationType);
    if (!recipe) throw createInternalError(`Unknown aggregation type: ${aggregationType}`);
    const result = recipe.perform(tableData, settings) as T;
    cachedAggregations[agg_key] = {
        tableUri: tableData.tableUri,
        result
    };
    return result;
}