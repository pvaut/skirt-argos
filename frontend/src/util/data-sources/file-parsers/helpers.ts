
import { DT_CATEGORICAL, DT_FLOAT, DT_STRING } from "../../../data/tables/interface";
import { TpMemFile } from "./interface";


export function memFile2Text(memFile: TpMemFile): string {
    let text = "";
    const decoder = new TextDecoder("utf-8");
    for (const chunk of memFile.chunks) {
        text += decoder.decode(chunk);
    }
    return text;
}


export function arrayBuffer2MemFile(buffer: ArrayBuffer): TpMemFile {
    return { chunks: [buffer] };
}


function isValidNumber(str: string): boolean {
    const num = Number(str);
    return Number.isFinite(num);
}


function countDistinctStrings(arr: string[]): number {
    const unique = new Set<string>();
    for (const str of arr) {
        unique.add(str);
    }
    return unique.size;
}


export function determineDataType(columnDataStr: string[]): string { // DT_XXX type
    const rowCount = columnDataStr.length;
    const targetSampleCount = Math.min(rowCount, 20000);
    const stepSize = Math.round(Math.max(1, rowCount / targetSampleCount));
    const sampleDataStr: string[] = [];
    for (let sampleRowNr = 0; sampleRowNr < rowCount; sampleRowNr += stepSize)
        sampleDataStr.push(columnDataStr[sampleRowNr]);

    //check for number
    let isNumerical = true;
    for (const sampleValueStr of sampleDataStr) {
        if ((sampleValueStr.length > 0) && (sampleValueStr != 'NA')) {
            if (!isValidNumber(sampleValueStr))
                isNumerical = false;
        }
    }
    if (isNumerical) return DT_FLOAT;

    //check for categorical
    if (countDistinctStrings(sampleDataStr) < 100)
        return DT_CATEGORICAL;

    return DT_STRING;
}