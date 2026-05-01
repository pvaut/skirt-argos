import React from "react";
import styles from './ErrorBoundary.module.scss';
import { ERROR_CAUSES } from "../errors";


export class ErrorBoundary extends React.Component {
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
            <div className={styles.errorBox}>
                <div>{errorMessage}</div>
                <div>
                    <button
                        onClick={() => {
                            this.setState({ errorMessage: null })
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );

        setTimeout(() => {
            (this.state as any).error = null;
        }, 100);

        return (this.props as any).children;
    }
}