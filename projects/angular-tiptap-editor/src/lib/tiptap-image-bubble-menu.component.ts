import {
  Component,
  input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  computed,
  inject,
  effect,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { ImageService } from "./services/image.service";
import { TiptapI18nService } from "./services/i18n.service";
import { EditorCommandsService } from "./services/editor-commands.service";
import { ImageBubbleMenuConfig } from "./models/bubble-menu.model";

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
        (click)="onCommand('changeImage', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().separator && hasResizeButtons()) {
      <tiptap-separator></tiptap-separator>
      } @if (imageBubbleMenuConfig().resizeSmall) {
      <tiptap-button
        icon="crop_square"
        iconSize="small"
        [title]="t().resizeSmall"
        (click)="onCommand('resizeSmall', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().resizeMedium) {
      <tiptap-button
        icon="crop_square"
        iconSize="medium"
        [title]="t().resizeMedium"
        (click)="onCommand('resizeMedium', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().resizeLarge) {
      <tiptap-button
        icon="crop_square"
        iconSize="large"
        [title]="t().resizeLarge"
        (click)="onCommand('resizeLarge', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().resizeOriginal) {
      <tiptap-button
        icon="photo_size_select_actual"
        [title]="t().resizeOriginal"
        (click)="onCommand('resizeOriginal', $event)"
      ></tiptap-button>
      } @if (imageBubbleMenuConfig().separator &&
      imageBubbleMenuConfig().deleteImage) {
      <tiptap-separator></tiptap-separator>
      } @if (imageBubbleMenuConfig().deleteImage) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteImage"
        variant="danger"
        (click)="onCommand('deleteImage', $event)"
      ></tiptap-button>
      }
    </div>
  `,
  styles: [],
})
export class TiptapImageBubbleMenuComponent implements OnInit, OnDestroy {
  readonly i18nService = inject(TiptapI18nService);
  readonly t = this.i18nService.imageUpload;

  editor = input.required<Editor>();
  config = input<ImageBubbleMenuConfig>({
    changeImage: true,
    resizeSmall: true,
    resizeMedium: true,
    resizeLarge: true,
    resizeOriginal: true,
    deleteImage: true,
    separator: true,
  });

  @ViewChild("menuRef", { static: false }) menuRef!: ElementRef<HTMLDivElement>;

  private tippyInstance: TippyInstance | null = null;
  private imageService = inject(ImageService);
  private editorCommands = inject(EditorCommandsService);
  private updateTimeout: any = null;

  // Alias pour le template
  readonly state = this.editorCommands.editorState;

  private isToolbarInteractingLocal = signal(false);

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

  constructor() {
    // Effet pour mettre à jour le menu quand l'état change
    effect(() => {
      this.state();
      this.updateMenu();
    });
  }

  ngOnInit() {
    this.initTippy();
  }

  ngOnDestroy() {
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }

  private initTippy() {
    // Attendre que l'élément soit disponible
    if (!this.menuRef?.nativeElement) {
      setTimeout(() => this.initTippy(), 50);
      return;
    }

    const menuElement = this.menuRef.nativeElement;

    // Créer l'instance Tippy
    this.tippyInstance = tippy(document.body, {
      content: menuElement,
      trigger: "manual",
      placement: "top-start",
      appendTo: (ref) => {
        const ed = this.editor();
        return ed ? ed.options.element : document.body;
      },
      interactive: true,
      arrow: false,
      offset: [0, 8],
      maxWidth: "none",
      hideOnClick: false,
      plugins: [sticky],
      sticky: false,
      onShow: (instance) => {
        // Optionnel : masquer les autres menus
      },
      getReferenceClientRect: () => this.getImageRect(),
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: this.editor().options.element,
              padding: 8,
            },
          },
          {
            name: "flip",
            options: {
              fallbackPlacements: ["bottom-start", "top-end", "bottom-end"],
            },
          },
        ],
      },
    });

    // Maintenant que Tippy est initialisé, faire un premier check
    this.updateMenu();
  }

  private getImageRect(): DOMRect {
    const ed = this.editor();
    if (!ed) return new DOMRect(0, 0, 0, 0);

    const { from } = ed.state.selection;

    try {
      // 1. Approche directe ProseMirror : obtenir le nœud DOM à la position
      const dom = ed.view.nodeDOM(from);
      if (dom instanceof HTMLElement) {
        // Si c'est le conteneur resizable, on cherche l'image à l'intérieur
        if (dom.classList.contains("resizable-image-container")) {
          const img = dom.querySelector("img");
          if (img) return img.getBoundingClientRect();
        }
        return dom.getBoundingClientRect();
      }
    } catch (e) {
      // Fallback au cas où nodeDOM échouerait
    }

    // 2. Fallback ultime : l'image sélectionnée dans le DOM
    const selectedImg = ed.view.dom.querySelector('img.selected, .resizable-image-container.selected img');
    if (selectedImg) {
      return selectedImg.getBoundingClientRect();
    }

    // Si on ne trouve rien du tout
    return new DOMRect(-9999, -9999, 0, 0);
  }

  updateMenu = () => {
    // Debounce pour éviter les appels trop fréquents
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      const { nodes, isEditable, isFocused } = this.state();

      if (this.isToolbarInteractingLocal()) {
        this.hideTippy();
        return;
      }

      // Ne montrer le menu image que si :
      // - Une image est sélectionnée
      // - L'éditeur est éditable et a le focus
      const shouldShow = nodes.isImage && isEditable && isFocused;

      if (shouldShow) {
        this.showTippy();
      } else {
        this.hideTippy();
      }
    }, 10);
  };

  handleBlur = () => {
    // Masquer le menu quand l'éditeur perd le focus
    setTimeout(() => {
      this.hideTippy();
    }, 100);
  };

  private showTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.setProps({ sticky: "reference" });
      this.tippyInstance.show();
    }
  }

  hideTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.setProps({ sticky: false });
      this.tippyInstance.hide();
    }
  }

  onCommand(command: string, event: MouseEvent) {
    event.preventDefault();
    const ed = this.editor();
    if (!ed) return;

    switch (command) {
      case "changeImage":
        this.changeImage();
        break;
      case "resizeSmall":
        this.imageService.resizeImageToSmall(ed);
        break;
      case "resizeMedium":
        this.imageService.resizeImageToMedium(ed);
        break;
      case "resizeLarge":
        this.imageService.resizeImageToLarge(ed);
        break;
      case "resizeOriginal":
        this.imageService.resizeImageToOriginal(ed);
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

  setToolbarInteracting(isInteracting: boolean) {
    this.isToolbarInteractingLocal.set(isInteracting);
    this.updateMenu();
  }
}
