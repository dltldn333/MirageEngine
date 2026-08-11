use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct MemoryManager {
    buffer: Vec<f32>,
}

#[wasm_bindgen]
impl MemoryManager {
    #[wasm_bindgen(constructor)]
    pub fn new(capacity: usize) -> MemoryManager {
        let mut buffer = Vec::with_capacity(capacity);
        buffer.resize(capacity, 0.0);
        MemoryManager { buffer }
    }
    
    pub fn get_pointer(&self) -> *const f32 {
        self.buffer.as_ptr()
    }
    
    pub fn get_length(&self) -> usize {
        self.buffer.len()
    }
}
