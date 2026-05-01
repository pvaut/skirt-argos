import { TpTableData } from "../interface";


export interface TpTableAggregationRecipe {
    recipeId: string;
    perform: (table: TpTableData, settings: any) => any;
}