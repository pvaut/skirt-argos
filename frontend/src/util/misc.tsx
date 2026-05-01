import { useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import { TpTableData } from "../data/tables/interface";


export function guid() {
    return 'G' + uuidv4().replaceAll('-', '_');
}


export const debounce = <F extends (...args: any) => any>(func: F, waitFor: number) => {
    let timeout: any = 0;
    const debounced = (...args: any) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), waitFor);
    };
    return debounced as (...args: Parameters<F>) => ReturnType<F>;
};


export const useDebounceInComponent = <F extends (...args: any) => any>(func: F, waitFor: number) => {
    return useCallback(debounce(func, waitFor), []);
};


export const throttle = <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
    let isWaiting = false;
    let needFinal = true;

    return (...args: T) => {
        if (isWaiting) {
            needFinal = true;
            return;
        }

        func(...args);
        isWaiting = true;

        setTimeout(() => {
            if (needFinal) func(...args);
            isWaiting = false;
        }, delay);
    };
};


export function perfTimerStart() {
    return {
        timeStamp: performance.now(),
    };
}


export function perfTimerStop(perfTimerObj: any, descr: string) {
    console.log(`${(performance.now() - perfTimerObj.timeStamp).toFixed(2)} ms for ${descr}`);
}


export function count2DisplayString(count: number): string {
    if (count > 1000000) return `${(count / 1000000).toFixed(2)}M`;
    if (count > 10000) return `${(count / 1000).toFixed(0)}k`;
    if (count > 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
}


export function fraction2DisplayString(count: number, totCount: number): string {
    if (totCount <= 0) return '---';
    return (count * 100 / totCount).toFixed(2) + '%';
}


export function smart2String(obj: any): string {
    if (typeof obj === "bigint") return String(obj);
    return JSON.stringify(obj);
}


export function roundToDecimals(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}


function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


export function highlightToken(source: string, token: string, highlightStyleName: string): any {
    if (!token) return source;
    const lowerCaseToken = token.toLocaleLowerCase();
    const escapedToken = escapeRegExp(token);
    try {
        const components = source.split(new RegExp(`(${escapedToken})`, 'gi'));
        return (
            <span>
                {
                    components.map((part, i) => (
                        <span key={i} className={part.toLowerCase() == lowerCaseToken ? highlightStyleName : ''} >
                            {part}
                        </span>
                    ))
                }
            </span>
        );
    } catch (e) {
        return source;
    }
}


export function getGammaFactor(setting: number): number {
    return (0.4 + setting * 0.6) ** 3 / (0.4 + 0.5 * 0.6) ** 3;
}


export function generateUniquePropertyId(table: TpTableData, name: string): string {
    let candidateIdBase = name;
    if ((candidateIdBase.length == 0) || (!/^[a-zA-Z]$/.test(candidateIdBase[0])))
        candidateIdBase = 'COL' + candidateIdBase;
    for (let idx = 0; idx < candidateIdBase.length; idx++) {
        if (!/^[a-zA-Z0-9_]$/.test(candidateIdBase[idx]))
            candidateIdBase = candidateIdBase.substring(0, idx) + '_' + candidateIdBase.substring(idx + 1);
    }
    let candidateIdFull = candidateIdBase;
    let propIdx = 0;
    while ((table.columnsMap[candidateIdFull]) || (candidateIdFull == 'COL')) {
        propIdx++;
        candidateIdFull = candidateIdBase + String(propIdx);
    }
    return candidateIdFull;
}


export function splitAtLastOccurrence(str: string, token: string): [string, string] {
    const index = str.lastIndexOf(token);
    if (index === -1) {
        return [str, ''];
    }
    const before = str.substring(0, index);
    const after = str.substring(index + token.length);
    return [before, after];
}


export function getUniformStringValue(arr: (string | null)[]): string | null {
    // In case all list elements contain the same string value, return that value. If not, return null
    if (arr.length === 0) return null;
    const firstValue = arr[0];
    for (const val of arr)
        if (val !== firstValue)
            return null;

    return firstValue;
}

