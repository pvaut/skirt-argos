import { DT_CATEGORICAL, DT_FLOAT, DT_STRING } from "../../../data/tables/interface";
import { createConfigError, createInternalError } from "../../errors";
import { perfTimerStart, perfTimerStop } from "../../misc";
import { determineDataType, memFile2Text } from "./helpers";
import { SOURCE_FILE_TYPES, TpDataSource, TpDtSrcData, TpMemFile, TpSourceFileParser } from "./interface";


export interface TpTSVObject extends TpDataSource {
    columnData: any[];
}


function TSVOpenFromMemFile(fileName: string, memFile: TpMemFile): TpTSVObject {

    const pf = perfTimerStart();

    const object: TpTSVObject = {
        fileType: SOURCE_FILE_TYPES.TSV,
        fileName,
        error: null,
        root: {
            id: 'table',
            path: '/table',
            memberGroups: [],
            memberData: [],
            attributes: [],
        },
        columnData: [],
    }

    const text = memFile2Text(memFile);

    const lines = text.trim().split("\n");
    if (lines.length === 0) return object;

    const headers = lines[0].split("\t");
    const colCount = headers.length;
    const rowCount = lines.length - 1;

    const columnDataStr: string[][] = [];
    for (let colNr = 0; colNr < colCount; colNr++)
        columnDataStr.push([]);

    for (let lineNr = 1; lineNr < lines.length; lineNr++) {
        if (lineNr % 100000 ==0)
            console.log(`==> processing TSV line ${lineNr} / ${lines.length}`);
        const rowValuesStr = lines[lineNr].split('\t');
        if (rowValuesStr.length > colCount)
            throw createConfigError(`Mismatch in number of columns (line ${lineNr + 1}): expected ${colCount}, found ${rowValuesStr.length}`);
        while (rowValuesStr.length < colCount) rowValuesStr.push("");
        for (let colNr = 0; colNr < colCount; colNr++)
            columnDataStr[colNr].push(rowValuesStr[colNr]);
    }

    for (let colNr = 0; colNr < colCount; colNr++) {
        const dataDef: TpDtSrcData = {
            id: headers[colNr],
            path: `/table/${headers[colNr]}`,
            dataType: determineDataType(columnDataStr[colNr]),
            shape: [rowCount],
            attributes: [],
        };
        object.root.memberData.push(dataDef);
        let dataValues: any = null;
        if (dataDef.dataType == DT_FLOAT) {
            dataValues = new Float32Array(rowCount);
            for (let rowNr = 0; rowNr < rowCount; rowNr++)
                dataValues[rowNr] = parseFloat(columnDataStr[colNr][rowNr]);
        }
        if (dataDef.dataType == DT_STRING) {
            dataValues = columnDataStr[colNr];
        }
        if (dataDef.dataType == DT_CATEGORICAL) {
            dataValues = columnDataStr[colNr];
        }
        if (!dataValues) throw createInternalError(`Unable to process data format ${dataDef.dataType}`);
        object.columnData.push(dataValues);
    }

    perfTimerStop(pf, "Reading TSV file");

    return object;
}


export function getTSVData(dataSource: TpTSVObject, path: string): any {
    const colNr = dataSource.root.memberData.findIndex(data => data.path == path);
    if (colNr < 0) throw createConfigError(`Column not found in TSV file: ${path}`);
    return dataSource.columnData[colNr];
}


function _toTSV(dataSource: TpDataSource): TpTSVObject {
    if (dataSource.fileType != SOURCE_FILE_TYPES.TSV) throw createInternalError(`File type mismatch`);
    return dataSource as TpTSVObject;
}


export const parserTSV: TpSourceFileParser = {
    fileType: SOURCE_FILE_TYPES.TSV,
    acceptedExtensions: ['tsv'],
    openFromMemFile: TSVOpenFromMemFile,
    getData: (dataSource: TpDataSource, path: string) => { return getTSVData(_toTSV(dataSource), path); },
    close: (dataSource: TpDataSource) => { },
}