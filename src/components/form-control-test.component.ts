import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormControl, FormGroup } from "@angular/forms";
import { AngularTiptapEditorComponent } from "angular-tiptap-editor";

@Component({
  selector: "app-form-control-test",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AngularTiptapEditorComponent],
  template: `
    <div class="form-test-container">
      <h3>🧪 Test FormControl</h3>

      <!-- Test FormControl simple -->
      <div class="test-section">
        <h4>1. FormControl simple</h4>
        <div class="controls">
          <button type="button" (click)="testSimpleFormControl()">Test setValue</button>
          <button type="button" (click)="testSimplePatchValue()">Test patchValue</button>
          <button type="button" (click)="clearSimpleForm()">Clear</button>
        </div>

        <angular-tiptap-editor [formControl]="simpleControl" [minHeight]="150" placeholder="FormControl simple..." />

        <div class="form-value">
          <strong>Valeur du FormControl:</strong>
          <pre>{{ simpleControl.value || "null" }}</pre>
        </div>
      </div>

      <!-- Test FormGroup -->
      <div class="test-section">
        <h4>2. FormGroup</h4>
        <div class="controls">
          <button type="button" (click)="testFormGroup()">Test patchValue</button>
          <button type="button" (click)="testFormGroupSetValue()">Test setValue</button>
          <button type="button" (click)="clearFormGroup()">Clear</button>
        </div>

        <form [formGroup]="testForm">
          <input type="text" formControlName="title" placeholder="Titre" />

          <angular-tiptap-editor formControlName="content" [minHeight]="150" placeholder="Contenu du FormGroup..." />
        </form>

        <div class="form-value">
          <strong>Valeur du FormGroup:</strong>
          <pre>{{ testForm.value | json }}</pre>
        </div>
      </div>

      <!-- Tests de timing -->
      <div class="test-section">
        <h4>3. Tests de timing</h4>
        <div class="controls">
          <button type="button" (click)="testEarlyPatchValue()">Test patchValue immédiat (ngOnInit)</button>
          <button type="button" (click)="testDelayedPatchValue()">Test patchValue retardé (500ms)</button>
        </div>

        <angular-tiptap-editor [formControl]="timingControl" [minHeight]="150" placeholder="Test de timing..." />

        <div class="form-value">
          <strong>Valeur timing:</strong>
          <pre>{{ timingControl.value || "null" }}</pre>
        </div>
      </div>

      <!-- FormControl avec valeur initiale -->
      <div class="test-section">
        <h4>4. FormControl avec valeur initiale</h4>
        <div class="controls">
          <button type="button" (click)="testPrefilledControl()">Test patchValue sur valeur existante</button>
          <button type="button" (click)="clearPrefilledControl()">Clear</button>
          <button type="button" (click)="resetPrefilledControl()">Reset à la valeur initiale</button>
        </div>

        <angular-tiptap-editor
          [formControl]="prefilledControl"
          [minHeight]="150"
          placeholder="FormControl pré-rempli..." />

        <div class="form-value">
          <strong>Valeur du FormControl pré-rempli:</strong>
          <pre>{{ prefilledControl.value || "null" }}</pre>
        </div>
      </div>

      <!-- FormGroup avec valeurs initiales -->
      <div class="test-section">
        <h4>5. FormGroup avec valeurs initiales</h4>
        <div class="controls">
          <button type="button" (click)="testPrefilledForm()">Test patchValue sur FormGroup pré-rempli</button>
          <button type="button" (click)="clearPrefilledForm()">Clear</button>
          <button type="button" (click)="resetPrefilledForm()">Reset aux valeurs initiales</button>
        </div>

        <form [formGroup]="prefilledForm">
          <input type="text" formControlName="title" placeholder="Titre" />

          <angular-tiptap-editor
            formControlName="content"
            [minHeight]="150"
            placeholder="Contenu du FormGroup pré-rempli..." />
        </form>

        <div class="form-value">
          <strong>Valeur du FormGroup pré-rempli:</strong>
          <pre>{{ prefilledForm.value | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .form-test-container {
        padding: 20px;
        background: var(--app-surface);
        border-radius: 8px;
        border: 1px solid var(--app-border);
        margin-bottom: 20px;
      }

      .test-section {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--app-border);
      }

      .test-section:last-child {
        border-bottom: none;
      }

      h3 {
        color: var(--text-main);
        margin-bottom: 20px;
      }

      h4 {
        color: var(--text-primary);
        margin-bottom: 15px;
        font-size: 16px;
      }

      .controls {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }

      button {
        background: var(--primary-gradient);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(var(--primary-color-rgb), 0.3);
      }

      .form-value {
        margin-top: 15px;
        padding: 12px;
        background: var(--app-header-bg);
        border-radius: 6px;
        border: 1px solid var(--app-border);
      }

      .form-value pre {
        margin-top: 8px;
        font-family: "Monaco", "Consolas", monospace;
        font-size: 12px;
        color: var(--text-secondary);
        white-space: pre-wrap;
        word-break: break-all;
      }

      angular-tiptap-editor {
        display: block;
        margin: 15px 0;
      }

      input[type="text"] {
        width: 100%;
        margin-bottom: 10px;
        padding: 10px;
        border: 1px solid var(--app-border);
        border-radius: 6px;
        background: var(--app-surface);
        color: var(--text-primary);
        font-size: 14px;
        box-sizing: border-box;
      }

      input[type="text"]:focus {
        border-color: var(--primary-color);
        outline: none;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      }
    `,
  ],
})
export class FormControlTestComponent implements OnInit {
  // FormControl simple
  simpleControl = new FormControl("");

