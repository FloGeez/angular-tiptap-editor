import { InjectionToken } from "@angular/core";
import { AteEditorConfig } from "../models/ate-editor-config.model";

/**
 * Injection Token for global editor configuration.
 */
export const ATE_GLOBAL_CONFIG = new InjectionToken<AteEditorConfig>("ATE_GLOBAL_CONFIG");
