import { Provider } from "@angular/core";
import { AteEditorCommandsService } from "../services/ate-editor-commands.service";
import { AteImageService } from "../services/ate-image.service";
import { AteColorPickerService } from "../services/ate-color-picker.service";
import { AteLinkService } from "../services/ate-link.service";
import { AteExportService } from "../services/ate-export.service";

/**
 * Providers required by `AteEditorCoreComponent` and the ATE UI components
 * (toolbar, bubble menus, slash commands, ...) to share editor state.
 *
 * `AngularTiptapEditorComponent` declares these itself. Consumers composing
 * their own editor layout from the individually-exported pieces must declare
 * `providers: ATE_EDITOR_PROVIDERS` on their own top-level component so every
 * descendant resolves the same service instances.
 */
export const ATE_EDITOR_PROVIDERS: Provider[] = [
  AteEditorCommandsService,
  AteImageService,
  AteColorPickerService,
  AteLinkService,
  AteExportService,
];
