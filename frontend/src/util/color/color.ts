export interface TpColor {
    r: number;
    g: number;
    b: number;
    a: number;
}


export function changeOpacity(color: TpColor, fraction: number): TpColor {
    return getColor(color.r, color.g, color.b, fraction);
}


export function desaturate(color: TpColor, fraction: number): TpColor {
    const av = (color.r + color.g + color.b) / 3;
    return getColor(
        av * fraction + color.r * (1 - fraction),
        av * fraction + color.g * (1 - fraction),
        av * fraction + color.b * (1 - fraction),
    );
}


export function saturate(color: TpColor, fraction: number): TpColor {
    const av = (color.r + color.g + color.b) / 3;
    const fr = 1-fraction;
    return getColor(
        Math.min(255, Math.max(0, av * fr + color.r * (1 - fr))),
        Math.min(255, Math.max(0, av * fr + color.g * (1 - fr))),
        Math.min(255, Math.max(0, av * fr + color.b * (1 - fr))),
    );
}


export function darken(color: TpColor, fraction: number): TpColor {
    return getColor(color.r * (1 - fraction), color.g * (1 - fraction), color.b * (1 - fraction));
}


export function lighten(color: TpColor, fraction: number): TpColor {
    return getColor(
        255 * fraction + color.r * (1 - fraction),
        255 * fraction + color.g * (1 - fraction),
        255 * fraction + color.b * (1 - fraction),
    );
}


export function color2String(color: TpColor,) {
    return `rgba(${color.r},${color.g},${color.b},${color.a})`;
}


export function getColor(r: number, g: number, b: number, a?: number): TpColor {
    return { r, g, b, a: a ?? 1 };
}


export function getColorHex(hex: string): TpColor {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 1
    } : getColor(0, 0, 0);
}


export function getHslColor(h: number, s: number, l: number) {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return getColor(255 * f(0), 255 * f(8), 255 * f(4));
}


export function interpolateColors(col1: TpColor, col2: TpColor, fr: number): TpColor {
    return getColor(
        col1.r * fr + col2.r * (1 - fr),
        col1.g * fr + col2.g * (1 - fr),
        col1.b * fr + col2.b * (1 - fr),
        col1.a * fr + col2.a * (1 - fr),
    );
}
