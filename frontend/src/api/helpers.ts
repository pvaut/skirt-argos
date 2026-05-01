import { TpAppConfig } from "../data/interfaces";
import { TpColumnData, TpTableData } from "../data/tables/interface";
import { createInternalError } from "../util/errors";


function testIsBigEndian(): boolean {
    let uInt32 = new Uint32Array([0x11223344]);
    let uInt8 = new Uint8Array(uInt32.buffer);

    if (uInt8[0] === 0x44) {
        return false;
    } else if (uInt8[0] === 0x11) {
        return true;
    } else {
        throw createInternalError('Could not determine endianness');
    }
};

const isBigEndian = testIsBigEndian();

function swapbyteUint16Array(x: Uint16Array): Uint16Array { return new Uint16Array(new Int8Array(x.buffer).reverse().buffer).reverse() }
function swapbyteInt32Array(x: Int32Array): Int32Array { return new Int32Array(new Int8Array(x.buffer).reverse().buffer).reverse() }
function swapbyteUint32Array(x: Uint32Array): Uint32Array { return new Uint32Array(new Int8Array(x.buffer).reverse().buffer).reverse() }
function swapbyteFloat32Array(x: Float32Array): Float32Array { return new Float32Array(new Int8Array(x.buffer).reverse().buffer).reverse() }
function swapbyteFloat64Array(x: Float64Array): Float64Array { return new Float64Array(new Int8Array(x.buffer).reverse().buffer).reverse() }


export function unpackInt32(buffer: ArrayBuffer, appConfig: TpAppConfig): Int32Array {
    let unpacked: Int32Array = new Int32Array(buffer)
    if (isBigEndian != appConfig.serverIsBigEndian)
        unpacked = swapbyteInt32Array(unpacked);
    return unpacked;
}


export function unpackUInt16(buffer: ArrayBuffer, appConfig: TpAppConfig): Uint16Array {
    let unpacked: Uint16Array = new Uint16Array(buffer)
    if (isBigEndian != appConfig.serverIsBigEndian)
        unpacked = swapbyteUint16Array(unpacked);
    return unpacked;
}


export function unpackUInt8(buffer: ArrayBuffer, appConfig: TpAppConfig): Uint8Array {
    let unpacked: Uint8Array = new Uint8Array(buffer)
    return unpacked;
}


export function unpackFloat32(buffer: ArrayBuffer, appConfig: TpAppConfig): Float32Array {
    let unpacked: Float32Array = new Float32Array(buffer)
    if (isBigEndian != appConfig.serverIsBigEndian)
        unpacked = swapbyteFloat32Array(unpacked);
    return unpacked;
}


export function unpackFloat64(buffer: ArrayBuffer, appConfig: TpAppConfig): Float64Array {
    let unpacked: Float64Array = new Float64Array(buffer)
    if (isBigEndian != appConfig.serverIsBigEndian)
        unpacked = swapbyteFloat64Array(unpacked);
    return unpacked;
}


export function processStringColumn(buffer: ArrayBuffer, colOffset: number, table: TpTableData, col: TpColumnData, appConfig: TpAppConfig): number {
    let binSizeArray: Uint32Array = new Uint32Array(buffer.slice(colOffset, colOffset + 4));
    if (isBigEndian != appConfig.serverIsBigEndian)
        binSizeArray = swapbyteUint32Array(binSizeArray);
    let binSize = binSizeArray[0];
    const binContent = buffer.slice(colOffset + 4, colOffset + 4 + binSize);
    const decoder = new TextDecoder();
    const str = decoder.decode(binContent);
    col.values = str.split('\n');
    if (table.rowCount != col.values.length)
        throw createInternalError(`Length mismatch while decoding string column`);

    return 4 + binSize; // the size taken by this column
}


export function createRowKeyIndexes(rowCount: number): Int32Array {
    const idx = new Int32Array(rowCount);
    for (let i = 0; i < rowCount; i++) idx[i] = i;
    return idx;
}
