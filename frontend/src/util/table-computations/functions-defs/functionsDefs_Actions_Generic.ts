
import { getConfirmation } from "../../components/simple-modals/ConfirmationPopup";
import { messagePopup } from "../../components/simple-modals/MessagePopup";
import { downloadArrayBufferWithProgress } from "../../download/fetchWithProgress";
import { createExecutionStopError } from "../../errors";
import { guid } from "../../misc";
import { setWaitProgress, startWait, stopWait } from "../../processWithWait";
import { TpComputeContext } from "../interface";
import { addFunctionDef, GROUP_ACTIONS_GENERAL, typeArrayBuffer, typeBooleanScalar, typeNumberScalar, typeStringScalar, typeVectorColumn, typeVectorScalar, typeVoid } from "./functionsDefs";


async function fetchBinaryData(url: string): Promise<ArrayBuffer> {
    startWait("Fetching data...");

    try {
        const rs = await downloadArrayBufferWithProgress(url,
            (progress) => setWaitProgress(progress)
        );
        stopWait();
        return rs;
    } catch (e) {
        stopWait();
        throw e;
    }
}


export function initFunctionDefs_Actions_Generic() {

    addFunctionDef({
        functionName: 'compound',
        description: "Groups a number of statements together. Statements should be comma (,) separated and will be executed in a sequential way.",
        isVectorType: false,
        isAction: true,
        isAsync: false,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                ],
                outputType: typeVoid,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return undefined;
                },
            },
        ],
    });
    addFunctionDef({
        functionName: 'abort',
        description: "Stops the execution.",
        isVectorType: false,
        isAction: true,
        isAsync: false,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                ],
                outputType: typeVoid,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    throw createExecutionStopError();
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'continue',
        description: "No operation placeholder.",
        isVectorType: false,
        isAction: true,
        isAsync: false,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                ],
                outputType: typeVoid,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return undefined;
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'wait',
        description: "Waits for a specified amount of seconds.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'delay', inputType: typeNumberScalar },
                ],
                outputType: typeVoid,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => { resolve(undefined) }, argList[0] * 1000);
                    });
                },
            },
        ],
    });


    addFunctionDef({
        functionName: 'userConfirm',
        description: "Prompts the user for confirmation. Returns true if confirmed, false otherways.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'title', inputType: typeStringScalar },
                    { name: 'message', inputType: typeStringScalar },
                ],
                outputType: typeBooleanScalar,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return await getConfirmation({ title: argList[0], description: argList[1], });
                },
            },
        ],
    });


    addFunctionDef({
        functionName: 'message',
        description: "Shows a message to the user.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'title', inputType: typeStringScalar },
                    { name: 'message', inputType: typeStringScalar },
                ],
                outputType: typeBooleanScalar,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return await messagePopup({ title: argList[0], description: argList[1], });
                },
            },
        ],
    });


    addFunctionDef({
        functionName: 'openUrl',
        description: "Opens an url in a new browser tab.",
        isVectorType: false,
        isAction: true,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'url', inputType: typeStringScalar },
                ],
                outputType: typeVoid,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    window.open(argList[0], '_blank')?.focus();
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'fetchBinaryData',
        description: "Fetches binary data from an url.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'url', inputType: typeStringScalar },
                ],
                outputType: typeArrayBuffer,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return await fetchBinaryData(argList[0]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'guid',
        description: "Returns a globally unique identifier.",
        isVectorType: false,
        isAction: true,
        group: GROUP_ACTIONS_GENERAL,

        overloads: [
            {
                id: 'default',
                arguments: [
                ],
                outputType: typeStringScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return guid();
                },
            },
        ],
    });



}