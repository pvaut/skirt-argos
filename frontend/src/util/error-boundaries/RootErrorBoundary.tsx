import React from "react";
import styles from './ErrorBoundary.module.scss';
import { ERROR_CAUSES } from "../errors";
import { locDb } from "../../data/local-database/localDatabase";


export class RootErrorBoundary extends React.Component {
    constructor(props: any) {
        super(props);
        this.state = { errorMessage: null };
    }

    static getDerivedStateFromError(error: Error): any {
        if ((error.cause == ERROR_CAUSES.CONFIG) || (error.cause == ERROR_CAUSES.USER))
            return { errorMessage: String(error) };
        else
            return { errorMessage: "An unexpected error occurred" };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void { }

    render() {
        const { errorMessage } = this.state as { errorMessage: string, children: any };

        if (errorMessage) return (
            <div className={styles.rootErrorBox}>
                <p>{errorMessage}</p>
                <p>
                    <button
                        onClick={() => {
                            location.reload();
                        }}
                    >
                        Reload
                    </button>
                </p>
                <p>If this problem persists after reloading, you can try resetting all local data</p>
                <p>
                    <button
                        onClick={async () => {
                            await locDb.removeAll();
                            location.reload();
                        }}
                    >
                        Reset data & reload
                    </button>
                </p>
            </div>
        );

        setTimeout(() => {
            (this.state as any).error = null;
        }, 100);

        return (this.props as any).children;
    }
}