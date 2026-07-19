export interface StyleData {
    // 1. Transform
    x?: number;
    y?: number;
    z?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    rotateX?: number;
    rotateY?: number;
    rotateZ?: number;

    // for future use
    matrix?: Float32Array; 

    // 2. Material / Appearance
    opacity?: number;
    backgroundColor?: [number, number, number]; 
    backgroundImage?: string;
    boxShadow?: string;
    borderRadius?: number | [number, number, number, number]; 

    // 3. Layout / Depth
    width?: number;
    height?: number;
    zIndex?: number;
}