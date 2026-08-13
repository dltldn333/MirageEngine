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

    pub fn update_physics(&mut self, node_count: usize) {
        let stride = 5; // [parent, localX, localY, worldX, worldY]
        
        for i in 0..node_count {
            let offset = i * stride;
            
            let local_x = self.buffer[offset + 1];
            let local_y = self.buffer[offset + 2];
            
            let parent_idx_f32 = self.buffer[offset + 0];
            
            if parent_idx_f32 >= 0.0 {
                let parent_idx = parent_idx_f32 as usize;
                let parent_offset = parent_idx * stride;
                
                let parent_world_x = self.buffer[parent_offset + 3];
                let parent_world_y = self.buffer[parent_offset + 4];
                
                self.buffer[offset + 3] = parent_world_x + local_x;
                self.buffer[offset + 4] = parent_world_y + local_y;
            } else {
                self.buffer[offset + 3] = local_x;
                self.buffer[offset + 4] = local_y;
            }
        }
    }
}
