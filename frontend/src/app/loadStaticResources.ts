
import { Dispatch } from '@reduxjs/toolkit';
import { load as loadYaml, dump as dumpYaml } from 'js-yaml';
import { TpAppAPI } from '../api/api';
import { _addLocalConcept, _addLocalResource, _setLocalResourceLoaded, TpLocalResourcesSetInfo } from '../data/store/localResourcesSlice';
import { locDb, TpLocDBLoadInfo } from '../data/local-database/localDatabase';
import { createNewLocalResourceInfo, LOAD_STATUS, PREFIX_STATIC_RESOURCE, TpConcept, TpResourceInfo } from '../data/interfaces';
import { createConfigError, createInternalError } from '../util/errors';
import { downloadArrayBufferWithProgress, getCacheBustedUrl } from '../util/download/fetchWithProgress';
import { arrayBuffer2MemFile } from '../util/data-sources/file-parsers/helpers';
import { addTablesToResource } from '../util/data-sources/upload-file-selector/fileImportWizard';


export interface TpLoadingContext {
    api: TpAppAPI;
    dispatch: Dispatch;
    theLocalDb: TpLocDBLoadInfo | null;
    setDownloadProgress: (uri: string, progress: number) => void;
}


export function isValidDataFetchResponse(resp: Response) {
    const contentType = resp.headers.get('Content-Type') || '';
    return (resp.ok) && (!contentType.includes('text/html'));
}


async function loadAllStaticYamlDefs(path: string, ids: string[]) {
    const fileUrls = ids.map(id => `/data/${path}/${id}.yaml`);

    // Fetch all files in parallel
    const responses = await Promise.all(fileUrls.map(url => fetch(getCacheBustedUrl(url))));
    // Check for fetch errors
    responses.forEach((res, idx) => {
        if (!isValidDataFetchResponse(res))
            throw new Error(`Failed to fetch ${fileUrls[idx]}: ${res.statusText}`);
    });
    // Parse the contents as needed
    const conceptDefs = await Promise.all(responses.map(resp => resp.text()));
    return conceptDefs;
};

function safeDateToISOString(value: any): string {
    if ((value instanceof Date) && value.toISOString)
        return value.toISOString();
    return String(value)
}

function createResourceFromStaticDef(data: any): TpResourceInfo {
    const resource = createNewLocalResourceInfo(data.dataSourceType);
    resource.uri = PREFIX_STATIC_RESOURCE + data.id;
    resource.name = data.name;
    resource.description = data.description || "";
    resource.conceptId = data.conceptId;
    resource.thumbnail = data.thumbnail || '';
    resource.creationTimeStamp = safeDateToISOString(data.creationTimeStamp);
    resource.status = LOAD_STATUS.LOADING_STATIC_DATA;
    return resource;
}


async function fetchStaticResourceData(ctx: TpLoadingContext, resource: TpResourceInfo, dataFile: string) {
    const fileUrl = `/data/source_files/${dataFile}`;
    console.log(`==> fetching resource data file ${fileUrl}`);

    const buffer = await downloadArrayBufferWithProgress(fileUrl, (progress: number) => {
        ctx.setDownloadProgress(resource.uri, progress);
    });
    console.log(`==> static resource data fetched for ${dataFile}: length=${buffer.byteLength}`);
    // We update the store indicating that the resource now is loaded
    ctx.dispatch(_setLocalResourceLoaded({ uri: resource.uri }));
    // We save the resource to the local database
    const updatedResource = structuredClone(resource);
    updatedResource.status = LOAD_STATUS.PRESENT;
    locDb.addResource(resource, arrayBuffer2MemFile(buffer));

}


function getConceptFromLocalDb(theLocalDb: TpLocDBLoadInfo, conceptId: string): TpConcept {
    const concept = theLocalDb.localConcepts.find(concept => concept.id == conceptId);
    if (!concept) throw createConfigError(`Local concept not found: ${conceptId}`);
    return concept;
}


function staticConceptNeedsFetching(staticServerConcept: { id: string, version: string }, localConcepts: TpConcept[]): boolean {
    const matchingConcept = localConcepts.find(concept => concept.id == staticServerConcept.id);
    if (!matchingConcept) return true; // not present locally
    return matchingConcept.serverVersion != staticServerConcept.version; // present locally, but not the correct version
}


function staticResourceNeedsFetching(staticResource: { uri: string, version: string }, localResources: TpResourceInfo[]): boolean {
    const matchingResource = localResources.find(res => res.uri == PREFIX_STATIC_RESOURCE + staticResource.uri);
    if (!matchingResource) return true; // not present locally
    return matchingResource.serverVersion != staticResource.version; // present locally, but not the correct version
}


