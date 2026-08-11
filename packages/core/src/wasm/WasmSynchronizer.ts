import init, { MemoryManager } from "../../../wasm-compute/pkg/wasm_compute.js";

export class WasmSynchronizer {
  private memoryManager: MemoryManager | null = null;
  public sharedArray: Float32Array | null = null;
  private isInitialized = false;

  /**
   * Initialize Wasm instance and allocate a 1D Float32Array shared memory
   * @param capacity The number of Float32 elements to allocate
   */
  async initialize(capacity: number) {
    if (this.isInitialized) return;

    try {
      const wasm = await init();

      this.memoryManager = new MemoryManager(capacity);

      const pointer = this.memoryManager.get_pointer();
      const length = this.memoryManager.get_length();
      this.sharedArray = new Float32Array(wasm.memory.buffer, pointer, length);

      this.isInitialized = true;
      console.log(`[WasmSynchronizer] Initialized with capacity: ${capacity} floats (${capacity * 4} bytes)`);
    } catch (error) {
      console.error("[WasmSynchronizer] Failed to initialize Wasm:", error);
      throw error;
    }
  }

  getSharedArray(): Float32Array {
    if (!this.isInitialized || !this.sharedArray) {
      throw new Error("WasmSynchronizer is not initialized yet. Call initialize() first.");
    }
    return this.sharedArray;
  }
}
