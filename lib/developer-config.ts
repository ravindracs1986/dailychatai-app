/**
 * Re-exports from unified config for backwards compatibility
 * Use config/index.ts directly for new code
 */

import { CONFIG } from "@/config" // Declare the CONFIG variable

export {
  CONFIG,
  getEnabledApiKeys,
  getEnabledCustomModels,
  hasConfiguredApiKeys,
  getDefaultApiKey,
  getRandomApiKey,
  type ConfiguredModel,
} from "@/config"

// Alias for backwards compatibility
export const DEVELOPER_CONFIG = CONFIG
