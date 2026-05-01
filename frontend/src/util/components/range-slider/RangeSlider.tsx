import { useEffect, useState } from "react";
import { useDebounceInComponent } from "../../misc";

interface TpProps {
    minVal: number;
    maxVal: number;
    step: number;
    value: number;
    update: (newValue: number) => void;
    convertor?: (sliderValue: number) => number;
}

export function RangeSlider(props: TpProps) {
    const [stateValue, setStateValue] = useState(props.value);

    useEffect(() => {
        setStateValue(props.value);
    }, [props.value]);

    const debouncedUpdate = useDebounceInComponent(props.update, 150);

    return (
        <div style={{whiteSpace: 'nowrap', width:'100%'}}>
            <input
                style={{ width: 'calc(100% - 30px)', boxSizing:"border-box", display: "inline-block" }}
                type="range"
                min={props.minVal}
                max={props.maxVal}
                step={props.step}
                value={stateValue}
                onChange={(ev) => {
                    let newValue = parseFloat(ev.target.value);
                    if (props.convertor) newValue = props.convertor(newValue)
                    setStateValue(newValue);
                    debouncedUpdate(newValue);
                }}
            />
            <div style={{width:'30px', display: "inline-block", textAlign: "right", verticalAlign: 'top'}}>{stateValue}</div>
        </div>
    )
}
