import {
  Component,
  input,
  ChangeDetectionStrategy,
  computed,
  inject,
} from "@angular/core";
import { type Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { ImageService } from "./services/image.service";
import { ImageBubbleMenuConfig } from "./models/bubble-menu.model";
import { TiptapBaseBubbleMenu } from "./base/tiptap-base-bubble-menu";

@Component({
  selector: "tiptap-image-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TiptapButtonComponent, TiptapSeparatorComponent],
  template: `
    <div #menuRef class="bubble-menu">
      @if (imageBubbleMenuConfig().changeImage) {
      <tiptap-button
        icon="drive_file_rename_outline"
        [title]="t().changeImage"
        (onClick)="onCommand('changeImage', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().separator && hasResizeButtons()) {
      <tiptap-separator />
      } @if (imageBubbleMenuConfig().resizeSmall) {
      <tiptap-button
        icon="crop_square"
        iconSize="small"
        [title]="t().resizeSmall"
        (onClick)="onCommand('resizeSmall', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().resizeMedium) {
      <tiptap-button
        icon="crop_square"
        iconSize="medium"
        [title]="t().resizeMedium"
        (onClick)="onCommand('resizeMedium', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().resizeLarge) {
      <tiptap-button
        icon="crop_square"
        iconSize="large"
        [title]="t().resizeLarge"
        (onClick)="onCommand('resizeLarge', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().resizeOriginal) {
      <tiptap-button
        icon="photo_size_select_actual"
        [title]="t().resizeOriginal"
        (onClick)="onCommand('resizeOriginal', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().separator &&
      imageBubbleMenuConfig().deleteImage) {
      <tiptap-separator />
      } @if (imageBubbleMenuConfig().deleteImage) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteImage"
        variant="danger"
        (onClick)="onCommand('deleteImage', $event)"
      ></tiptap-button>
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
    return (
      c.resizeSmall ||
      c.resizeMedium ||
      c.resizeLarge ||
      c.resizeOriginal
    );
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
    } catch (e) {
      // Fallback if nodeDOM fails
    }

    // 2. Ultimate fallback: find selected image in DOM
    const selectedImg = ed.view.dom.querySelector('img.selected, .resizable-image-container.selected img');
    if (selectedImg) {
      return selectedImg.getBoundingClientRect();
    }

    // If nothing found at all
    return new DOMRect(-9999, -9999, 0, 0);
  }

  protected override executeCommand(editor: Editor, command: string): void {
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
      // Utiliser la méthode spécifique pour remplacer une image existante
      await this.imageService.selectAndReplaceImage(ed, {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        accept: "image/*",
      });
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
