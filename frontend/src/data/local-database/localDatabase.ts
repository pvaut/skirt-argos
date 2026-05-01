import localForage from "localforage";
import { LOAD_STATUS, TpConcept, TpResourceInfo, TpResourceRenderTemplate } from "../interfaces";
import { reportException } from "../../util/errors";
import { TpMemFile } from "../../util/data-sources/file-parsers/interface";


const DBKEY_PREFIX_LOCAL_RESOURCE_INFO = "LOCRESOURCEINFO_";
const DBKEY_PREFIX_LOCAL_RESOURCE_DATA = "LOCRESOURCEDATA_";
const DBKEY_PREFIX_LOCAL_RESOURCE_THUMBNAIL = "LOCRESOURCETHUMBNAIL_";
const DBKEY_PREFIX_LOCAL_CONCEPT_DEF = "LOCCONCEPTDEF_";
const DBKEY_PREFIX_LOCAL_RENDER_TEMPLATE = "LOCRENDERTPL_";

async function addResource(resource: TpResourceInfo, memFile: TpMemFile) {
    try {
        await localForage.setItem(DBKEY_PREFIX_LOCAL_RESOURCE_INFO + resource.uri, JSON.stringify(resource));
        console.log(`==> Resource info stored: ${resource.uri}`);
        // NOTE: we currently store the memfile as a singe blob, because FireFox has trouble with large ArrayBuffer storage in IndexedDb
        // An alternative could be to store the ArrayBuffer chunks individualle as separate records
        const blob = new Blob(memFile.chunks);
        await localForage.setItem(DBKEY_PREFIX_LOCAL_RESOURCE_DATA + resource.uri, blob);
        console.log(`==> Resource data stored: ${resource.uri} size: ${blob.size}`);
    } catch (err) {
        reportException(err);
    }
}

function updateResource(resource: TpResourceInfo) {
    localForage.setItem(DBKEY_PREFIX_LOCAL_RESOURCE_INFO + resource.uri, JSON.stringify(resource)).then(function () {
        console.log(`==> resource info stored`);
    }).catch(function (err) {
        reportException(err);
    });
}

function removeResource(uri: string) {
    localForage.removeItem(DBKEY_PREFIX_LOCAL_RESOURCE_INFO + uri);
    localForage.removeItem(DBKEY_PREFIX_LOCAL_RESOURCE_DATA + uri);
    localForage.removeItem(DBKEY_PREFIX_LOCAL_RESOURCE_THUMBNAIL + uri);
}

async function addConceptDef(conceptDef: TpConcept): Promise<any> {
    await localForage.setItem(DBKEY_PREFIX_LOCAL_CONCEPT_DEF + conceptDef.id, JSON.stringify(conceptDef));
}

function removeConcept(conceptId: string) {
    localForage.removeItem(DBKEY_PREFIX_LOCAL_CONCEPT_DEF + conceptId);
    localForage.removeItem(DBKEY_PREFIX_LOCAL_RENDER_TEMPLATE + conceptId);
}

function storeConceptRenderTemplate(conceptId: string, renderTemplate: TpResourceRenderTemplate): Promise<any> {
    return localForage.setItem(DBKEY_PREFIX_LOCAL_RENDER_TEMPLATE + conceptId, JSON.stringify(renderTemplate));
}


async function loadResourceSourceData(uri: string): Promise<TpMemFile | null> {
    const blob = await localForage.getItem<Blob>(DBKEY_PREFIX_LOCAL_RESOURCE_DATA + uri);
    if (!blob) return null;
    const arrayBuffer = await blob.arrayBuffer();
    return { chunks: [arrayBuffer] };
}

function storeResourceThumbnail(uri: string, data: ArrayBuffer): Promise<ArrayBuffer | null> {
    return localForage.setItem(DBKEY_PREFIX_LOCAL_RESOURCE_THUMBNAIL + uri, data);
}

function getResourceThumbnail(uri: string): Promise<ArrayBuffer | null> {
    return localForage.getItem<ArrayBuffer>(DBKEY_PREFIX_LOCAL_RESOURCE_THUMBNAIL + uri);
}


export interface TpLocDBLoadInfo {
    localResources: TpResourceInfo[];
    localConcepts: TpConcept[];
    localRenderTemplates: TpResourceRenderTemplate[];
}


function removeAll(): Promise<any> {
    return localForage.clear();
}

function read(): Promise<TpLocDBLoadInfo> {

    return new Promise(async (resolve, reject) => {
        const localResources: TpResourceInfo[] = [];
        const localConcepts: TpConcept[] = [];
        const localRenderTemplates: TpResourceRenderTemplate[] = [];
        const dbKeys = await localForage.keys();
        console.log(`==> DB KEYS: ${dbKeys}`);;
        for (const key of dbKeys) {
            if (key.startsWith(DBKEY_PREFIX_LOCAL_RESOURCE_INFO)) {
                const contentStr: string | null = await localForage.getItem<string>(key);
                const resource = JSON.parse(contentStr || "") as TpResourceInfo;
                resource.isLocal = true;
                resource.status = LOAD_STATUS.PRESENT;
                localResources.push(resource);
            }
            if (key.startsWith(DBKEY_PREFIX_LOCAL_CONCEPT_DEF)) {
                const contentStr: string | null = await localForage.getItem<string>(key);
                const conceptDef = JSON.parse(contentStr || "") as TpConcept;
                localConcepts.push(conceptDef);
            }
            if (key.startsWith(DBKEY_PREFIX_LOCAL_RENDER_TEMPLATE)) {
                const contentStr: string | null = await localForage.getItem<string>(key);
                const renderTemplate = JSON.parse(contentStr || "") as TpResourceRenderTemplate;
                localRenderTemplates.push(renderTemplate);
            }
        }
        resolve({
            localResources,
            localConcepts,
            localRenderTemplates,
        });
    });
}


export const locDb = {
    read,
    removeAll,
    addResource,
    updateResource,
    removeResource,
    addConceptDef,
    storeConceptRenderTemplate,
    removeConcept,
    loadResourceSourceData,
    storeResourceThumbnail,
    getResourceThumbnail,
};