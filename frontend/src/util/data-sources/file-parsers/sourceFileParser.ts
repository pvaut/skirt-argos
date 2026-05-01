import { SYNCGROUP_TYPES } from "../../../features/resource-view/element-types/interface";
import { createUserError } from "../../errors";
import { parserHDF5 } from "./HDF5";
import { SOURCE_FILE_TYPES, TpDataSource, TpMemFile, TpSourceFileParser } from "./interface";
import { parserTSV } from "./TSV";





const _parsers = [parserHDF5, parserTSV];

const _parsersMap: { [fileType: string]: TpSourceFileParser } = {};

export const allSourceFileExtensions: string[] = [];

for (const parser of _parsers) {
    _parsersMap[parser.fileType] = parser;
    for (const ext of parser.acceptedExtensions) allSourceFileExtensions.push(ext);
}


function getFileExtension(fileName: string): string | null {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : null;
}


export function getSourceFileType(fileName: string): SOURCE_FILE_TYPES {
    const extension = getFileExtension(fileName);
    if (!extension) throw createUserError(`File does not have an extension: ${fileName}`);
    for (const parser of _parsers)
        if (parser.acceptedExtensions.indexOf(extension.toLowerCase()) >= 0)
            return parser.fileType;
    throw createUserError(`Unrecognized file extension: ${fileName} (expected: ${allSourceFileExtensions.join(', ')})`);
}


function getParser(fileType: SOURCE_FILE_TYPES) {
    if (!_parsersMap[fileType]) throw `Invalid file type: ${fileType}`;
    return _parsersMap[fileType];
}

export function openSourceFileFromBuffer(fileType: SOURCE_FILE_TYPES, fileName: string, buffer: TpMemFile): TpDataSource {
    return getParser(fileType).openFromMemFile(fileName, buffer);
}


// Returns the actual data
export function getDataSourceData(dataSource: TpDataSource, path: string): any {
    return getParser(dataSource.fileType).getData(dataSource, path);
}


export function closeSourceFile(sourceFile: TpDataSource) {
    getParser(sourceFile.fileType).close(sourceFile);
}