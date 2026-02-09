import { Component, input, ChangeDetectionStrategy, computed, inject } from "@angular/core";
import { type Editor } from "@tiptap/core";
import { AteButtonComponent } from "../../ui/ate-button.component";
import { AteSeparatorComponent } from "../../ui/ate-separator.component";
import { AteImageService } from "../../../services/ate-image.service";
import {
  AteImageBubbleMenuConfig,
  ATE_IMAGE_BUBBLE_MENU_KEYS,
} from "../../../models/ate-bubble-menu.model";
import { ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG } from "../../../config/ate-editor.config";
import { AteBaseBubbleMenu } from "../base/ate-base-bubble-menu";
import { AteImageUploadOptions } from "../../../models/ate-image.model";

@Component({
  selector: "ate-image-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AteButtonComponent, AteSeparatorComponent],
  template: `
    <div #menuRef class="bubble-menu" (mousedown)="$event.preventDefault()">
      @if (imageBubbleMenuConfig().changeImage && editor().isEditable) {
        <ate-button
          icon="drive_file_rename_outline"
          [title]="t().changeImage"
          (buttonClick)="onCommand('changeImage', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().downloadImage) {
        <ate-button
          icon="download"
          [title]="t().downloadImage"
          (buttonClick)="onCommand('downloadImage', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().separator && hasResizeButtons() && editor().isEditable) {
        <ate-separator />
      }
      @if (imageBubbleMenuConfig().resizeSmall && editor().isEditable) {
        <ate-button
          icon="crop_square"
          iconSize="small"
          [title]="t().resizeSmall"
          (buttonClick)="onCommand('resizeSmall', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().resizeMedium && editor().isEditable) {
        <ate-button
          icon="crop_square"
          iconSize="medium"
          [title]="t().resizeMedium"
          (buttonClick)="onCommand('resizeMedium', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().resizeLarge && editor().isEditable) {
        <ate-button
          icon="crop_square"
          iconSize="large"
          [title]="t().resizeLarge"
          (buttonClick)="onCommand('resizeLarge', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().resizeOriginal && editor().isEditable) {
        <ate-button
          icon="photo_size_select_actual"
          [title]="t().resizeOriginal"
          (buttonClick)="onCommand('resizeOriginal', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().separator && hasAlignmentButtons() && editor().isEditable) {
        <ate-separator />
      }
      @if (imageBubbleMenuConfig().alignLeft && editor().isEditable) {
        <ate-button
          icon="format_align_left"
          [title]="t().alignLeft"
          [active]="editor().isActive({ textAlign: 'left' })"
          (buttonClick)="onCommand('alignLeft', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().alignCenter && editor().isEditable) {
        <ate-button
          icon="format_align_center"
          [title]="t().alignCenter"
          [active]="editor().isActive({ textAlign: 'center' })"
          (buttonClick)="onCommand('alignCenter', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().alignRight && editor().isEditable) {
        <ate-button
          icon="format_align_right"
          [title]="t().alignRight"
          [active]="editor().isActive({ textAlign: 'right' })"
          (buttonClick)="onCommand('alignRight', $event)"></ate-button>
      }

      @if (
        imageBubbleMenuConfig().separator &&
        imageBubbleMenuConfig().deleteImage &&
        editor().isEditable
      ) {
        <ate-separator />
      }
      @if (imageBubbleMenuConfig().deleteImage && editor().isEditable) {
        <ate-button
          icon="delete"
          [title]="t().deleteImage"
          variant="danger"
          (buttonClick)="onCommand('deleteImage', $event)"></ate-button>
      }
    </div>
  `,
})
export class AteImageBubbleMenuComponent extends AteBaseBubbleMenu {
  readonly t = this.i18nService.imageUpload;
  private readonly imageService = inject(AteImageService);

  config = input<AteImageBubbleMenuConfig>(ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG);

  imageUpload = input<AteImageUploadOptions>({});

  imageBubbleMenuConfig = computed(() => {
    const c = this.config();
    const result: Record<string, boolean> = {};
    ATE_IMAGE_BUBBLE_MENU_KEYS.forEach(key => {
      result[key] = c[key] ?? true;
    });
    return result as Required<AteImageBubbleMenuConfig>;
  });

  hasAlignmentButtons = computed(
    () =>
      this.imageBubbleMenuConfig().alignLeft ||
      this.imageBubbleMenuConfig().alignCenter ||
      this.imageBubbleMenuConfig().alignRight
  );

  hasResizeButtons = computed(() => {
    const c = this.imageBubbleMenuConfig();
    return c.resizeSmall || c.resizeMedium || c.resizeLarge || c.resizeOriginal;
  });

  override shouldShow(): boolean {
    const { nodes, isEditable, isFocused, selection } = this.state();

    if (this.editorCommands.linkEditMode() || this.editorCommands.colorEditMode()) {
      return false;
    }

    // In read-only mode, focus reporting can be unreliable,
    // so we show the menu as long as an image is selected.
    if (!isEditable) {
      return nodes.isImage && selection.type === "node";
    }

    return nodes.isImage && isFocused;
  }

  override getSelectionRect(): DOMRect {
    const ed = this.editor();
    if (!ed) {
      return new DOMRect(0, 0, 0, 0);
    }

    const { from } = ed.state.selection;

    try {
      // 1. Direct ProseMirror approach: get DOM node at position
      const dom = ed.view.nodeDOM(from);
      if (dom instanceof HTMLElement) {
        // If it's a resizable container, look for the image inside
        if (dom.classList.contains("resizable-image-container")) {
          const img = dom.querySelector("img");
          if (img) {
            return img.getBoundingClientRect();
          }
        }
        return dom.getBoundingClientRect();
      }
    } catch (_e) {
      // Fallback if nodeDOM fails
    }

    // 2. Ultimate fallback: find selected image in DOM
    const selectedImg = ed.view.dom.querySelector(
      "img.selected, .resizable-image-container.selected img"
    );
    if (selectedImg) {
      return selectedImg.getBoundingClientRect();
    }

    // If nothing found at all
    return new DOMRect(-9999, -9999, 0, 0);
  }

  protected override executeCommand(editor: Editor, command: string, ..._args: unknown[]): void {
    switch (command) {
      case "changeImage":
        this.changeImage();
        break;
      case "downloadImage":
        this.editorCommands.downloadImage(editor);
        break;
      case "resizeSmall":
        this.imageService.resizeImageToSmall(editor);
        break;
      case "resizeMedium":
        this.imageService.resizeImageToMedium(editor);
        break;
      case "resizeLarge":
        this.imageService.resizeImageToLarge(editor);
        break;
      case "resizeOriginal":
        this.imageService.resizeImageToOriginal(editor);
        break;
      case "deleteImage":
        this.deleteImage();
        break;
      case "alignLeft":
        editor.chain().focus().setTextAlign("left").run();
        break;
      case "alignCenter":
        editor.chain().focus().setTextAlign("center").run();
        break;
      case "alignRight":
        editor.chain().focus().setTextAlign("right").run();
        break;
    }
  }

  private async changeImage() {
    const ed = this.editor();
    if (!ed) {
      return;
    }

    try {
      // Use dedicated method to replace an existing image
      await this.imageService.selectAndReplaceImage(ed, this.imageUpload());
    } catch (error) {
      console.error(this.i18nService.imageUpload().uploadError, error);
    }
  }

  private deleteImage() {
    const ed = this.editor();
    if (ed) {
      ed.chain().focus().deleteSelection().run();
    }
  }
}
