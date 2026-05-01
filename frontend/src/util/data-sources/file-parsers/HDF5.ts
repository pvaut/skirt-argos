import { h5wasm, File as HDF5File, Entity as HDF5Entity, Dataset as HDF5Dataset, Group as HDF5Group, Attribute as HDF5Attribute } from "h5wasm";

import { createInternalError, createUserError } from "../../errors";
import { guid, splitAtLastOccurrence } from "../../misc";
import { DT_DOUBLE, DT_FLOAT, DT_INT, DT_STRING, DT_VOID } from "../../../data/tables/interface";
import { SOURCE_FILE_TYPES, TpDataSource, TpDtSrcAttribute, TpDtSrcData, TpDtSrcGroup, TpMemFile, TpSourceFileParser } from "./interface";
import { H5Module } from "h5wasm/src/hdf5_util_helpers";





export interface TpHDF5Object extends TpDataSource {
    fileId: string;
    HDF5File: HDF5File | null;
}


interface TpHDF5Setup {
    FS: H5Module["FS"];
}


let theHDF5Setup: TpHDF5Setup | null = null;


export async function initHDF5() {
    const module = await h5wasm.ready;

    theHDF5Setup = {
        FS: module.FS,
    }
}

export function getHDF5Setup(): TpHDF5Setup {
    if (!theHDF5Setup)
        throw createInternalError(`HDF5 not initialized`);
    return theHDF5Setup;
}


function getHDF5DataType(sourceNode: HDF5Dataset | HDF5Attribute): string {
    let dataType = DT_VOID;
    // f= float (4 bytes)
    // d= double precision float (8 bytes)
    // b= byte
    // q= long long (8 bytes)
    // i= integer (4 bytes)
    // S= string
    // Capital = unsigned, lowercase = signed
    if (sourceNode.dtype == '<f') dataType = DT_FLOAT;
    if (sourceNode.dtype == '<b') dataType = DT_FLOAT;
    if (sourceNode.dtype == '<B') dataType = DT_FLOAT;
    if (sourceNode.dtype == '<d') dataType = DT_DOUBLE;
    if (sourceNode.dtype == '<Q') dataType = DT_STRING;
    if (sourceNode.dtype == '<q') dataType = DT_STRING;
    if (sourceNode.dtype == '<i') dataType = DT_INT;
    if (sourceNode.dtype == '<I') dataType = DT_INT;
    if (String(sourceNode.dtype)[0] == 'S') dataType = DT_STRING;
    if (dataType == DT_VOID) {
        console.log(`!!! unprocessed data type ${sourceNode.path} ${sourceNode.dtype}`);
    }
    return dataType;
}


function parseAttributes(sourceNode: HDF5Group | HDF5Dataset): TpDtSrcAttribute[] {
    const attributes: TpDtSrcAttribute[] = [];
    for (const attrName in sourceNode.attrs) {
        const attr = sourceNode.attrs[attrName];
        attributes.push({
            name: attrName,
            dataType: getHDF5DataType(attr),
            shape: attr.shape || [],
            value: attr.value,
        })
    }
    return attributes;
}


function parseGroup(sourceNode: HDF5Group): TpDtSrcGroup {

    const memberGroups: TpDtSrcGroup[] = [];
    const datasets: TpDtSrcData[] = [];

    for (const key of sourceNode.keys()) {
        const subNode = sourceNode.get(key);
        if ((subNode as any).type == 'Group') {
            memberGroups.push(parseGroup(subNode as HDF5Group));
        }
        if ((subNode as any).type == 'Dataset') {
            datasets.push(parseDataset(subNode as HDF5Dataset));
        }
    }

    return {
        id: splitAtLastOccurrence(sourceNode.path, '/')[1],
        path: sourceNode.path,
        memberGroups,
        memberData: datasets,
        attributes: parseAttributes(sourceNode),
    }
}


function parseDataset(sourceNode: HDF5Dataset): TpDtSrcData {
    if (!sourceNode.shape) throw createUserError(`HDF% dataset should have a shape (${sourceNode.path})`);
    return {
        id: splitAtLastOccurrence(sourceNode.path, '/')[1],
        path: sourceNode.path,
        dataType: getHDF5DataType(sourceNode),
        shape: sourceNode.shape!,
        attributes: parseAttributes(sourceNode),
    }
}


export function getHDF5Data(dataSource: TpHDF5Object, path: string): any {
    return (dataSource.HDF5File!.get(path)! as HDF5Dataset).value;
}


function writeMemFile2FS(fileId: string, memFile: TpMemFile) {
    const FS = getHDF5Setup().FS;
    try { FS.unlink(fileId); } catch (_) { }
    FS.writeFile(fileId, new Uint8Array());
    const stream = FS.open(fileId, "w+");
    let offset = 0;
    let chunkIdx = 0;
    for (const chunk of memFile.chunks) {
        console.log(`==> writing chunk ${chunkIdx}/${memFile.chunks.length} offset=${offset / 1E6} Mb`);
        const buf = new Uint8Array(chunk);
        FS.write(stream, buf, 0, buf.length, offset);
        offset += buf.length;
        chunkIdx++;
    }
    FS.close(stream);
}


export function HDF5OpenFromMemFile(fileName: string, memFile: TpMemFile): TpHDF5Object {

    const fileId = guid();
    try {
        writeMemFile2FS(fileId, memFile);
        const HDF5File: HDF5File = new h5wasm.File(fileId, "r");
        if (HDF5File.type !== 'Group')
            throw createUserError(`HDF5 file is expected to have a Group as root`);
        const root = parseGroup(HDF5File);

        return {
            fileType: SOURCE_FILE_TYPES.HDF5,
            fileId,
            fileName,
            HDF5File,
            error: null,
            root,
        };
    } catch (e) {
        return {
            fileType: SOURCE_FILE_TYPES.HDF5,
            fileId,
            fileName,
            HDF5File: null,
            error: String(e),
            root: {
                id: '',
                path: '',
                memberGroups: [],
                memberData: [],
                attributes: [],
            },
        }
    }
}


export function HDF5Close(obj: TpHDF5Object) {
    obj.HDF5File?.close();
    obj.HDF5File = null;
    getHDF5Setup().FS.unlink(obj.fileId);
}


function _toHDF5(dataSource: TpDataSource): TpHDF5Object {
    if (dataSource.fileType != SOURCE_FILE_TYPES.HDF5) throw createInternalError(`File type mismatch`);
    return dataSource as TpHDF5Object;
}


export const parserHDF5: TpSourceFileParser = {
    fileType: SOURCE_FILE_TYPES.HDF5,
    acceptedExtensions: ['hdf', 'hdf5', 'h5'],
    openFromMemFile: HDF5OpenFromMemFile,
    getData: (dataSource: TpDataSource, path: string) => { return getHDF5Data(_toHDF5(dataSource), path); },
    close: (dataSource: TpDataSource) => { return HDF5Close(_toHDF5(dataSource)); },
}