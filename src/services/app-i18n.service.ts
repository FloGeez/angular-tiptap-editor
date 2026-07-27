import { Injectable, signal, computed, inject } from "@angular/core";
import { SupportedLocale, AteI18nService } from "angular-tiptap-editor";
import {ENGLISH_APP_TRANSLATIONS} from "../i18n/en.translations";
import {FRENCH_APP_TRANSLATIONS} from "../i18n/fr.translations";
import {GERMAN_APP_TRANSLATIONS} from "../i18n/de.translations";
import {AppTranslations} from "../i18n";

@Injectable({
  providedIn: "root",
})
export class AppI18nService {
  private ateI18nService = inject(AteI18nService);

  private _translations = signal<Record<SupportedLocale, AppTranslations>>({
    en: ENGLISH_APP_TRANSLATIONS,
    fr: FRENCH_APP_TRANSLATIONS,
    de: GERMAN_APP_TRANSLATIONS
  });

  // Public signals - synchronized with Tiptap service
  readonly currentLocale = this.ateI18nService.currentLocale;
  readonly translations = computed(() => this._translations()[this.currentLocale()]);

  // Quick access methods
  readonly ui = computed(() => this.translations().ui);
  readonly config = computed(() => this.translations().config);
  readonly titles = computed(() => this.translations().titles);
  readonly tooltips = computed(() => this.translations().tooltips);
  readonly messages = computed(() => this.translations().messages);
  readonly demoContent = computed(() => this.translations().demoContent);
  readonly codeGeneration = computed(() => this.translations().codeGeneration);
  readonly theme = computed(() => this.translations().theme);
  readonly items = computed(() => this.translations().items);
  readonly hints = computed(() => this.translations().hints);
  readonly contentView = computed(() => this.translations().contentView);

  setLocale(locale: SupportedLocale) {
    this.ateI18nService.setLocale(locale);
  }

  generateDemoContent(): string {
    const content = this.demoContent();

    return `
<h1>${content.title}</h1>
<p>${content.subtitle}</p>

<h2>${content.shortcutsTitle}</h2>
<ul>
  <li> ${content.slashCommand} • ${content.bubbleMenu}</li>
  <li><code>${content.boldShortcut}</code> • <code>${content.italicShortcut}</code></li>
</ul>

<h2>${content.basicFeaturesTitle}</h2>
<ul>
  <li><strong>${content.boldText}</strong>, <em>${content.italicText}</em>, <u>${content.underlineText}</u>, <s>${content.strikeText}</s>, <code>${content.codeText}</code></li>
</ul>

<blockquote><p><em>${content.quote}</em></p></blockquote>

<h2>${content.multimediaTitle}</h2>
<img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop" class="tiptap-image" alt="Sample image">
<p><em>${content.imageCaption}</em></p>

<h2>${content.tablesTitle}</h2>
<p>${content.tablesIntro}</p>
<table>
  <tr>
    <th>${content.tableHeaders.name}</th>
    <th>${content.tableHeaders.age}</th>
    <th>${content.tableHeaders.city}</th>
    <th>${content.tableHeaders.profession}</th>
    <th>${content.tableHeaders.email}</th>
    <th>${content.tableHeaders.phone}</th>
  </tr>
  <tr>
    <td>Alice P.</td>
    <td>28</td>
    <td>Paris</td>
    <td>Développeuse</td>
    <td>alice@flogeez.fr</td>
    <td>01 23 45 67 89</td>
  </tr>
  <tr>
    <td>Bob D.</td>
    <td>35</td>
    <td>Lyon</td>
    <td>Designer</td>
    <td>bob@flogeez.fr</td>
    <td>04 56 78 90 12</td>
  </tr>
  <tr>
    <td>Flo E.</td>
    <td>33</td>
    <td>Rennes</td>
    <td>Développeur</td>
    <td>flo@flogeez.fr</td>
    <td>04 91 23 45 67</td>
  </tr>
</table>
<p><em>${content.tablesTryText}</em></p>

<h2>${content.listsTitle}</h2>
<ul><li>${content.firstItem}</li></ul>
<ol><li>${content.secondItem}</li><li>${content.thirdItem} <a href="https://tiptap.dev" target="_blank">Tiptap</a></li></ol>

<h2>${content.customizationTitle}</h2>
<ul>
  <li>${content.customizationItems.toolbar}</li>
  <li>${content.customizationItems.aiAssistant} ✨</li>
</ul>

<h3>${content.reactiveFormsTitle}</h3>
<p>${content.reactiveFormsIntro}</p>
<pre><code>// ${content.componentComment}
simpleControl = new FormControl('', [Validators.required]);

// ${content.templateComment}
&lt;angular-tiptap-editor [formControl]="simpleControl" /&gt;</code></pre>

<h3>${content.imageUploadTitle}</h3>
<p>${content.imageUploadIntro}</p>
<pre><code>private http = inject(HttpClient);

uploadHandler: ImageUploadHandler = (ctx) =&gt; {
  const formData = new FormData();
  formData.append('image', ctx.file);

  return this.http.post&lt;{ url: string }&gt;('/api/upload', formData).pipe(
    map(res =&gt; ({ src: res.url }))
  );
};

// Template
&lt;angular-tiptap-editor [imageUploadHandler]="uploadHandler" /&gt;</code></pre>

<h2>${content.makeItYourOwnTitle}</h2>
<p>${content.makeItYourOwnIntro}</p>

<p style="text-align: right;">
  <strong>${content.conclusion}</strong><br>
</p>

<p style="text-align: center;">
    <a href="https://github.com/FloGeez/angular-tiptap-editor" target="_blank">${this.ui().github}</a> • 
    <a href="https://www.npmjs.com/package/@flogeez/angular-tiptap-editor" target="_blank">${this.ui().npm}</a>
</p>
`.trim();
  }
}
