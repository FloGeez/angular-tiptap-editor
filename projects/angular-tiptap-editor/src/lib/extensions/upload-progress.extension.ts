import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface UploadProgressOptions {
  isUploading: () => boolean;
  uploadProgress: () => number;
  uploadMessage: () => string;
}

export const UploadProgress = Extension.create<UploadProgressOptions>({
  name: "uploadProgress",

  addOptions() {
    return {
      isUploading: () => false,
      uploadProgress: () => 0,
      uploadMessage: () => "",
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey("uploadProgress"),
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              isUploading: false,
              uploadPosition: null as number | null,
            };
          },
          apply: (tr, state) => {
            const isUploading = options.isUploading();

            // Si l'upload commence, sauvegarder la position
            if (isUploading && !state.isUploading) {
              const uploadPosition = tr.selection.from;
              const uploadProgress = options.uploadProgress();
              const uploadMessage = options.uploadMessage();

              // Créer un élément de progression
              const uploadElement = document.createElement("div");
              uploadElement.className = "upload-progress-widget";
              uploadElement.innerHTML = `
                <div class="upload-skeleton">
                  <div class="upload-content">
                    <div class="upload-icon">
                      <span class="material-symbols-outlined spinning">image</span>
                    </div>
                    <div class="upload-info">
                      <div class="upload-message">${uploadMessage}</div>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${uploadProgress}%"></div>
                      </div>
                      <div class="progress-text">${uploadProgress}%</div>
                    </div>
                  </div>
                </div>
              `;

              // Ajouter les styles si pas déjà fait
              if (!document.querySelector("#upload-progress-styles")) {
                const style = document.createElement("style");
                style.id = "upload-progress-styles";
                style.textContent = `
                  .upload-progress-widget {
                    display: block;
                    margin: 8px 0;
                    max-width: 400px;
                  }
                  .upload-skeleton {
                    background: var(--ate-surface-secondary);
                    border: 2px dashed var(--ate-border-color);
                    border-radius: var(--ate-border-radius);
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 120px;
                    animation: pulse 2s infinite;
                  }
                  @keyframes pulse {
                    0%, 100% { background-color: var(--ate-surface-secondary); }
                    50% { background-color: var(--ate-surface-tertiary); }
                  }
                  .upload-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    text-align: center;
                  }
                  .upload-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    background: var(--ate-primary-light);
                    border-radius: 50%;
                    color: var(--ate-primary);
                  }
                  .upload-icon .material-symbols-outlined {
                    font-size: 24px;
                  }
                  .spinning {
                    animation: spin 1s linear infinite;
                  }
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .upload-info {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                    max-width: 200px;
                  }
                  .upload-message {
                    font-size: 14px;
                    color: var(--ate-text);
                    font-weight: 500;
                  }
                  .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: var(--ate-border-color);
                    border-radius: 3px;
                    overflow: hidden;
                  }
                  .progress-fill {
                    height: 100%;
                    background: var(--ate-primary);
                    border-radius: 3px;
                    transition: width 0.3s ease;
                  }
                  .progress-text {
                    font-size: 12px;
                    color: var(--ate-text-secondary);
                    font-weight: 500;
                  }
                `;
                document.head.appendChild(style);
              }

              // Créer une décoration widget à la position sauvegardée
              const decoration = Decoration.widget(uploadPosition, uploadElement, {
                side: 1,
                key: "upload-progress",
              });

              return {
                decorations: DecorationSet.create(tr.doc, [decoration]),
                isUploading: true,
                uploadPosition,
              };
            }

            // Si l'upload continue, mettre à jour le contenu
            if (isUploading && state.isUploading && state.uploadPosition !== null) {
              const uploadProgress = options.uploadProgress();
              const uploadMessage = options.uploadMessage();

              // Mettre à jour le contenu de l'élément existant
              const existingElement = document.querySelector(".upload-progress-widget");
              if (existingElement) {
                existingElement.innerHTML = `
                  <div class="upload-skeleton">
                    <div class="upload-content">
                      <div class="upload-icon">
                        <span class="material-symbols-outlined spinning">image</span>
                      </div>
                      <div class="upload-info">
                        <div class="upload-message">${uploadMessage}</div>
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${uploadProgress}%"></div>
                        </div>
                        <div class="progress-text">${uploadProgress}%</div>
                      </div>
                    </div>
                  </div>
                `;
              }

              return state; // Garder les décorations existantes
            }

            // Si l'upload se termine, supprimer les décorations
            if (!isUploading && state.isUploading) {
              return {
                decorations: DecorationSet.empty,
                isUploading: false,
                uploadPosition: null,
              };
            }

            return state;
          },
        },
        props: {
          decorations(state) {
            const pluginState = this.getState(state);
            return pluginState ? pluginState.decorations : DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
