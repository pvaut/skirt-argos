import { useState } from "react";
import { useDebounceInComponent } from "../../misc";


interface TpProps {
    placeholder: string;
    value: string;
    update: (newValue: string) => void;
}


export function SearchField(props: TpProps) {
    const [stateValue, setStateValue] = useState(props.value);

    const debouncedUpdate = useDebounceInComponent(props.update, 200);

    return (
        <div style={{ whiteSpace: 'nowrap', width: '100%' }}>
            <input
                //type="search"
                style={{ width: '100%', boxSizing: "border-box", display: "inline-block" }}
                value={stateValue}
                onChange={(ev) => {
                    let newValue = ev.target.value;
                    setStateValue(newValue);
                    debouncedUpdate(newValue);
                }}
                placeholder={props.placeholder || "Search..."}
            />
        </div>
    )
}
