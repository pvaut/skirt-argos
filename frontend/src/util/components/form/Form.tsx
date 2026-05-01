import { StyledButton } from "../buttons/styled-button/StyledButton";

import styles from './Form.module.scss';
import { postAMessage, useMessageListener } from "../../messageBus";
import { useState } from "react";
import { PopupPortal } from "../popup-portal/PopupPortal";
import { createFormFieldRenderer, FORM_FIELD_TYPES, TpFieldUpdater } from "./formFieldTypes";


const MESSAGE_EXECUTE_FORM = "_msgExecuteForm";


export interface TpFormField {
    id: string;
    name: string;
    fieldType: FORM_FIELD_TYPES;
    defaultValue: any;
    required?: boolean;
    specifics: {
        choices?: { id: string, value: string }[];
        lineCount?: number;
    }
    validator?: (ctx: TpFormExecutionContext, value: any) => void;// should throw an error in case of a validation error
}


export interface TpFormButton {
    id: string;
    name: string;
}


export interface TpForm {
    name: string;
    fields: TpFormField[];
    buttons: TpFormButton[];
    customFormElement?: any; // any element can go here and will be rendered at the bottom of the form
}


export interface TpFormExecutionContext {
    theForm: TpForm;
    data: { [fieldId: string]: any };
    errors: string[];
    onOK?: any;
    onCancel?: any;
}


export function executeForm(theForm: TpForm) {
    const data: { [fieldId: string]: any } = {};
    for (const field of theForm.fields) data[field.id] = field.defaultValue;
    return new Promise((resolve, reject) => {
        postAMessage(MESSAGE_EXECUTE_FORM, {
            theForm,
            data,
            errors: [],
            onOK: (data: any, buttonId: string | null) => { resolve({ data, buttonId }); },
            onCancel: reject,
        });
    });
}



export function FormModal() {
    const [currentCtx, setCurrentCtx] = useState<TpFormExecutionContext | null>(null);

    function updateSingleField(fieldId: string, newContent: any) {
        setCurrentCtx({
            ...currentCtx!,
            data: { ...currentCtx!.data, [fieldId]: newContent }
        });
    }

    useMessageListener(MESSAGE_EXECUTE_FORM, (type: string, messageBody: any) => { setCurrentCtx(messageBody as TpFormExecutionContext); });

    if (!currentCtx) return null;
    const theForm = currentCtx.theForm;

    const renderedFields = theForm.fields.map(field => {
        return (
            <div key={field.id} className={styles.itemWrapper}>
                <div className={styles.itemLabel}>
                    {field.name}
                </div>
                <div className={styles.itemContent}>
                    {createFormFieldRenderer(currentCtx, field, updateSingleField)}
                </div>
            </div>
        );
    })

    function performTryComplete(buttonId?: string) {
        const errors: string[] = [];

        const dataProcessed: any = {};
        for (const field of theForm.fields) {
            dataProcessed[field.id] = currentCtx!.data[field.id];
            if (field.fieldType == FORM_FIELD_TYPES.NUMBER) {
                const valueString = currentCtx!.data[field.id];
                if (valueString.length == 0) dataProcessed[field.id] = Number.NaN;
                else {
                    const valueNumber = Number(valueString);
                    if (isNaN(valueNumber)) errors.push(`Invalid number: ${valueString}`);
                    dataProcessed[field.id] = valueNumber;
                }
                if (field.required && isNaN(dataProcessed[field.id]))
                    errors.push(`${field.name} should not be empty`);
            }
            if ((field.fieldType == FORM_FIELD_TYPES.STRING) && field.required && (!dataProcessed[field.id]))
                errors.push(`${field.name} should not be empty`);
            if (field.validator) {
                try {
                    field.validator!(currentCtx!, dataProcessed[field.id])
                } catch (e) {
                    errors.push(String(e));
                }
            }
        }
        if (errors.length == 0) {
            currentCtx!.onOK(dataProcessed, buttonId || null);
            setCurrentCtx(null);
        } else {
            setCurrentCtx({ ...currentCtx!, errors })
        }
    }

    return (
        <PopupPortal
            close={() => {
                currentCtx.onCancel();
                setCurrentCtx(null);
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.title}>{theForm.name}</div>
                <div>{renderedFields}</div>
                <div>{
                    currentCtx!.errors.map((error, idx) => (
                        <div className={styles.error} key={`idx_${idx}`}>{error}</div>
                    ))
                }</div>
                {(theForm.fields.length > 0) && <div style={{ height: '20px' }} />}
                {theForm.customFormElement && <div style={{ marginBottom: '15px' }}>{theForm.customFormElement}</div>}
                {(theForm.buttons.length == 0) && (
                    <StyledButton
                        text="OK"
                        onClick={performTryComplete}
                    />
                )}
                {theForm.buttons.map(button => (
                    <div key={button.id} style={{ display: "inline-block", paddingRight: '10px', paddingTop: '10px' }}>
                        <StyledButton
                            text={button.name}
                            onClick={() => { performTryComplete(button.id); }}
                        />
                    </div>
                ))}
            </div>
        </PopupPortal>
    );
}