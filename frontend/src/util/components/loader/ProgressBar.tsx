

import React from "react";


type TpProgressBar = {
    percentage: number | undefined;
};


const ProgressBar: React.FC<TpProgressBar> = ({ percentage }) => {
    if (percentage == undefined) return null;
    return (
        <div>
            <div style={{
                width: `${percentage}%`,
                height: '5px',
                backgroundColor: 'var(--color-sp1)',
                }}/>
        </div>
    );
};


export default ProgressBar;