export async function loadStaticData(ctx: TpLoadingContext, existingLocalData: TpLocalResourcesSetInfo) {
    // Fetch concepts & resources that are statically defined at the server side, and store them locally
    // This only happens for items that are aiterh not yetpresnt locally, or have a different version numer

    // Fetch the index, which contains an overview of all statically served concepts & resources
    const response = await fetch(getCacheBustedUrl('/data/index.yaml'));
    if (!response.ok) throw new Error(`Failed to fetch resource index: ${response.statusText}`);
    let index: any;
    try {
        const text = await response.text();
        index = loadYaml(text);
    } catch (e) {
        throw  createInternalError(`Unable to load index: ${e}`);
    }

    const staticServerConceptInfo: { id: string, version: string }[] = index.concepts;
    console.log(`==> All static concepts: ${staticServerConceptInfo.map(a => JSON.stringify(a)).join('; ')}`);
    const missingConceptIds = staticServerConceptInfo
        .filter(serverConcept => staticConceptNeedsFetching(serverConcept, existingLocalData.concepts))
        .map(serverConcept => serverConcept.id);

    if (missingConceptIds.length > 0) {
        console.log(`==> Fetching missing static concepts: ${missingConceptIds.join('; ')}`);
        const missingConceptsTextDef = await loadAllStaticYamlDefs('concepts', missingConceptIds);

        const addedConceptIds: string[] = [];
        for (const conceptTextDef of missingConceptsTextDef) {
            const data = loadYaml(conceptTextDef) as any;
            const conceptDef = data.conceptDefinition as TpConcept;
            //we add the server version
            const staticConceptInfo = staticServerConceptInfo.find(c => c.id == conceptDef.id);
            if (!staticConceptInfo) throw createConfigError(`Server concept id mismatch: ${conceptDef.id}`);
            conceptDef.serverVersion = staticConceptInfo.version;
            addedConceptIds.push(conceptDef.id);
            // We store the stuff in the local browser db
            await locDb.addConceptDef(conceptDef);
            await locDb.storeConceptRenderTemplate(conceptDef.id, data.dashboardTemplate);
            // We should also add it to the already loaded instance!
            ctx.theLocalDb!.localConcepts.push(conceptDef);
            ctx.theLocalDb!.localRenderTemplates.push(data.dashboardTemplate);
            // And we add it to the config store
            ctx.dispatch(_addLocalConcept({ concept: conceptDef }));
        }

        // sanity check, e.g. to avoid identifier mismatches
        for (const newConceptId of missingConceptIds)
            if (addedConceptIds.indexOf(newConceptId) < 0)
                throw Error(`Failed to add new static concept ${newConceptId} (added: ${addedConceptIds.join('; ')})`);
    }


    const staticServerResourcesInfo: { uri: string, version: string }[] = index.resources;
    console.log(`==> All static resources: ${staticServerConceptInfo.map(a => JSON.stringify(a)).join('; ')}`);
    const missingStaticResourceIds = staticServerResourcesInfo
        .filter(serverResource => staticResourceNeedsFetching(serverResource, existingLocalData.resources))
        .map(serverResource => serverResource.uri);

    if (missingStaticResourceIds.length > 0) {
        console.log(`==> Fetching missing static resources: ${missingStaticResourceIds.join('; ')}`);
        const missingResourcsTextDef = await loadAllStaticYamlDefs('resources', missingStaticResourceIds);

        const addedResourceUris: string[] = [];
        for (const resourceTextDef of missingResourcsTextDef) {
            const data = loadYaml(resourceTextDef) as any;
            const resourceDef = createResourceFromStaticDef(data);
            const serverResourceInfo = staticServerResourcesInfo.find(r => PREFIX_STATIC_RESOURCE + r.uri == resourceDef.uri);
            if (!serverResourceInfo)
                throw createConfigError(`Server resource uri mismatch: ${resourceDef.uri} not found`);
            resourceDef.serverVersion = serverResourceInfo.version;
            addTablesToResource(null, resourceDef, getConceptFromLocalDb(ctx.theLocalDb!, resourceDef.conceptId));
            addedResourceUris.push(resourceDef.uri);

            // We should also add / replace it to the already loaded instance!
            const idx = ctx.theLocalDb!.localResources.findIndex(r => r.uri == resourceDef.uri)
            if (idx < 0) ctx.theLocalDb!.localResources.push(resourceDef);
            else ctx.theLocalDb!.localResources[idx] = resourceDef;
            // And we add it to the config store
            ctx.dispatch(_addLocalResource({ resource: resourceDef }));
            // We fetch the source data & store all the stuff in the local browser db
            fetchStaticResourceData(ctx, resourceDef, data.dataFile)

        }

        // sanity check, e.g. to avoid identifier mismatches
        for (const newResourceId of missingStaticResourceIds)
            if (addedResourceUris.indexOf(PREFIX_STATIC_RESOURCE + newResourceId) < 0)
                throw Error(`Failed to add new static concept ${newResourceId} (added: ${addedResourceUris.join('; ')})`);

    }

}
