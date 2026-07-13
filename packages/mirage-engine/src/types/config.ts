import type { CoreConfig } from '@mirage-engine/core';
// import type { TravelerConfig } from '@mirage-engine/traveler';


export interface SandwichConfig {
  frontSelector?: string;
}

export type MirageConfig = CoreConfig & {
  sandwich?: boolean | SandwichConfig;
};