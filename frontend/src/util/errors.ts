import { showError } from "./components/simple-modals/MessagePopup";


export enum ERROR_CAUSES {
    USER="ERRORCAUSES_USER",
    CONFIG="ERRORCAUSES_CONFIG",
    INTERNAL="ERRORCAUSES_INTERNAL",
    EXEXUTION_STOP="EXEXUTION_STOP",
}


class UserError extends Error {
    constructor(message: string) {
        super(message);
        this.cause = ERROR_CAUSES.USER;
        // Set the prototype explicitly to maintain the correct prototype chain
        Object.setPrototypeOf(this, UserError.prototype);
    }
}


export function createUserError(message: string) {
    // debugger;
    return new UserError(message);
}


class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.cause = ERROR_CAUSES.CONFIG;
        // Set the prototype explicitly to maintain the correct prototype chain
        Object.setPrototypeOf(this, ConfigError.prototype);
    }
}


export function createConfigError(message: string) {
    debugger;
    return new ConfigError(message);
}


class InternalError extends Error {
    constructor(message: string) {
        super(message);
        this.cause = ERROR_CAUSES.INTERNAL;
        // Set the prototype explicitly to maintain the correct prototype chain
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}


class ExecutionStopError extends Error {
    constructor() {
        super("");
        this.cause = ERROR_CAUSES.EXEXUTION_STOP;
        // Set the prototype explicitly to maintain the correct prototype chain
        Object.setPrototypeOf(this, ExecutionStopError.prototype);
    }
}


export function createInternalError(message: string) {
    debugger;
    return new InternalError(message);
}


export function createExecutionStopError() {
    return new ExecutionStopError();
}


export function reportException(ex: any) {
    console.log(`ERROR: ${ex}`);
    if ((ex.cause == ERROR_CAUSES.CONFIG) || (ex.cause == ERROR_CAUSES.USER)) {
        showError(ex.message);
    } else showError("An unexpected error occurred");
}


export function logException(ex: any) {
    console.log(`Exception occurred`);
    console.log(ex);
}