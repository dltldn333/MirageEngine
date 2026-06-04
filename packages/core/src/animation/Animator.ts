export function animateMeshByData(data: Map<string, any>) {
    
}

export function animateMeshByAttribute(target: HTMLElement, options: { duration: number; easing?: string }) {

}


export function parseStyle(styleString: string): Object {
    const styleObject: { [key: string]: string } = {};
    const stylePairs = styleString.split(";").map(pair => pair.trim()).filter(pair => pair);
    for (const pair of stylePairs) {
        const [key, value] = pair.split(":").map(part => part.trim());
        if (key && value) {
            styleObject[key] = value;
        }
    }
    return styleObject;
}

// Example usage:

// Output: { color: "red", "font-size": "16px", "background-color": "blue" }