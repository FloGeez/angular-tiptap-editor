import { Component, inject, ElementRef, effect, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ConfigSectionComponent } from "./config-section.component";
import { FillContainerConfigComponent } from "./fill-container-config.component";
import { HeightConfigComponent } from "./height-config.component";
import { AutofocusConfigComponent } from "./autofocus-config.component";
import { PanelButtonComponent, PanelHeaderComponent } from "./ui";
import { FooterConfigComponent } from "./footer-config.component";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { ExtensionConfigComponent } from "./extension-config.component";
import { EditableConfigComponent } from "./editable-config.component";
import { DisabledConfigComponent } from "./disabled-config.component";
import { SeamlessConfigComponent } from "./seamless-config.component";
import { FloatingToolbarConfigComponent } from "./floating-toolbar-config.component";
import {
  createBubbleMenuItems,
  createSlashCommandItems,
  createToolbarItems,
} from "../config/editor-items.config";

@Component({
  selector: "app-configuration-panel",
  standalone: true,
  imports: [
    CommonModule,
    ConfigSectionComponent,
    FillContainerConfigComponent,
    HeightConfigComponent,
    AutofocusConfigComponent,
    PanelButtonComponent,
    PanelHeaderComponent,
    FooterConfigComponent,
    ExtensionConfigComponent,
    EditableConfigComponent,
    DisabledConfigComponent,
    SeamlessConfigComponent,
    FloatingToolbarConfigComponent,
  ],
  template: `
    <!-- Sidebar de configuration avec contenu visible pendant l'animation -->
    <aside
      class="sidebar right"
      data-testid="sidebar-config"
      [class.hidden]="!editorState().showSidebar && !editorState().isTransitioning"
      [class.expanding]="editorState().isTransitioning">
      <div class="sidebar-container">
        <!-- Header du sidebar -->
        <app-panel-header
          [title]="appI18n.ui().configuration"
          icon="tune"
          (headerClose)="toggleSidebar()">
          <app-panel-button
            actions
            icon="restart_alt"
            variant="secondary"
            [tooltip]="appI18n.tooltips().resetConfiguration"
            (click)="resetToDefaults()" />

          <!-- Status bar intégré -->
          <div class="sidebar-status-bar">
            <div class="sidebar-status-item" [class.active]="editorState().showToolbar">
              <span class="material-symbols-outlined">build</span>
              <span>{{ toolbarActiveCount() }}</span>
            </div>
            <div class="sidebar-status-item" [class.active]="editorState().showBubbleMenu">
              <span class="material-symbols-outlined">chat_bubble</span>
              <span>{{ bubbleMenuActiveCount() }}</span>
            </div>
            <div class="sidebar-status-item" [class.active]="editorState().enableSlashCommands">
              <span class="material-symbols-outlined">flash_on</span>
              <span>{{ slashCommandsActiveCount() }}</span>
            </div>
          </div>
        </app-panel-header>

        <!-- Configuration sections -->
        <div class="sidebar-scroll-content">
          <!-- Toolbar -->
          <app-config-section
            [title]="appI18n.config().toolbar"
            icon="build"
            [items]="toolbarItems()"
            [isEnabled]="editorState().showToolbar"
            [activeCount]="toolbarActiveCount()"
            [isDropdownOpen]="menuState().showToolbarMenu"
            [itemCheckFunction]="isToolbarItemActive.bind(this)"
            (toggleEnabled)="toggleToolbar()"
            (toggleDropdown)="toggleToolbarMenu()"
            (toggleItem)="toggleToolbarItem($event)"
            [disabled]="!editorState().editable || editorState().disabled">
            <app-floating-toolbar-config
              [disabled]="!editorState().editable || editorState().disabled" />
          </app-config-section>

          <!-- Bubble Menu -->
          <app-config-section
            [title]="appI18n.config().bubbleMenu"
            icon="chat_bubble"
            [items]="bubbleMenuItems()"
            [isEnabled]="editorState().showBubbleMenu"
            [activeCount]="bubbleMenuActiveCount()"
            [isDropdownOpen]="menuState().showBubbleMenuMenu"
            [itemCheckFunction]="isBubbleMenuItemActive.bind(this)"
            (toggleEnabled)="toggleBubbleMenu()"
            (toggleDropdown)="toggleBubbleMenuMenu()"
            (toggleItem)="toggleBubbleMenuItem($event)"
            [disabled]="!editorState().editable || editorState().disabled">
          </app-config-section>

          <!-- Slash Commands -->
          <app-config-section
            [title]="appI18n.config().slashCommands"
            icon="flash_on"
            [items]="slashCommandItems()"
            [isEnabled]="editorState().enableSlashCommands"
            [activeCount]="slashCommandsActiveCount()"
            [isDropdownOpen]="menuState().showSlashCommandsMenu"
            [itemCheckFunction]="isSlashCommandActive.bind(this)"
            (toggleEnabled)="toggleSlashCommands()"
            (toggleDropdown)="toggleSlashCommandsMenu()"
            (toggleItem)="toggleSlashCommand($event)"
            [disabled]="!editorState().editable || editorState().disabled">
            <!-- Afficher plus d'infos si la commande custom est active -->
            @if (isSlashCommandActive("custom_magic")) {
              <div class="custom-command-info">
                <label for="magic-title-input">
                  {{ appI18n.translations().items.customMagic }} (Live Edit)
                </label>
                <input
                  id="magic-title-input"
                  type="text"
                  [value]="magicTitle()"
                  (input)="updateMagicTitle($any($event.target).value)"
                  [placeholder]="appI18n.translations().items.customMagicTitle + '...'" />
                <label for="code-impl-display">Code Implementation</label>
                <div id="code-impl-display" class="code-display">
                  <span class="code-keyword">command</span>: (editor) =>
                  {{ "{" }} editor.commands.<span class="code-keyword">insertContent</span>(
                  <span class="code-string">"\${{ magicTitle() }}"</span>
                  );
                  {{ "}" }}
                </div>
              </div>
            }
          </app-config-section>

          <!-- Extensions Configuration -->
          <app-extension-config [disabled]="!editorState().editable || editorState().disabled" />

          <!-- Fill Container Configuration -->
          <app-fill-container-config [disabled]="editorState().disabled" />

          <!-- Height Configuration -->
          <app-height-config [disabled]="editorState().disabled" />

          <!-- Footer Settings -->
          <app-footer-config [disabled]="!editorState().editable || editorState().disabled" />

          <!-- Editable Configuration -->
          <app-editable-config />

          <!-- Disabled Configuration -->
          <app-disabled-config />

          <!-- Seamless Configuration -->
          <app-seamless-config [disabled]="editorState().disabled" />

          <!-- Autofocus Configuration -->
          <app-autofocus-config [disabled]="editorState().disabled" />
        </div>
      </div>
    </aside>

    <!-- Bouton d'ouverture simple -->
    @if (!editorState().showSidebar && !editorState().isTransitioning) {
      <button
        class="open-panel-btn right"
        data-testid="open-config-button"
        (click)="toggleSidebar()"
        [title]="appI18n.tooltips().toggleSidebar">
        <span class="material-symbols-outlined">tune</span>
      </button>
    }
  `,
  styles: [
    `
      .custom-command-info {
        padding: 1rem;
        background: rgba(var(--primary-color-rgb, 99, 102, 241), 0.05);
        border: 1px dashed var(--app-border);
        border-radius: 12px;
        font-size: 0.8rem;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .custom-command-info label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: var(--primary-color);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.7rem;
      }

      .custom-command-info input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        box-sizing: border-box;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--text-primary);
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
      }

      .code-display {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 0.75rem;
        border-radius: 6px;
        font-family: "Fira Code", "Courier New", monospace;
        white-space: pre-wrap;
        word-break: break-all;
        font-size: 0.75rem;
        border: 1px solid #333;
      }

      .code-keyword {
        color: #569cd6;
      }
      .code-string {
        color: #ce9178;
      }
      .code-comment {
        color: #6a9955;
      }
    `,
  ],
})
export class ConfigurationPanelComponent {
  readonly configService = inject(EditorConfigurationService);
  private elementRef = inject(ElementRef);
  readonly appI18n = inject(AppI18nService);

