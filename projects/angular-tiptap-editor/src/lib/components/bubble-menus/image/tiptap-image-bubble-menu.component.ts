import { Component, input, ChangeDetectionStrategy, computed, inject } from "@angular/core";
import { type Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "../../ui/tiptap-button.component";
import { TiptapSeparatorComponent } from "../../ui/tiptap-separator.component";
import { ImageService } from "../../../services/image.service";
import { ImageBubbleMenuConfig } from "../../../models/bubble-menu.model";
import { TiptapBaseBubbleMenu } from "../base/tiptap-base-bubble-menu";
import { ImageUploadOptions } from "../../../models/image.model";

@Component({
  selector: "ate-image-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TiptapButtonComponent, TiptapSeparatorComponent],
  template: `
    <div #menuRef class="bubble-menu" (mousedown)="$event.preventDefault()">
      @if (imageBubbleMenuConfig().changeImage) {
        <ate-button
          icon="drive_file_rename_outline"
          [title]="t().changeImage"
          (buttonClick)="onCommand('changeImage', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().separator && hasResizeButtons()) {
        <ate-separator />
      }
      @if (imageBubbleMenuConfig().resizeSmall) {
        <ate-button
          icon="crop_square"
          iconSize="small"
          [title]="t().resizeSmall"
          (buttonClick)="onCommand('resizeSmall', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().resizeMedium) {
        <ate-button
          icon="crop_square"
          iconSize="medium"
          [title]="t().resizeMedium"
          (buttonClick)="onCommand('resizeMedium', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().resizeLarge) {
        <ate-button
          icon="crop_square"
          iconSize="large"
          [title]="t().resizeLarge"
          (buttonClick)="onCommand('resizeLarge', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().resizeOriginal) {
        <ate-button
          icon="photo_size_select_actual"
          [title]="t().resizeOriginal"
          (buttonClick)="onCommand('resizeOriginal', $event)"></ate-button>
      }
      @if (imageBubbleMenuConfig().separator && imageBubbleMenuConfig().deleteImage) {
        <ate-separator />
      }
      @if (imageBubbleMenuConfig().deleteImage) {
        <ate-button
          icon="delete"
          [title]="t().deleteImage"
          variant="danger"
          (buttonClick)="onCommand('deleteImage', $event)"></ate-button>
      }
    </div>
  `,
})
export class TiptapImageBubbleMenuComponent extends TiptapBaseBubbleMenu {
  readonly t = this.i18nService.imageUpload;
  private readonly imageService = inject(ImageService);

  config = input<ImageBubbleMenuConfig>({
    changeImage: true,
    resizeSmall: true,
    resizeMedium: true,
    resizeLarge: true,
    resizeOriginal: true,
    deleteImage: true,
    separator: true,
  });

  imageUpload = input<ImageUploadOptions>({});

  imageBubbleMenuConfig = computed(() => ({
    changeImage: this.config().changeImage ?? true,
    resizeSmall: this.config().resizeSmall ?? true,
    resizeMedium: this.config().resizeMedium ?? true,
    resizeLarge: this.config().resizeLarge ?? true,
    resizeOriginal: this.config().resizeOriginal ?? true,
    deleteImage: this.config().deleteImage ?? true,
    separator: this.config().separator ?? true,
  }));

  hasResizeButtons = computed(() => {
    const c = this.imageBubbleMenuConfig();
    return c.resizeSmall || c.resizeMedium || c.resizeLarge || c.resizeOriginal;
  });

  override shouldShow(): boolean {
    const { nodes, isEditable, isFocused } = this.state();

    if (this.editorCommands.linkEditMode() || this.editorCommands.colorEditMode()) {
      return false;
    }

    return nodes.isImage && isEditable && isFocused;
  }

  override getSelectionRect(): DOMRect {
    const ed = this.editor();
    if (!ed) return new DOMRect(0, 0, 0, 0);

    const { from } = ed.state.selection;

    try {
      // 1. Direct ProseMirror approach: get DOM node at position
      const dom = ed.view.nodeDOM(from);
      if (dom instanceof HTMLElement) {
        // If it's a resizable container, look for the image inside
        if (dom.classList.contains("resizable-image-container")) {
          const img = dom.querySelector("img");
          if (img) return img.getBoundingClientRect();
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
    }
  }

  private async changeImage() {
    const ed = this.editor();
    if (!ed) return;

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
