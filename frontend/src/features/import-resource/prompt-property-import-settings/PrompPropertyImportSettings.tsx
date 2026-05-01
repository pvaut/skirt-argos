import { useEffect, useState } from "react";
import { generateDisplayNameFromPath } from "../../../data/helpers";
import { TpConceptTableDefinition, TpConceptTablePropertyDefinition } from "../../../data/interfaces";
import { DT_VECTOR3D, DT_VOID, isNumericalDataType } from "../../../data/tables/interface";
import { getDataSourceDataDef, getDataTypeFromSourceData } from "../../../util/data-sources/dataSourceStructure";
import { postAMessage, useMessageListener } from "../../../util/messageBus";
import { PopupPortal } from "../../../util/components/popup-portal/PopupPortal";

import styles from './PrompPropertyImportSettings.module.scss';
import { StyledButton } from "../../../util/components/buttons/styled-button/StyledButton";
import { createConfigError } from "../../../util/errors";
import { PropertyTransformationEditor } from "./PropertyTransformationEditor";
import { TpDataSource, TpDtSrcAttribute, TpDtSrcData } from "../../../util/data-sources/file-parsers/interface";



export function getDefaultPropertyImportSettings(dataSource: TpDataSource, path: string): TpConceptTablePropertyDefinition {
    const sourceDataDef = getDataSourceDataDef(dataSource, path);
    if (sourceDataDef.shape.length > 2)
        throw createConfigError(`Invalid data shape (${sourceDataDef.shape.map(n => String(n)).join('x')}). Expected maximum 2 dimensions.`);
    const prop: TpConceptTablePropertyDefinition = {
        path,
        name: generateDisplayNameFromPath(path),
        description: '',
        transformationExpression: 'x',
        groupId: null,
        dataType: getDataTypeFromSourceData(sourceDataDef),
        children: [],
        decimalDigits: null,
        unitName: undefined,
    };
    if (sourceDataDef.shape.length == 2) {
        const isVector = sourceDataDef.shape[1] == 3;
        prop.totalChildCount = sourceDataDef.shape[1];
        for (let index = 0; index < sourceDataDef.shape[1]; index++) {
            prop.children.push({
                index,
                name: isVector ? `${prop.name} - ${['X', 'Y', 'Z'][index]}` : `${prop.name} - ${index + 1}`,
                dataType: prop.dataType,
            });
        }
        prop.dataType = isVector ? DT_VECTOR3D : DT_VOID;
    }


    return prop;
}

const MESSAGE_PROMPT_IMPORT_PROPERTY_SETTINGS = "_msgPromptImportPropertySettings";

interface TpCtx {
    handleOK?: any;
    handleCancel?: any;
    dataSource: TpDataSource;
    tableDef: TpConceptTableDefinition;
    initialProp: TpConceptTablePropertyDefinition;
}




export function promptImportPropertyImportSettings(dataSource: TpDataSource, tableDef: TpConceptTableDefinition, prop: TpConceptTablePropertyDefinition):
    Promise<{ prop: TpConceptTablePropertyDefinition }> {

    return new Promise((resolve, reject) => {

        const ctx: TpCtx = { handleOK, handleCancel, dataSource, tableDef, initialProp: prop };

        function handleOK(prop: TpConceptTablePropertyDefinition) { resolve({ prop }); };

        function handleCancel() { reject(); }

        postAMessage(MESSAGE_PROMPT_IMPORT_PROPERTY_SETTINGS, ctx);
    });
}