  // Signaux depuis le service
  readonly editorState = this.configService.editorState;
  readonly menuState = this.configService.menuState;
  readonly toolbarActiveCount = this.configService.toolbarActiveCount;
  readonly bubbleMenuActiveCount = this.configService.bubbleMenuActiveCount;
  readonly slashCommandsActiveCount = this.configService.slashCommandsActiveCount;

  // Configuration des items avec traductions
  readonly toolbarItems = computed(() => createToolbarItems(this.appI18n.items()));
  readonly bubbleMenuItems = computed(() => createBubbleMenuItems(this.appI18n.items()));
  readonly slashCommandItems = computed(() => createSlashCommandItems(this.appI18n.items()));

  constructor() {
    // Ajouter le listener pour fermer les dropdowns
    effect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        const appElement = this.elementRef.nativeElement;

        if (!appElement.contains(target)) {
          return;
        }

        // Check if click is inside an open menu
        const menuSections = appElement.querySelectorAll(".dropdown-section");
        let isInsideAnyMenu = false;

        menuSections.forEach((section: Element) => {
          if (section.contains(target)) {
            isInsideAnyMenu = true;
          }
        });

        // If click is outside all menus, close them
        if (!isInsideAnyMenu) {
          this.configService.closeAllMenus();
        }
      };

