export class FontMetricsManager {
  private static cache: Map<string, number> = new Map();

  /**
   * Calculates or retrieves the exact alphabetic baseline (in pixels) for the given font.
   * @param font CSS font shorthand string (e.g., "400 16px Inter")
   * @returns Baseline Y offset in pixels
   */
  static getBaseline(font: string): number {
    if (this.cache.has(font)) {
      return this.cache.get(font)!;
    }

    const baseline = this.calculateBaselineFromDOM(font);
    this.cache.set(font, baseline);
    return baseline;
  }

  private static calculateBaselineFromDOM(font: string): number {
    // Return 0 when running in a non‑DOM environment (e.g., server‑side rendering)
    if (typeof document === "undefined") return 0;

    const container = document.createElement("div");
    const span = document.createElement("span");
    const img = document.createElement("img"); // 1×1 transparent pixel

    // Hide the helper elements and apply the target font
    container.style.visibility = "hidden";
    container.style.position = "absolute";
    container.style.top = "0px";
    container.style.left = "0px";
    container.style.font = font;

    // Reset padding/margin/border to isolate pure font metrics
    container.style.margin = "0";
    container.style.padding = "0";
    container.style.border = "none";
    span.style.margin = "0";
    span.style.padding = "0";
    span.style.border = "none";
    span.style.lineHeight = "normal"; // Prevent line‑height interference

    // Align the 1×1 image to the baseline of the span
    img.width = 1;
    img.height = 1;
    img.style.verticalAlign = "baseline";

    // Assemble the DOM structure
    span.appendChild(document.createTextNode("Hidden Text"));
    container.appendChild(span);
    container.appendChild(img);

    document.body.appendChild(container);

    // Measure the distance from the top of the span to the top of the baseline‑aligned image
    const baseline = img.offsetTop - span.offsetTop;

    document.body.removeChild(container);

    return baseline;
  }
}