  // FormGroup
  testForm = new FormGroup({
    title: new FormControl(""),
    content: new FormControl(""),
  });

  // FormControl pour les tests de timing
  timingControl = new FormControl("");

  // FormControl avec valeur initiale
  prefilledControl = new FormControl(
    "<h2>Valeur initiale</h2><p>Ce FormControl a été créé avec du <strong>contenu initial</strong> !</p>"
  );

  // FormGroup avec valeurs initiales
  prefilledForm = new FormGroup({
    title: new FormControl("Titre pré-rempli"),
    content: new FormControl(
      "<h2>FormGroup pré-rempli</h2><p>Ce FormGroup a été créé avec des <em>valeurs initiales</em> dans le constructeur !</p><ul><li>Item initial 1</li><li>Item initial 2</li></ul>"
    ),
  });

  ngOnInit() {
    console.log("FormControlTestComponent initialized");

    // Test immédiat - peut échouer si l'éditeur n'est pas encore prêt
    this.testEarlyPatchValue();
  }

  // Tests FormControl simple
  testSimpleFormControl() {
    console.log("=== Test setValue FormControl simple ===");
    this.simpleControl.setValue("<h2>Test setValue</h2><p>Contenu mis à jour via <strong>setValue()</strong></p>");
  }

  testSimplePatchValue() {
    console.log("=== Test patchValue FormControl simple ===");
    this.simpleControl.patchValue(
      "<h2>Test patchValue</h2><p>Contenu mis à jour via <strong>patchValue()</strong></p>"
    );
  }

  clearSimpleForm() {
    console.log("=== Clear FormControl simple ===");
    this.simpleControl.setValue("");
  }

  // Tests FormGroup
  testFormGroup() {
    console.log("=== Test patchValue FormGroup ===");
    this.testForm.patchValue({
      title: "Titre du FormGroup",
      content:
        "<h2>Test FormGroup</h2><p>Contenu mis à jour via <strong>patchValue()</strong> sur le FormGroup</p><ul><li>Item 1</li><li>Item 2</li></ul>",
    });
  }

  testFormGroupSetValue() {
    console.log("=== Test setValue FormGroup ===");
    this.testForm.setValue({
      title: "Titre setValue",
      content:
        "<h2>Test setValue FormGroup</h2><p>Contenu mis à jour via <strong>setValue()</strong> sur le FormGroup</p>",
    });
  }

  clearFormGroup() {
    console.log("=== Clear FormGroup ===");
    this.testForm.setValue({
      title: "",
      content: "",
    });
  }

  // Tests de timing
  testEarlyPatchValue() {
    console.log("=== Test patchValue immédiat (peut échouer) ===");
    this.timingControl.patchValue(
      "<h3>🚀 Test immédiat</h3><p>Si vous voyez ce contenu, le système fonctionne même avec un patchValue immédiat !</p>"
    );
  }

  testDelayedPatchValue() {
    console.log("=== Test patchValue retardé ===");
    setTimeout(() => {
      this.timingControl.patchValue("<h3>⏰ Test retardé</h3><p>Ce contenu a été appliqué avec un délai de 500ms.</p>");
    }, 500);
  }

  // Tests FormControl pré-rempli
  testPrefilledControl() {
    console.log("=== Test patchValue sur FormControl pré-rempli ===");
    this.prefilledControl.patchValue(
      "<h2>Valeur modifiée !</h2><p>Le contenu initial a été <strong>remplacé</strong> par patchValue !</p><blockquote>Ancien contenu écrasé</blockquote>"
    );
  }

  clearPrefilledControl() {
    console.log("=== Clear FormControl pré-rempli ===");
    this.prefilledControl.setValue("");
  }

  resetPrefilledControl() {
    console.log("=== Reset FormControl à la valeur initiale ===");
    this.prefilledControl.setValue(
      "<h2>Valeur initiale</h2><p>Ce FormControl a été créé avec du <strong>contenu initial</strong> !</p>"
    );
  }

  // Tests FormGroup pré-rempli
  testPrefilledForm() {
    console.log("=== Test patchValue sur FormGroup pré-rempli ===");
    this.prefilledForm.patchValue({
      title: "Titre modifié via patchValue",
      content:
        "<h2>FormGroup modifié !</h2><p>Les valeurs initiales ont été <em>remplacées</em> !</p><ul><li>Nouveau item 1</li><li>Nouveau item 2</li><li>Item ajouté</li></ul>",
    });
  }

  clearPrefilledForm() {
    console.log("=== Clear FormGroup pré-rempli ===");
    this.prefilledForm.setValue({
      title: "",
      content: "",
    });
  }

  resetPrefilledForm() {
    console.log("=== Reset FormGroup aux valeurs initiales ===");
    this.prefilledForm.setValue({
      title: "Titre pré-rempli",
      content:
        "<h2>FormGroup pré-rempli</h2><p>Ce FormGroup a été créé avec des <em>valeurs initiales</em> dans le constructeur !</p><ul><li>Item initial 1</li><li>Item initial 2</li></ul>",
    });
  }
}
