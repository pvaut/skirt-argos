import styles from './ComputationHelp.module.scss';

import { COMP_DATA_TYPES } from "../computeOperators";
import { functionDefs, GROUP_ACTIONS_FORM, GROUP_ACTIONS_GENERAL, GROUP_ACTIONS_RESOURCES, TpFunctionDef } from '../functions-defs/functionsDefs';
import { TpComputeContext, TpComputeSourceItem } from '../interface';
import { smart2String } from '../../misc';
import { CopyClipboardButton } from '../../components/buttons/copy-clipboard-button/CopyClipboardButton';
import { useRef, useState } from 'react';
import { formatType } from '../helpers';


export function ComputationHelp({ computeCtx }: { computeCtx?: TpComputeContext }) {

    const [expanded, setExpanded] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null)

    function renderSourceItem(item: TpComputeSourceItem) {
        return (
            <div key={item.identifier} className={styles.line}>
                <div className={styles.operator}><CopyClipboardButton content={item.identifier} />{item.identifier}
                </div> {formatType(item.outputType)} {item.sourceValue && (
                    <span style={{ color: 'var(--color-sp1)' }}>{smart2String(item.sourceValue)}</span>
                )}
            </div>);
    }

    function renderBinOp(op: string, type1: string, type2: string, typeResult: string, description?: string) {
        return (
            <div className={styles.line}>
                {type1} <div className={styles.operator}>{op}</div> {type2} &rarr; {typeResult}
                {description && <div className={styles.description}>{description}</div>}
            </div>
        )
    }

    function renderFuncOp(func: TpFunctionDef) {
        const distinctOverLoads = func.overloads;
        return (
            <div className={styles.line} key={func.functionName}>
                {distinctOverLoads.map(overload => (
                    <div key={overload.id}>
                        <div className={styles.operator}><CopyClipboardButton content={`${func.functionName}()`} />{func.functionName}</div> (
                        {overload.arguments.map(arg => `${arg.name}: ${formatType(arg.inputType)}`).join(', ')}
                        )  &rarr; {formatType(overload.outputType)}
                    </div>
                ))}
                {func.description && <div className={styles.description}>{func.description}</div>}
            </div>
        )
    }

    return (
        <div className={styles.wrapper}>
            <div>
                <button onClick={() => {
                    setExpanded(!expanded);
                    setTimeout(() => {
                        if (containerRef.current)
                            containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }}>
                    {expanded ? "Hide expression help" : "Show expression help"}
                </button>
            </div>
            {expanded && (
                <div ref={containerRef} style={{scrollMarginTop: '150px'}}>
                    {computeCtx && (computeCtx.sourceItems.length > 0) && (
                        <>
                            <h3>Identifiers</h3>
                            <div  />
                            {computeCtx.sourceItems.map(item => renderSourceItem(item))}
                        </>
                    )}
                    <h3>Operators</h3>
                    {renderBinOp('+', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER)}
                    {renderBinOp('-', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER)}
                    {renderBinOp('*', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER)}
                    {renderBinOp('**', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER)}
                    {renderBinOp('/', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER)}
                    {renderBinOp('>', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.BOOLEAN)}
                    {renderBinOp('>=', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.BOOLEAN)}
                    {renderBinOp('<', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.BOOLEAN)}
                    {renderBinOp('<=', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.BOOLEAN)}
                    {renderBinOp('==', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.BOOLEAN)}
                    {renderBinOp('!=', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.BOOLEAN)}
                    {renderBinOp('&&', COMP_DATA_TYPES.BOOLEAN, COMP_DATA_TYPES.BOOLEAN, COMP_DATA_TYPES.BOOLEAN, 'Logical AND operation')}
                    {renderBinOp('||', COMP_DATA_TYPES.BOOLEAN, COMP_DATA_TYPES.BOOLEAN, COMP_DATA_TYPES.BOOLEAN, 'Logical OR operation')}
                    <h3>Functions</h3>
                    {functionDefs.filter(func => !func.isVectorType  && !func.isAction).map(func => renderFuncOp(func))}
                    <h3>Vector Operators</h3>
                    {renderBinOp('+', COMP_DATA_TYPES.VECTOR3D, COMP_DATA_TYPES.VECTOR3D, COMP_DATA_TYPES.VECTOR3D)}
                    {renderBinOp('-', COMP_DATA_TYPES.VECTOR3D, COMP_DATA_TYPES.VECTOR3D, COMP_DATA_TYPES.VECTOR3D)}
                    {renderBinOp('*', COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.VECTOR3D, COMP_DATA_TYPES.VECTOR3D)}
                    {renderBinOp('/', COMP_DATA_TYPES.VECTOR3D, COMP_DATA_TYPES.NUMBER, COMP_DATA_TYPES.VECTOR3D)}
                    <h3>Vector Functions</h3>
                    {functionDefs.filter(func => func.isVectorType && !func.isAction).map(func => renderFuncOp(func))}
                    <h3>Action functions - general</h3>
                    {functionDefs.filter(func => func.group == GROUP_ACTIONS_GENERAL).map(func => renderFuncOp(func))}
                    <h3>Action functions - forms</h3>
                    {functionDefs.filter(func => func.group == GROUP_ACTIONS_FORM).map(func => renderFuncOp(func))}
                    <h3>Action functions - resources</h3>
                    {functionDefs.filter(func => func.group == GROUP_ACTIONS_RESOURCES).map(func => renderFuncOp(func))}
                </div>)}
        </div>
    );
}


export function getComputationHelpInWrapper(computeCtx: TpComputeContext, text: string) {
    return (
        <>
            <div>{text}</div>
            <div
                style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '10px', marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
                <ComputationHelp
                    computeCtx={computeCtx}
                />
            </div>
        </>

    );
}