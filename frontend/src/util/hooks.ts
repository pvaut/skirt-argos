import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { TpRootState } from "../data/store/store";
import { useEffect, useRef } from "react";


// Use throughout your app instead of plain `useDispatch` and `useSelector`
// export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<TpRootState> = useSelector;


// returns the previous content of a variable
export const usePrevious = (value: any) => {
    const ref = useRef<any>(null);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
};
