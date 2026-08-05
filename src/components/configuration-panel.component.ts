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
import { BlockControlsConfigComponent } from "./block-controls-config.component";
import { TocConfigComponent } from "./toc-config.component";
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
    BlockControlsConfigComponent,
    TocConfigComponent,
  ],
  template: `
    <!-- Sidebar de configuration harmonisé -->
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
            <div
              class="sidebar-status-item"
              [class.active]="editorState().showToolbar"
              title="Toolbar active items">
              <span class="material-symbols-outlined">build</span>
              <span>{{ toolbarActiveCount() }}</span>
            </div>
            <div
              class="sidebar-status-item"
              [class.active]="editorState().showBubbleMenu"
              title="Bubble menu active items">
              <span class="material-symbols-outlined">chat_bubble</span>
              <span>{{ bubbleMenuActiveCount() }}</span>
            </div>
            <div
              class="sidebar-status-item"
              [class.active]="editorState().enableSlashCommands"
              title="Slash commands active items">
              <span class="material-symbols-outlined">flash_on</span>
              <span>{{ slashCommandsActiveCount() }}</span>
            </div>
          </div>
        </app-panel-header>

        <!-- Configuration sections harmonisées -->
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
                  <span class="code-string">"\\$\${{ magicTitle() }}"</span>
                  );
                  {{ "}" }}
                </div>
              </div>
            }
          </app-config-section>

          <!-- Block Controls Configuration -->
          <app-block-controls-config [disabled]="editorState().disabled" />

          <!-- Table of Contents (TOC) Configuration -->
          <app-toc-config />

          <!-- Extensions Configuration -->
          <app-extension-config [disabled]="!editorState().editable || editorState().disabled" />

          <!-- Footer Settings -->
          <app-footer-config [disabled]="!editorState().editable || editorState().disabled" />

          <!-- Fill Container Configuration -->
          <app-fill-container-config [disabled]="editorState().disabled" />

          <!-- Height Configuration -->
          <app-height-config [disabled]="editorState().disabled" />

          <!-- Seamless Configuration -->
          <app-seamless-config [disabled]="editorState().disabled" />

          <!-- Editable Configuration -->
          <app-editable-config />

          <!-- Disabled Configuration -->
          <app-disabled-config />

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
        font-family: "Fira Code", monospace;
        font-size: 0.75rem;
        overflow-x: auto;
      }

      .code-keyword {
        color: #569cd6;
      }

      .code-string {
        color: #ce9178;
      }

      .sidebar-status-bar {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--app-border);
      }

      .sidebar-status-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: var(--text-muted);
        opacity: 0.6;
        transition: all 0.2s;
      }

      .sidebar-status-item.active {
        color: var(--primary-color);
        opacity: 1;
        font-weight: 600;
      }

      .sidebar-status-item .material-symbols-outlined {
        font-size: 16px;
      }
    `,
  ],
})
export class ConfigurationPanelComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);
  private elementRef = inject(ElementRef);

  // Signaux publics (lecture seule)
  readonly editorState = this.configService.editorState;
  readonly menuState = this.configService.menuState;
  readonly magicTitle = this.configService.magicTemplateTitle;

  // Signaux calculés pour les items i18n
  readonly toolbarItems = computed(() => createToolbarItems(this.appI18n.items()));
  readonly bubbleMenuItems = computed(() => createBubbleMenuItems(this.appI18n.items()));
  readonly slashCommandItems = computed(() => createSlashCommandItems(this.appI18n.items()));

  // Counters
  readonly toolbarActiveCount = computed(
    () => this.toolbarItems().filter(item => this.isToolbarItemActive(item.key)).length
  );
  readonly bubbleMenuActiveCount = computed(
    () => this.bubbleMenuItems().filter(item => this.isBubbleMenuItemActive(item.key)).length
  );
  readonly slashCommandsActiveCount = computed(
    () => this.slashCommandItems().filter(item => this.isSlashCommandActive(item.key)).length
  );

  constructor() {
    effect(() => {
      if (this.editorState().showSidebar) {
        setTimeout(() => {
          const sidebarElement = this.elementRef.nativeElement.querySelector(".sidebar.right");
          sidebarElement?.focus();
        }, 100);
      }
    });
  }

  toggleSidebar() {
    this.configService.togglePanel("config");
  }

  resetToDefaults() {
    this.configService.resetToDefaults();
  }

  // Toolbar methods
  toggleToolbar() {
    this.configService.updateEditorState({
      showToolbar: !this.editorState().showToolbar,
    });
  }

  toggleToolbarMenu() {
    this.configService.updateMenuState({
      showToolbarMenu: !this.menuState().showToolbarMenu,
    });
  }

  isToolbarItemActive(key: string): boolean {
    return this.configService.isToolbarItemActive(key);
  }

  toggleToolbarItem(key: string) {
    this.configService.toggleToolbarItem(key);
  }

  // Bubble Menu methods
  toggleBubbleMenu() {
    this.configService.updateEditorState({
      showBubbleMenu: !this.editorState().showBubbleMenu,
    });
  }

  toggleBubbleMenuMenu() {
    this.configService.updateMenuState({
      showBubbleMenuMenu: !this.menuState().showBubbleMenuMenu,
    });
  }

  isBubbleMenuItemActive(key: string): boolean {
    return this.configService.isBubbleMenuItemActive(key);
  }

  toggleBubbleMenuItem(key: string) {
    this.configService.toggleBubbleMenuItem(key);
  }

  // Slash Commands methods
  toggleSlashCommands() {
    this.configService.updateEditorState({
      enableSlashCommands: !this.editorState().enableSlashCommands,
    });
  }

  toggleSlashCommandsMenu() {
    this.configService.updateMenuState({
      showSlashCommandsMenu: !this.menuState().showSlashCommandsMenu,
    });
  }

  isSlashCommandActive(key: string): boolean {
    return this.configService.isSlashCommandActive(key);
  }

  toggleSlashCommand(key: string) {
    this.configService.toggleSlashCommand(key);
  }

  updateMagicTitle(title: string) {
    this.configService.updateMagicTemplateTitle(title);
  }
}
