import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { ThemeSwitchComponent, PanelButtonComponent, PanelHeaderComponent, DropdownSectionComponent } from "./ui";

interface ThemeVariable {
  name: string;
  cssVar: string;
  lightValue: string;
  darkValue: string;
  type: "color" | "size";
}

interface ThemeSection {
  key: string;
  title: string;
  icon: string;
  variables: ThemeVariable[];
}

type ThemeMode = 'light' | 'dark';

@Component({
  selector: "app-theme-customizer",
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeSwitchComponent, PanelButtonComponent, PanelHeaderComponent, DropdownSectionComponent],
  template: `
    <!-- Sidebar Theme Panel -->
    <aside
      class="sidebar left"
      [class.hidden]="!isOpen()"
      [class.expanding]="isExpanding()"
    >
      <div class="sidebar-container">
        <!-- Header -->
        <app-panel-header
          [title]="appI18n.titles().themeCustomizer"
          icon="palette"
          (closeClick)="close()"
        >
          <app-panel-button
            actions
            icon="restart_alt"
            variant="secondary"
            [tooltip]="appI18n.theme().resetTheme"
            (onClick)="resetTheme()"
          />

          <!-- Theme Mode Switch -->
          <div class="theme-mode-row">
            <app-theme-switch />
            <span class="mode-indicator" [class.dark]="isDarkMode()">
              {{ isDarkMode() ? appI18n.theme().dark : appI18n.theme().light }}
            </span>
          </div>
        </app-panel-header>

        <!-- Content (scrollable) -->
        <div class="sidebar-scroll-content">
          <div class="theme-config-padding">
            @for (section of themeSections(); track section.key) {
            <app-dropdown-section
              [title]="section.title"
              [icon]="section.icon"
              [externalControl]="openSections()[section.key]"
              (openChange)="toggleSection(section.key)"
            >
              <div class="config-items-grid">
                @for (variable of section.variables; track variable.cssVar) {
                <div class="config-item-row">
                  <label class="config-item-label" [title]="variable.cssVar">
                    {{ variable.name }}
                  </label>
                  <div class="variable-input">
                    @if (variable.type === 'color') {
                    <input
                      type="color"
                      [value]="getPickerValue(variable)"
                      (input)="onColorChange(variable, $event)"
                      class="color-picker"
                    />
                    <input
                      type="text"
                      [value]="getVariableValue(variable)"
                      (input)="onTextChange(variable, $event)"
                      class="color-text"
                    />
                    } @else if (variable.type === 'size') {
                    <input
                      type="text"
                      [value]="getVariableValue(variable)"
                      (input)="onTextChange(variable, $event)"
                      class="size-input"
                    />
                    }
                  </div>
                </div>
                }
              </div>
            </app-dropdown-section>
            }
 
            <!-- Info Section -->
            <app-dropdown-section
              [title]="appI18n.theme().moreCssVariables"
              icon="info"
              [externalControl]="openSections()['moreVariables']"
              (openChange)="toggleSection('moreVariables')"
              headerBg="var(--warning-bg)"
              contentBg="var(--warning-bg)"
              borderColor="var(--warning-border)"
              iconColor="var(--warning-text)"
            >
              <div class="info-content-container">
                <div class="app-alert warning">
                  <span class="material-symbols-outlined app-alert-icon">info</span>
                  <p class="app-alert-content">
                    {{ appI18n.theme().cssVariablesInfo }}
                  </p>
                </div>
                <div class="css-variables-list">
                  <code>--ate-line-height</code>
                  <code>--ate-menu-shadow</code>
                  <code>--ate-image-border-radius</code>
                  <code>--ate-error-color</code>
                  <code>--ate-error-bg</code>
                  <code>--ate-drag-border-color</code>
                  <code>--ate-table-resize-handle-color</code>
                  <code>--ate-counter-background</code>
                  <code>--ate-focus-color</code>
                </div>
                <div class="app-alert success">
                  <span class="material-symbols-outlined app-alert-icon">lightbulb</span>
                  <p class="app-alert-content">{{ appI18n.theme().cssVariablesHint }}</p>
                </div>
              </div>
            </app-dropdown-section>
          </div>
        </div>
 
        <!-- Export Button (fixed at bottom) -->
        <div class="export-section">
          <button class="export-btn" [class.success]="isCopied()" (click)="exportTheme()">
            <span class="material-symbols-outlined">{{ isCopied() ? 'check' : 'content_copy' }}</span>
            {{ isCopied() ? appI18n.ui().copied : appI18n.theme().copyCssToClipboard }}
          </button>
        </div>
      </div>
    </aside>

    <!-- Open Button -->
    @if (!isOpen() && !isExpanding()) {
    <button
      class="open-panel-btn left"
      (click)="open()"
      [title]="appI18n.theme().openThemeCustomizer"
    >
      <span class="material-symbols-outlined">palette</span>
    </button>
    }
  `,
  styles: [
    `
      .theme-config-padding {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      /* Theme Mode Row */
      .theme-mode-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.25rem 1rem;
        gap: 0.75rem;
      }

      .mode-label {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .mode-indicator {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        background: var(--warning-gradient);
        color: white;
        min-width: 40px;
        text-align: center;
      }

      .mode-indicator.dark {
        background: var(--primary-gradient);
      }




      .variable-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .color-picker {
        width: 32px;
        height: 32px;
        padding: 0;
        border: 2px solid var(--app-border);
        border-radius: 8px;
        cursor: pointer;
        background: none;
      }

      .color-picker::-webkit-color-swatch-wrapper {
        padding: 2px;
      }

      .color-picker::-webkit-color-swatch {
        border: none;
        border-radius: 4px;
      }

      .color-text {
        width: 80px;
        padding: 0.5rem;
        border: 1px solid var(--app-border);
        border-radius: 8px;
        font-size: 0.75rem;
        font-family: monospace;
        color: var(--text-primary);
        background: var(--app-surface);
      }

      .color-text:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .size-input {
        width: 80px;
        padding: 0.5rem;
        border: 1px solid var(--app-border);
        border-radius: 8px;
        font-size: 0.75rem;
        color: var(--text-primary);
        background: var(--app-surface);
      }

      .info-content-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }


      .css-variables-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
      }

      .css-variables-list code {
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 4px;
        color: var(--primary-color);
        font-family: monospace;
      }


      .export-section {
        flex-shrink: 0;
        padding: 1rem;
        border-top: 1px solid var(--app-border);
        background: var(--app-surface);
        border-radius: 0 0 16px 16px;
      }

      .export-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: var(--app-header-bg);
        color: var(--primary-color);
        border: 1px solid var(--app-border);
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .export-btn:hover {
        background: var(--app-surface-hover);
        border-color: var(--primary-color);
      }

      .export-btn.success {
        background: var(--success-bg);
        color: var(--success-text);
        border-color: var(--success-border);
      }

      .export-btn .material-symbols-outlined {
        font-size: 18px;
      }
    `,
  ],
})
export class ThemeCustomizerComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  // Computed state based on activePanel
  isOpen = computed(() => this.configService.editorState().activePanel === 'theme');
  isExpanding = signal(false);
  isCopied = signal(false);

  // Light or Dark mode from service (synced with editor)
  isDarkMode = computed(() => this.configService.editorState().darkMode);
  activeMode = computed<ThemeMode>(() => this.isDarkMode() ? 'dark' : 'light');

  openSections = signal<Record<string, boolean>>({
    "accents": true,
    "surfaces": false,
    "typography": false,
    "blocks": false,
    "geometry": false,
    "moreVariables": false,
  });

  // Complete theme variables with i18n
  themeSections = computed<ThemeSection[]>(() => {
    const t = this.appI18n.theme();
    return [
      {
        key: "accents",
        title: t.accents,
        icon: "colorize",
        variables: [
          { name: t.primaryColor, cssVar: "--ate-primary", lightValue: "#2563eb", darkValue: "#3b82f6", type: "color" },
          { name: t.borderColor, cssVar: "--ate-border", lightValue: "#e2e8f0", darkValue: "#1e293b", type: "color" },
        ],
      },
      {
        key: "surfaces",
        title: t.surfaces,
        icon: "layers",
        variables: [
          { name: t.contentBackground, cssVar: "--ate-surface", lightValue: "#ffffff", darkValue: "#020617", type: "color" },
          { name: t.toolbarBackground, cssVar: "--ate-surface-secondary", lightValue: "#f8f9fa", darkValue: "#0f172a", type: "color" },
          { name: t.menuBackground, cssVar: "--ate-menu-bg", lightValue: "#ffffff", darkValue: "#0f172a", type: "color" },
        ],
      },
      {
        key: "typography",
        title: t.typography,
        icon: "format_size",
        variables: [
          { name: t.mainText, cssVar: "--ate-text", lightValue: "#2d3748", darkValue: "#f8fafc", type: "color" },
          { name: t.secondaryText, cssVar: "--ate-text-secondary", lightValue: "#64748b", darkValue: "#94a3b8", type: "color" },
          { name: t.mutedText, cssVar: "--ate-text-muted", lightValue: "#a0aec0", darkValue: "#64748b", type: "color" },
        ],
      },
      {
        key: "blocks",
        title: t.blocks,
        icon: "category",
        variables: [
          { name: t.inlineCodeBackground, cssVar: "--ate-code-background", lightValue: "#f8f9fa", darkValue: "#181825", type: "color" },
          { name: t.inlineCodeText, cssVar: "--ate-code-color", lightValue: "#2d3748", darkValue: "#cdd6f4", type: "color" },
          { name: t.codeBlockBackground, cssVar: "--ate-code-block-background", lightValue: "#181825", darkValue: "#0f172a", type: "color" },
          { name: t.codeBlockText, cssVar: "--ate-code-block-color", lightValue: "#e2e8f0", darkValue: "#f8fafc", type: "color" },
          { name: t.highlightColor, cssVar: "--ate-highlight-bg", lightValue: "#fef08a", darkValue: "#854d0e", type: "color" },
          { name: t.blockquoteBorder, cssVar: "--ate-blockquote-border-color", lightValue: "#e2e8f0", darkValue: "#3b82f6", type: "color" },
        ],
      },
      {
        key: "geometry",
        title: t.geometry,
        icon: "rounded_corner",
        variables: [
          { name: t.borderRadius, cssVar: "--ate-border-radius", lightValue: "8px", darkValue: "8px", type: "size" },
          { name: t.borderWidth, cssVar: "--ate-border-width", lightValue: "2px", darkValue: "2px", type: "size" },
          { name: t.contentPadding, cssVar: "--ate-content-padding", lightValue: "16px", darkValue: "16px", type: "size" },
        ],
      },
    ];
  });

  private lightCustomValues = new Map<string, string>();
  private darkCustomValues = new Map<string, string>();

  // Track default values read from DOM as a signal for reactivity
  private _domDefaultValues = signal<Map<string, string>>(new Map());

  getVariableValue(variable: ThemeVariable): string {
    const mode = this.activeMode();
    const customMap = mode === "light" ? this.lightCustomValues : this.darkCustomValues;

    if (customMap.has(variable.cssVar)) {
      return customMap.get(variable.cssVar)!;
    }

    // If we have a read value from DOM, use it as fallback
    const defaults = this._domDefaultValues();
    if (defaults.has(variable.cssVar)) {
      return defaults.get(variable.cssVar)!;
    }

    return mode === "light" ? variable.lightValue : variable.darkValue;
  }

  /**
   * Helper for <input type="color"> which only supports 6-digit hex
   */
  getPickerValue(variable: ThemeVariable): string {
    const value = this.getVariableValue(variable);
    if (!value) return "#000000";

    if (value.startsWith("#")) {
      return value.substring(0, 7); // Strip possible alpha
    }

    // Fallback convert to hex and strip alpha
    return this.colorToHex(value).substring(0, 7);
  }

  private observer: MutationObserver | null = null;

  open() {
    this.isExpanding.set(true);
    this.configService.setActivePanel("theme");

    // Read current values from the editor in DOM to initialize customizer
    setTimeout(() => {
      const editorEl = document.querySelector("angular-tiptap-editor");
      if (editorEl && !this.observer) {
        this.observer = new MutationObserver(() => this.readValuesFromDom());
        this.observer.observe(editorEl, { attributes: true, attributeFilter: ['class', 'data-theme'] });
      }
      this.readValuesFromDom();
      this.isExpanding.set(false);
    }, 800);
  }

  constructor() {
    // Initial state from open input
    setTimeout(() => this.isExpanding.set(false), 0);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private readValuesFromDom() {
    const editorEl = document.querySelector("angular-tiptap-editor");
    if (!editorEl) return;

    // Use a small timeout to ensure computed styles are updated by the browser
    setTimeout(() => {
      const styles = window.getComputedStyle(editorEl);
      const sections = this.themeSections();
      const newDefaults = new Map<string, string>();

      sections.forEach((section) => {
        section.variables.forEach((variable) => {
          let value = styles.getPropertyValue(variable.cssVar).trim();
          if (value) {
            // Convert any color format to HEX for the color input (preserving alpha)
            if (variable.type === "color") {
              value = this.colorToHex(value);
            }
            newDefaults.set(variable.cssVar, value);
          }
        });
      });

      // Force a new map reference to trigger signal reactivity
      this._domDefaultValues.set(new Map(newDefaults));
    }, 100);
  }

  /**
   * Universal color converter to HEX (supports 8-digit hex for transparency)
   */
  private colorToHex(color: string): string {
    if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return "#00000000";

    if (color.startsWith("#")) {
      // Handle shorthand hex #abc
      if (color.length === 4) {
        return "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
      }
      return color.toUpperCase();
    }

    // Use a robust extraction for rgb/rgba
    const values = color.match(/[\d.]+/g);
    if (!values || values.length < 3) return color;

    const r = parseInt(values[0], 10);
    const g = parseInt(values[1], 10);
    const b = parseInt(values[2], 10);

    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, n)).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Check for alpha channel
    if (values[3] !== undefined) {
      const a = Math.round(parseFloat(values[3]) * 255);
      hex += toHex(a);
    }

    return hex.toUpperCase();
  }

  private rgbToHex(rgb: string): string {
    return this.colorToHex(rgb);
  }

  close() {
    this.configService.setActivePanel("none");
  }

  toggleSection(title: string) {
    this.openSections.update((sections) => ({
      ...sections,
      [title]: !sections[title],
    }));
  }

  onColorChange(variable: ThemeVariable, event: Event) {
    const input = event.target as HTMLInputElement;
    const newColor = input.value; // Always #RRGGBB from picker

    // Preserve existing alpha if present
    const currentValue = this.getVariableValue(variable);
    if (currentValue.startsWith("#") && currentValue.length === 9) {
      const alpha = currentValue.substring(7);
      this.applyVariable(variable.cssVar, newColor + alpha);
    } else {
      this.applyVariable(variable.cssVar, newColor);
    }
  }

  onTextChange(variable: ThemeVariable, event: Event) {
    const input = event.target as HTMLInputElement;
    this.applyVariable(variable.cssVar, input.value);
  }

  private applyVariable(cssVar: string, value: string) {
    const mode = this.activeMode();
    const customMap = mode === "light" ? this.lightCustomValues : this.darkCustomValues;
    customMap.set(cssVar, value);

    // Update dynamic stylesheet with proper selectors
    this.updateStylesheet();
  }

  private updateStylesheet() {
    // Get or create the dynamic stylesheet
    let styleEl = document.getElementById('theme-customizer-styles') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-customizer-styles';
      document.head.appendChild(styleEl);
    }

    let css = '';

    // Light mode styles
    if (this.lightCustomValues.size > 0) {
      css += 'angular-tiptap-editor:not(.dark) {\n';
      this.lightCustomValues.forEach((value, cssVar) => {
        css += `  ${cssVar}: ${value} !important;\n`;
      });
      css += '}\n\n';
    }

    // Dark mode styles
    if (this.darkCustomValues.size > 0) {
      css += 'angular-tiptap-editor.dark,\nangular-tiptap-editor[data-theme="dark"] {\n';
      this.darkCustomValues.forEach((value, cssVar) => {
        css += `  ${cssVar}: ${value} !important;\n`;
      });
      css += '}\n';
    }

    styleEl.textContent = css;
  }

  resetTheme() {
    // Remove dynamic stylesheet
    const styleEl = document.getElementById('theme-customizer-styles');
    if (styleEl) {
      styleEl.remove();
    }

    // Clear custom values - the computed themeSections will use default values
    this.lightCustomValues.clear();
    this.darkCustomValues.clear();
  }

  exportTheme() {
    const hasLightValues = this.lightCustomValues.size > 0;
    const hasDarkValues = this.darkCustomValues.size > 0;

    if (!hasLightValues && !hasDarkValues) {
      alert("No custom theme values to export!");
      return;
    }

    let css = "";

    if (hasLightValues) {
      css += "/* Light Mode */\nangular-tiptap-editor {\n";
      this.lightCustomValues.forEach((value, cssVar) => {
        css += `  ${cssVar}: ${value};\n`;
      });
      css += "}\n\n";
    }

    if (hasDarkValues) {
      css += "/* Dark Mode */\nangular-tiptap-editor.dark,\nangular-tiptap-editor[data-theme=\"dark\"] {\n";
      this.darkCustomValues.forEach((value, cssVar) => {
        css += `  ${cssVar}: ${value};\n`;
      });
      css += "}";
    }

    const textToCopy = css.trim();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  }
}
