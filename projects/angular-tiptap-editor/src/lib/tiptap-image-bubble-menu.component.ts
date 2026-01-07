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
} from "@angular/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import type { Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { ImageService } from "./services/image.service";
import { TiptapI18nService } from "./services/i18n.service";
import { ImageBubbleMenuConfig } from "./models/bubble-menu.model";

@Component({
  selector: "tiptap-image-bubble-menu",
  standalone: true,
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
  private updateTimeout: any = null;

  imageBubbleMenuConfig = computed(() => ({
    changeImage: true,
    resizeSmall: true,
    resizeMedium: true,
    resizeLarge: true,
    resizeOriginal: true,
    deleteImage: true,
    separator: true,
    ...this.config(),
  }));

  hasResizeButtons = computed(() => {
    const config = this.imageBubbleMenuConfig();
    return (
      config.resizeSmall ||
      config.resizeMedium ||
      config.resizeLarge ||
      config.resizeOriginal
    );
  });

  constructor() {
    effect(() => {
      const ed = this.editor();
      if (!ed) return;

      // Nettoyer les anciens listeners
      ed.off("selectionUpdate", this.updateMenu);
      ed.off("transaction", this.updateMenu);
      ed.off("focus", this.updateMenu);
      ed.off("blur", this.handleBlur);

      // Ajouter les nouveaux listeners
      ed.on("selectionUpdate", this.updateMenu);
      ed.on("transaction", this.updateMenu);
      ed.on("focus", this.updateMenu);
      ed.on("blur", this.handleBlur);

      // Ne pas appeler updateMenu() ici pour éviter l'affichage prématuré
      // Il sera appelé automatiquement quand l'éditeur sera prêt
    });
  }

  ngOnInit() {
    // Initialiser Tippy de manière synchrone après que le component soit ready
    this.initTippy();
  }

  ngOnDestroy() {
    const ed = this.editor();
    if (ed) {
      ed.off("selectionUpdate", this.updateMenu);
      ed.off("transaction", this.updateMenu);
      ed.off("focus", this.updateMenu);
      ed.off("blur", this.handleBlur);
    }

    // Nettoyer les timeouts
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Nettoyer Tippy
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
      this.tippyInstance = null;
    }
  }

  private initTippy() {
    // Attendre que l'élément soit disponible
    if (!this.menuRef?.nativeElement) {
      setTimeout(() => this.initTippy(), 50);
      return;
    }

    const menuElement = this.menuRef.nativeElement;

    // S'assurer qu'il n'y a pas déjà une instance
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }

    // Créer l'instance Tippy
    this.tippyInstance = tippy(document.body, {
      content: menuElement,
      trigger: "manual",
      placement: "top-start",
      appendTo: (ref) => {
        const host = this.editor().options.element.closest("angular-tiptap-editor");
        return host || document.body;
      },
      interactive: true,
      arrow: false,
      offset: [0, 8],
      hideOnClick: false,
      onShow: (instance) => {
        // S'assurer que les autres menus sont fermés
        this.hideOtherMenus();
      },
      getReferenceClientRect: () => this.getImageRect(),
      // Améliorer le positionnement avec scroll
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
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

    // Trouver l'image sélectionnée dans le DOM
    const { from } = ed.state.selection;

    // Fonction pour trouver toutes les images dans l'éditeur
    const getAllImages = (): HTMLImageElement[] => {
      const editorElement = ed.view.dom;
      return Array.from(editorElement.querySelectorAll("img"));
    };

    // Fonction pour trouver l'image à la position spécifique
    const findImageAtPosition = (): HTMLImageElement | null => {
      const allImages = getAllImages();

      for (const img of allImages) {
        try {
          // Obtenir la position ProseMirror de cette image
          const imgPos = ed.view.posAtDOM(img, 0);
          // Vérifier si cette image correspond à la position sélectionnée
          if (Math.abs(imgPos - from) <= 1) {
            return img;
          }
        } catch (error) {
          // Continuer si on ne peut pas obtenir la position de cette image
          continue;
        }
      }

      return null;
    };

    // Chercher l'image à la position exacte
    const imageElement = findImageAtPosition();

    if (imageElement) {
      return imageElement.getBoundingClientRect();
    }

    return new DOMRect(0, 0, 0, 0);
  }

  updateMenu = () => {
    // Debounce pour éviter les appels trop fréquents
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      const ed = this.editor();
      if (!ed) return;

      const isImageSelected =
        ed.isActive("resizableImage") || ed.isActive("image");

      // Ne montrer le menu image que si :
      // - Une image est sélectionnée
      // - L'éditeur est éditable
      const shouldShow = isImageSelected && ed.isEditable;

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

  private hideOtherMenus() {
    // Cette méthode peut être étendue pour fermer d'autres menus si nécessaire
    // Pour l'instant, elle sert de placeholder pour une future coordination entre menus
  }

  private showTippy() {
    if (!this.tippyInstance) return;

    // Mettre à jour la position
    this.tippyInstance.setProps({
      getReferenceClientRect: () => this.getImageRect(),
    });

    this.tippyInstance.show();
  }

  private hideTippy() {
    if (this.tippyInstance) {
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
}