export function ConfigurePropertyImportSettingsModal() {

    useMessageListener(MESSAGE_PROMPT_IMPORT_PROPERTY_SETTINGS, (type: string, messageBody: any) => {
        const newCtx = messageBody as TpCtx;
        setCurrentCtx(newCtx);
        if (newCtx)
            setCurrentProp(structuredClone(newCtx.initialProp));
    });

    const [currentCtx, setCurrentCtx] = useState<TpCtx | null>(null);
    const [currentProp, setCurrentProp] = useState<TpConceptTablePropertyDefinition | null>(null);

    useEffect(() => {  // update the current property when the input changed
        if (currentCtx) setCurrentProp(structuredClone(currentCtx.initialProp));
    }, [currentCtx]);



    if (!currentCtx || !currentProp) return null;

    console.log(`==> rendering: propname=${currentCtx.initialProp.name}`);

    function updateCurrentProp() {
        setCurrentProp(structuredClone(currentProp));
    }


    return (
        <PopupPortal
            close={() => {
                currentCtx.handleCancel();
                setCurrentCtx(null);
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.titleArea}>
                    <div className={styles.title}>
                        Configure property
                    </div>
                </div>

                <div className={styles.bodyArea}>
                    <div>Data path: <span className={styles.identifier}>{currentCtx.initialProp.path}</span></div>
                    <div>Data type: <span className={styles.identifier}>{currentCtx.initialProp.dataType}</span></div>
                    <div>

                        <div className={styles.sectionTitle}>Property name</div>
                        <p>
                            <input
                                value={currentProp.name}
                                onChange={(ev) => {
                                    currentProp.name = ev.target.value;
                                    updateCurrentProp();
                                }}
                            />
                        </p>

                        <div className={styles.sectionTitle}>Property group</div>
                        <p>
                            <select
                                value={currentProp.groupId || ''}
                                onChange={(ev) => {
                                    currentProp.groupId = ev.target.value;
                                    updateCurrentProp();
                                }}
                            >
                                <option key={"_none_"} value={""}>
                                    -- None --
                                </option>
                                {currentCtx.tableDef.propertyGroups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </p>


                        <div className={styles.sectionTitle}>Description</div>
                        <p>
                            <textarea
                                rows={2}
                                value={currentProp.description}
                                onChange={(ev) => {
                                    currentProp.description = ev.target.value;
                                    updateCurrentProp();
                                }}
                            />
                        </p>

                    </div>
                    {(currentProp.children.length > 0) && (
                        <div>
                            <div className={styles.sectionTitle}>Member properties</div>
                            <p>This data set contains more than one dimension, resulting in a set of properties.</p>
                            {currentProp.children.map(child => (
                                <p key={`child_${child.index}`}>
                                    <span style={{ display: 'inline-block', width: '120px' }}>Index: {child.index}</span>
                                    {/* <div>Name: {child.name}</div> */}
                                    <input
                                        value={child.name}
                                        onChange={(ev) => {
                                            child.name = ev.target.value;
                                            updateCurrentProp();
                                        }}
                                    />
                                </p>
                            ))}
                        </div>
                    )}

                    {(isNumericalDataType(currentProp.dataType) || (currentProp.dataType == DT_VECTOR3D)) && (
                        <>
                            <div className={styles.sectionTitle}>Decimal digits</div>
                            <p>
                                <input
                                    value={(currentProp.decimalDigits != undefined) && (currentProp.decimalDigits != null) ? String(currentProp.decimalDigits) : ''}
                                    onChange={(ev) => {
                                        currentProp.decimalDigits = ev.target.value ? parseInt(ev.target.value) : null;
                                        updateCurrentProp();
                                    }}
                                />
                            </p>
                            <div className={styles.sectionTitle}>Units</div>
                            <p>
                                <input
                                    value={currentProp.unitName || ''}
                                    onChange={(ev) => {
                                        currentProp.unitName = ev.target.value || undefined;
                                        updateCurrentProp();
                                    }}
                                />
                            </p>
                        </>
                    )}

                    <div className={styles.sectionTitle}>Transformation</div>
                    <p>
                        Here you can define an expression that will be applied to each data value.
                        The expression should use the variable "x" for the input data.
                    </p>
                    {(currentProp.children.length > 0) && (
                        <p>Note that the expression will be applied independently to each member property.</p>
                    )}
                    <div>
                        <PropertyTransformationEditor
                            dataSource={currentCtx.dataSource}
                            prop={currentProp}
                            updateProp={updateCurrentProp}
                        />
                    </div>

                </div>

                <div className={styles.footerArea}>
                    <StyledButton
                        text="Cancel"
                        marginRight={10}
                        onClick={() => { currentCtx.handleCancel(); setCurrentCtx(null); }}
                    />
                    <StyledButton
                        text="OK"
                        onClick={() => { currentCtx.handleOK(currentProp); setCurrentCtx(null); }}
                    />
                </div>
            </div>
        </PopupPortal>
    );
}