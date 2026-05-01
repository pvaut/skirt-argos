import React from "react";
import styles from "./Loader.module.scss";


type TpLoaderProps = {
    message?: string;
    size?: number;
    paddingTop?: number
};


const Loader: React.FC<TpLoaderProps> = ({ message, size, paddingTop }) => {
    const loaderSize = size || 100;
    return (
        <>
            <div
                className={styles.loaderContainer}
                style={{ paddingTop: paddingTop || 0 }}
            >
                <div
                    className={styles.spinner}
                    style={{ width: loaderSize, height: loaderSize }}
                >
                </div>
            </div>
            {message && (
                <div style={{ paddingTop: "30px" }}>
                    {message}
                </div>
            )}
        </>
    );
};


export default Loader;
