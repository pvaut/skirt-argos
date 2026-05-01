import { useAppSelector } from "../util/hooks";
import { createConfigError, createInternalError } from "../util/errors";
import { selectConfig, TpConfigData } from "./store/configSlice";
import { TpConcept, TpResourceRenderTemplate } from "./interfaces";
import { DT_DOUBLE, DT_FLOAT } from "./tables/interface";

export function createDataArray(rowCount: number, dataType: string): any {
    if (dataType == DT_FLOAT)
        return new Float32Array(rowCount);
    if (dataType == DT_DOUBLE)
        return new Float64Array(rowCount);
    throw createInternalError(`Don't know how to create data array for ${dataType}`);
}


export function useConfig(): TpConfigData {
    const config = useAppSelector(selectConfig);
    if (!config.theConfig) throw createConfigError("Config is not loaded");
    return config;
}


export function hasConcept(config: TpConfigData, conceptId: string): boolean {
    return conceptId in config.conceptsMap;
}


export function getConcept(config: TpConfigData, conceptId: string): TpConcept {
    if (!config.conceptsMap[conceptId])
        throw createConfigError(`Concept not found: ${conceptId}`);
    return config.conceptsMap[conceptId];
}


export function getConceptName(config: TpConfigData, conceptId: string): string {
    if (!config.conceptsMap[conceptId]) return "";
    return config.conceptsMap[conceptId].name;
}


export function getResourceRenderTemplate(config: TpConfigData, conceptId: string): TpResourceRenderTemplate {
    const templates = config.theConfig!.resourceRenderTemplates.filter((tpl: any) => tpl.targetConcept == conceptId);
    if (templates.length == 0) {
        return { // We return a default, empty template
            targetConcept: conceptId,
            templateId: `autoTemplate_${conceptId}.yaml`,
            name: `Template for ${getConceptName(config, conceptId)}`,
            rootElement: {
                elements: [],
                type: 'verticalGroup'
            }
        }
    }
    if (templates.length > 1)
        throw createConfigError(`More than one render template found for concept ${conceptId}`);
    return templates[0];
}


export function cleanupTemplate(renderTemplate: any): any {
    // returns a copy with all elemTrStateId and parentElemTrStateId removed
    // For example to be used to save the template from an opened dashboard

    function _clean(elem: any): any {
        const rs = { ...elem };
        delete rs.elemTrStateId;
        delete rs.parentElemTrStateId;
        if (rs.elements) {
            rs.elements = rs.elements.map((elem: any) => _clean(elem));
        }
        return rs;
    }

    const result = {
        ...renderTemplate,
        rootElement: _clean(renderTemplate.rootElement),
    }
    return result;
}


export function getTableUri(resourceUri: string, tableId: string): string {
    return `${resourceUri}.${tableId}`;
}


export function tableUri2Id(tableUri: string): string {
    const tokens = tableUri.split('.');
    if (tokens.length < 2) throw createInternalError(`Invalid table uri: ${tableUri}`);
    return tokens[tokens.length - 1];
}


export function path2Id(path: string, toRemovePrefixPath?: string): string {
    let processedPath = path;
    if (toRemovePrefixPath && processedPath.startsWith(toRemovePrefixPath)) {
        processedPath = processedPath.slice(toRemovePrefixPath.length);
        if (processedPath.startsWith('/'))
            processedPath = processedPath.slice(1);
    }
    let id = processedPath.replaceAll('/', '$');
    return id;

}


export function id2Path(path: string): string {
    return path.replaceAll('$', '/');
}


export function camelCaseToWords(input: string): string {
    return input
        // Insert a space before all caps (except the first character)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        // Optional: Capitalize the first word, if desired
        .replace(/^./, str => str.toUpperCase());
}


export function getTableConceptId(resourceConceptId: string, tablePath: string): string {
    return `${resourceConceptId}__${path2Id(tablePath)}`;
}


export function generateDisplayNameFromPath(path: string): string {
    let name = path;
    const tokens = path.split('/');
    if (tokens.length > 0) name = tokens[tokens.length - 1];
    name = camelCaseToWords(name);
    name = name.replaceAll('_', ' ');
    return name;
}


export function toValidIdentifier(str: string): string {
    // Remove invalid characters and convert to camelCase-like format
    let identifier = str
        // Replace non-identifier characters with space
        .replace(/[^a-zA-Z0-9_$]/g, ' ')
        // Remove leading/trailing whitespace and split words
        .trim()
        .split(/\s+/)
        .join('_');

    // If the identifier starts with a number, prepend an underscore
    if (/^[0-9]/.test(identifier)) {
        identifier = '_' + identifier;
    }

    // If the identifier is empty or just underscores, use a default name
    if (!identifier || /^_+$/.test(identifier)) {
        identifier = '_var';
    }

    // If identifier is a reserved word (optional, simple list)
    const reservedWords = new Set([
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
        'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
        'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super', 'switch',
        'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
        'enum', 'await', 'implements', 'package', 'protected', 'static', 'interface',
        'private', 'public'
    ]);

    if (reservedWords.has(identifier)) {
        identifier = '_' + identifier;
    }

    return identifier;
}