      document.addEventListener("click", handleClickOutside);

      // Cleanup
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    });

    // Effect pour démarrer l'animation d'expansion
    effect(() => {
      const isTransitioning = this.editorState().isTransitioning;

      if (isTransitioning) {
        // L'animation CSS se déclenche automatiquement via la classe .expanding
        // Pas besoin de manipulation DOM complexe
      }
    });
  }

  // Methods for toolbar
  toggleToolbar() {
    this.configService.updateEditorState({
      showToolbar: !this.editorState().showToolbar,
    });
  }

  toggleToolbarMenu() {
    this.configService.updateMenuState({
      showToolbarMenu: !this.menuState().showToolbarMenu,
      showBubbleMenuMenu: false,
      showSlashCommandsMenu: false,
    });
  }

  toggleToolbarItem(key: string) {
    this.configService.toggleToolbarItem(key);
  }

  isToolbarItemActive(key: string): boolean {
    return this.configService.isToolbarItemActive(key);
  }

  // Methods for bubble menu
  toggleBubbleMenu() {
    this.configService.updateEditorState({
      showBubbleMenu: !this.editorState().showBubbleMenu,
    });
  }

  toggleBubbleMenuMenu() {
    this.configService.updateMenuState({
      showBubbleMenuMenu: !this.menuState().showBubbleMenuMenu,
      showToolbarMenu: false,
      showSlashCommandsMenu: false,
    });
  }

  toggleBubbleMenuItem(key: string) {
    this.configService.toggleBubbleMenuItem(key);
  }

  isBubbleMenuItemActive(key: string): boolean {
    return this.configService.isBubbleMenuItemActive(key);
  }

  // Methods for slash commands
  toggleSlashCommands() {
    this.configService.updateEditorState({
      enableSlashCommands: !this.editorState().enableSlashCommands,
    });
  }

  toggleSlashCommandsMenu() {
    this.configService.updateMenuState({
      showSlashCommandsMenu: !this.menuState().showSlashCommandsMenu,
      showToolbarMenu: false,
      showBubbleMenuMenu: false,
    });
  }

  toggleSlashCommand(key: string) {
    this.configService.toggleSlashCommand(key);
  }

  isSlashCommandActive(key: string): boolean {
    return this.configService.isSlashCommandActive(key);
  }

  magicTitle = this.configService.magicTemplateTitle;

  updateMagicTitle(title: string) {
    this.configService.updateMagicTemplateTitle(title);
  }

  // General methods
  toggleSidebar() {
    const currentPanel = this.editorState().activePanel;

    if (currentPanel === "config") {
      // Fermeture du sidebar
      this.configService.setActivePanel("none");
    } else {
      // Fermer immédiatement l'autre panel et lancer l'animation
      this.configService.setActivePanel("config");
      this.configService.updateEditorState({ isTransitioning: true });

      // Après l'animation CSS, finaliser l'état
      setTimeout(() => {
        this.configService.updateEditorState({ isTransitioning: false });
      }, 800); // Durée de l'animation CSS
    }
  }

  resetToDefaults() {
    this.configService.resetToDefaults();
  }
}
