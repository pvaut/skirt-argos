import { ReactNode, createContext, useContext } from 'react';
import { TpAppConfig, TpResourceInfo } from '../data/interfaces';
import { TpTableData } from '../data/tables/interface';
import { createInternalError } from '../util/errors';



export interface TpAppAPI {
    getConfig: () => Promise<TpAppConfig>;
    getResourceInfo: (uri: string) => Promise<TpResourceInfo>;
    getTableMetaData: (uri: string) => Promise<TpTableData>;
    getTableContentBin: (table: TpTableData, appConfig: TpAppConfig) => any;
    saveResourceTemplate: (resourceTemplate: any) => any;
}


// NOTE: this "API" does not connect anymore to a server component, as ARGOS now runs client-only.
// Concepts are resources are served statically only, fetched by the client when missing, and stored locally
// Most functions in here should never be called anymore. This needs cleanup & final removal.

function useAPI(): TpAppAPI {

    function getConfig(): Promise<TpAppConfig> {
        return Promise.resolve({
            ontology: {
                concepts: [],
            },
            resourceRenderTemplates: [],
            serverIsBigEndian: false,
        });
    }

    function getResourceInfo(uri: string): Promise<TpResourceInfo> {
        throw createInternalError("NO SERVER API USED ANYMORE");
    }

    function getTableMetaData(uri: string): Promise<TpTableData> {
        throw createInternalError("NO SERVER API USED ANYMORE");
    }

    function getTableContentBin(table: TpTableData, appConfig: TpAppConfig): any {
        throw createInternalError("NO SERVER API USED ANYMORE");
    }

    function saveResourceTemplate(resourceTemplate: any): Promise<any> {
        throw createInternalError("NO SERVER API USED ANYMORE");
    }

    return {
        getConfig,
        getResourceInfo,
        getTableMetaData,
        getTableContentBin,
        saveResourceTemplate,
    }
}

const AppAPIContext = createContext<TpAppAPI>({} as TpAppAPI);

export function AppAPIProvider({ children }: { children: ReactNode }): any {
    return <AppAPIContext.Provider value={useAPI()}>{children}</AppAPIContext.Provider>;
}

export function useAppAPIContext() {
    return useContext(AppAPIContext);
}
