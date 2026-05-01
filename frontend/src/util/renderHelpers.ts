import { getRangeSize, isNonEmptyRange, TpRange } from "./geometry/viewport2D";


function smartNumber2String(value: number, numberOfDecimalDigits: number): string {
    if (Math.abs(value) < Number.MIN_VALUE) return "0";
    const log10Scale = Math.floor(Math.log10(Math.abs(value)));
    if (-log10Scale > numberOfDecimalDigits + 3) return "0"; // contingency for "exactly zero"
    let label = value.toFixed(numberOfDecimalDigits);
    if (log10Scale > 4)
        label = value.toExponential();
    if (log10Scale < -4) {
        label = value.toExponential(Math.max(1, numberOfDecimalDigits + log10Scale));
    }
    return label;
}


export interface TpTickMark {
    value: number;
    label: string | null; // null means a minor tick major ticks have labels
}


interface TpTickStrategy {
    minorDistance: number; // distance between two minor ticks, applicable to any ordet of magnitude
    majorFactor: number; // multiplication factor for the major tick distance
}

const possibleStrategies: TpTickStrategy[] = [
    {
        minorDistance: 1,
        majorFactor: 5,
    },
    {
        minorDistance: 2,
        majorFactor: 5,
    },
    {
        minorDistance: 5,
        majorFactor: 4,
    },
];


export function getRangeTicks(range: TpRange, preferredMajorTickCount: number): TpTickMark[] {
    if (!isNonEmptyRange(range)) return [];
    const preferredMajorTickDistance = getRangeSize(range) / preferredMajorTickCount;
    const estimLog10Scale = Math.round(Math.log10(preferredMajorTickDistance));
    let smallestFriction = Number.MAX_VALUE;
    let optimalStrategy = null;
    let optimalLog10Scale = 0;
    for (const strategy of possibleStrategies) {
        for (let log10Scale = estimLog10Scale - 1; log10Scale <= estimLog10Scale + 1; log10Scale++) {
            const majorDist = strategy.minorDistance * strategy.majorFactor * 10 ** log10Scale;
            let friction: number;
            if (majorDist > preferredMajorTickDistance)
                friction = majorDist / preferredMajorTickDistance;
            else
                friction = preferredMajorTickDistance / majorDist;
            if (friction < smallestFriction) {
                optimalStrategy = strategy;
                optimalLog10Scale = log10Scale;
                smallestFriction = friction;
            }
        }
    }
    if (!optimalStrategy) //could not find anything that works...
        return [];
    const minorTickDist = optimalStrategy.minorDistance * 10 ** optimalLog10Scale
    const majorTickFactor = optimalStrategy.majorFactor;
    let numberOfDecimalDigits = -optimalLog10Scale;
    if (optimalStrategy.minorDistance * optimalStrategy.majorFactor >= 9.9999999)
        numberOfDecimalDigits--;
    numberOfDecimalDigits = Math.max(numberOfDecimalDigits, 0);
    const tickMarks: TpTickMark[] = [];
    for (let valueIndex = Math.floor(range.min / minorTickDist); valueIndex <= range.max / minorTickDist; valueIndex++) {
        let value = valueIndex * minorTickDist;
        value = Number(value.toPrecision(11)); // we do this to avoid precision errors for very large numbers;
        let label = null;
        if (Math.round(value / minorTickDist) % majorTickFactor == 0) {
            label = smartNumber2String(value, numberOfDecimalDigits);
        }
        if ((value >= range.min) && (value <= range.max)) {
            tickMarks.push({
                value,
                label,
            });
        }
    }
    return tickMarks;
}


export function getMaxRoundedRange(range: number): number {
    const estimLog10Scale = Math.round(Math.log10(range));
    let optimalRoundedRange = 0;
    for (const strategy of possibleStrategies) {
        for (let log10Scale = estimLog10Scale - 2; log10Scale <= estimLog10Scale + 2; log10Scale++) {
            const tryRoundedRange = strategy.minorDistance * 10 ** log10Scale;
            if (tryRoundedRange < range) {
                if (tryRoundedRange > optimalRoundedRange)
                    optimalRoundedRange = tryRoundedRange
            }
        }
    }
    return optimalRoundedRange;
}