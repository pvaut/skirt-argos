import { createInternalError } from "../../errors";
import { TpFormExecutionContext, TpFormField } from "./Form";


export enum FORM_FIELD_TYPES {
    CHOICE = 'choice',
    NUMBER = 'number',
    STRING = 'string',
}


export type TpFieldUpdater = (fieldId: string, newContent: any) => void;


function createField_Choice(ctx: TpFormExecutionContext, field: TpFormField, updater: TpFieldUpdater) {
    return (
        <select
            value={ctx.data[field.id]}
            onChange={(ev) => { updater(field.id, ev.target.value) }}
        >
            {field.specifics.choices!.map((choice: any) => (
                <option key={choice.id} value={choice.id}>
                    {choice.value}
                </option>
            ))}
        </select>
    );
}


function createField_String(ctx: TpFormExecutionContext, field: TpFormField, updater: TpFieldUpdater) {
    if ((field.specifics!.lineCount || 1) > 1) {
        return (
            <textarea
                rows={field.specifics!.lineCount!}
                value={ctx.data[field.id]}
                onChange={(ev) => { updater(field.id, ev.target.value) }}
            />
        );
    } else {
        return (
            <input
                value={ctx.data[field.id]}
                onChange={(ev) => { updater(field.id, ev.target.value) }}
            />
        );
    }
}


function createField_Number(ctx: TpFormExecutionContext, field: TpFormField, updater: TpFieldUpdater) {
    return (
        <input
            value={ctx.data[field.id]}
            onChange={(ev) => { updater(field.id, ev.target.value) }}
        />
    );
}


export function createFormFieldRenderer(ctx: TpFormExecutionContext, field: TpFormField, updater: TpFieldUpdater) {

    if (field.fieldType == FORM_FIELD_TYPES.CHOICE)
        return createField_Choice(ctx, field, updater);

    if (field.fieldType == FORM_FIELD_TYPES.STRING)
        return createField_String(ctx, field, updater);

    if (field.fieldType == FORM_FIELD_TYPES.NUMBER)
        return createField_Number(ctx, field, updater);

    throw createInternalError(`Invalid form field type: ${field.fieldType}`);
}


export function createFormString(id: string, name: string, defaultValue: string, lineCount: number): TpFormField {
    return {
        id,
        name,
        fieldType: FORM_FIELD_TYPES.STRING,
        defaultValue,
        specifics: {
            lineCount,
        },
    }
}


export function createFormNumber(id: string, name: string, defaultValue: number): TpFormField {
    return {
        id,
        name,
        fieldType: FORM_FIELD_TYPES.NUMBER,
        defaultValue,
        specifics: {},
    }
}


export function createFormChoice(id: string, name: string, choices: { id: string, value: string }[]): TpFormField {
    return {
        id,
        name,
        fieldType: FORM_FIELD_TYPES.CHOICE,
        defaultValue: choices[0].id,
        specifics: {
            choices,
        },
    }
}