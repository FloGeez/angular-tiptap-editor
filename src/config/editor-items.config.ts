import { ConfigItem } from "../types/editor-config.types";

// Factory functions to create items with translations
export function createToolbarItems(itemLabels: Record<string, string>): ConfigItem[] {
  return [
    { key: "bold", label: itemLabels["bold"], icon: "format_bold" },
    { key: "italic", label: itemLabels["italic"], icon: "format_italic" },
    {
      key: "underline",
      label: itemLabels["underline"],
      icon: "format_underlined",
    },
    {
      key: "strike",
      label: itemLabels["strike"],
      icon: "format_strikethrough",
    },
    { key: "code", label: itemLabels["code"], icon: "code" },
    {
      key: "superscript",
      label: itemLabels["superscript"],
      icon: "superscript",
    },
    { key: "subscript", label: itemLabels["subscript"], icon: "subscript" },
    { key: "highlight", label: itemLabels["highlight"], icon: "highlight" },
    { key: "highlightPicker", label: itemLabels["highlightPicker"], icon: "format_color_fill" },
    { key: "textColor", label: itemLabels["textColor"], icon: "format_color_text" },
    { key: "heading1", label: itemLabels["heading1"], icon: "title" },
    { key: "heading2", label: itemLabels["heading2"], icon: "title" },
    { key: "heading3", label: itemLabels["heading3"], icon: "title" },
    {
      key: "bulletList",
      label: itemLabels["bulletList"],
      icon: "format_list_bulleted",
    },
    {
      key: "orderedList",
      label: itemLabels["orderedList"],
      icon: "format_list_numbered",
    },
    {
      key: "blockquote",
      label: itemLabels["blockquote"],
      icon: "format_quote",
    },
    {
      key: "alignLeft",
      label: itemLabels["alignLeft"],
      icon: "format_align_left",
    },
    {
      key: "alignCenter",
      label: itemLabels["alignCenter"],
      icon: "format_align_center",
    },
    {
      key: "alignRight",
      label: itemLabels["alignRight"],
      icon: "format_align_right",
    },
    {
      key: "alignJustify",
      label: itemLabels["alignJustify"],
      icon: "format_align_justify",
    },
    { key: "link", label: itemLabels["link"], icon: "link" },
    { key: "image", label: itemLabels["image"], icon: "image" },
    {
      key: "horizontalRule",
      label: itemLabels["horizontalRule"],
      icon: "horizontal_rule",
    },
    { key: "table", label: itemLabels["table"], icon: "table_view" },
    { key: "undo", label: itemLabels["undo"], icon: "undo" },
    { key: "redo", label: itemLabels["redo"], icon: "redo" },
    { key: "clear", label: itemLabels["clear"], icon: "delete" },
    { key: "separator", label: itemLabels["separator"], icon: "more_vert" },
    { key: "custom_ai", label: itemLabels["customAi"], icon: "psychology" },
  ];
}

export function createBubbleMenuItems(itemLabels: Record<string, string>): ConfigItem[] {
  return [
    { key: "bold", label: itemLabels["bold"], icon: "format_bold" },
    { key: "italic", label: itemLabels["italic"], icon: "format_italic" },
    {
      key: "underline",
      label: itemLabels["underline"],
      icon: "format_underlined",
    },
    { key: "strike", label: itemLabels["strike"], icon: "format_strikethrough" },
    { key: "code", label: itemLabels["code"], icon: "code" },
    { key: "superscript", label: itemLabels["superscript"], icon: "superscript" },
    { key: "subscript", label: itemLabels["subscript"], icon: "subscript" },
    { key: "highlight", label: itemLabels["highlight"], icon: "highlight" },
    { key: "highlightPicker", label: itemLabels["highlightPicker"], icon: "format_color_fill" },
    { key: "textColor", label: itemLabels["textColor"], icon: "format_color_text" },
    { key: "link", label: itemLabels["link"], icon: "link" },
    { key: "separator", label: itemLabels["separator"], icon: "more_vert" },
    { key: "custom_ai", label: itemLabels["customAi"], icon: "psychology" },
  ];
}

export function createSlashCommandItems(itemLabels: Record<string, string>): ConfigItem[] {
  return [
    { key: "heading1", label: itemLabels["heading1"], icon: "format_h1" },
    { key: "heading2", label: itemLabels["heading2"], icon: "format_h2" },
    { key: "heading3", label: itemLabels["heading3"], icon: "format_h3" },
    {
      key: "bulletList",
      label: itemLabels["bulletList"],
      icon: "format_list_bulleted",
    },
    {
      key: "orderedList",
      label: itemLabels["orderedList"],
      icon: "format_list_numbered",
    },
    { key: "blockquote", label: itemLabels["blockquote"], icon: "format_quote" },
    { key: "code", label: itemLabels["code"], icon: "code" },
    { key: "image", label: itemLabels["image"], icon: "image" },
    {
      key: "horizontalRule",
      label: itemLabels["horizontalRule"],
      icon: "horizontal_rule",
    },
    { key: "table", label: itemLabels["table"], icon: "table_view" },
    { key: "tableOfContents", label: itemLabels["tableOfContents"], icon: "toc" },
    { key: "custom_magic", label: itemLabels["customMagic"], icon: "auto_awesome" },
    { key: "custom_ai_block", label: itemLabels["customAi"], icon: "psychology" },
    { key: "counter", label: itemLabels["counter"], icon: "pin" },
    { key: "warningBox", label: itemLabels["warningBox"], icon: "warning" },
  ];
}

// Fallback constants for backward compatibility
export const TOOLBAR_ITEMS: ConfigItem[] = [
  { key: "bold", label: "Gras", icon: "format_bold" },
  { key: "italic", label: "Italique", icon: "format_italic" },
  { key: "underline", label: "Souligné", icon: "format_underlined" },
  { key: "strike", label: "Barré", icon: "format_strikethrough" },
  { key: "code", label: "Code", icon: "code" },
  { key: "superscript", label: "Exposant", icon: "superscript" },
  { key: "subscript", label: "Indice", icon: "subscript" },
  { key: "highlight", label: "Surligner", icon: "highlight" },
  { key: "highlightPicker", label: "Couleur de fond", icon: "format_color_fill" },
  { key: "textColor", label: "Couleur du texte", icon: "format_color_text" },
  { key: "heading1", label: "Titre 1", icon: "title" },
  { key: "heading2", label: "Titre 2", icon: "title" },
  { key: "heading3", label: "Titre 3", icon: "title" },
  { key: "bulletList", label: "Liste à puces", icon: "format_list_bulleted" },
  {
    key: "orderedList",
    label: "Liste numérotée",
    icon: "format_list_numbered",
  },
  { key: "blockquote", label: "Citation", icon: "format_quote" },
  { key: "alignLeft", label: "Aligner à gauche", icon: "format_align_left" },
  { key: "alignCenter", label: "Centrer", icon: "format_align_center" },
  { key: "alignRight", label: "Aligner à droite", icon: "format_align_right" },
  { key: "alignJustify", label: "Justifier", icon: "format_align_justify" },
  { key: "link", label: "Lien", icon: "link" },
  { key: "image", label: "Image", icon: "image" },
  {
    key: "horizontalRule",
    label: "Ligne horizontale",
    icon: "horizontal_rule",
  },
  { key: "table", label: "Tableau", icon: "table_view" },
  { key: "undo", label: "Annuler", icon: "undo" },
  { key: "redo", label: "Refaire", icon: "redo" },
  { key: "separator", label: "Séparateur", icon: "more_vert" },
];

export const BUBBLE_MENU_ITEMS: ConfigItem[] = [
  { key: "bold", label: "Gras", icon: "format_bold" },
  { key: "italic", label: "Italique", icon: "format_italic" },
  { key: "underline", label: "Souligné", icon: "format_underlined" },
  { key: "strike", label: "Barré", icon: "format_strikethrough" },
  { key: "code", label: "Code", icon: "code" },
  { key: "superscript", label: "Exposant", icon: "superscript" },
  { key: "subscript", label: "Indice", icon: "subscript" },
  { key: "highlight", label: "Surligner", icon: "highlight" },
  { key: "highlightPicker", label: "Couleur de fond", icon: "format_color_fill" },
  { key: "textColor", label: "Couleur du texte", icon: "format_color_text" },
  { key: "link", label: "Lien", icon: "link" },
  { key: "separator", label: "Séparateur", icon: "more_vert" },
];

export const SLASH_COMMAND_ITEMS: ConfigItem[] = [
  { key: "heading1", label: "Titre 1", icon: "format_h1" },
  { key: "heading2", label: "Titre 2", icon: "format_h2" },
  { key: "heading3", label: "Titre 3", icon: "format_h3" },
  { key: "bulletList", label: "Liste à puces", icon: "format_list_bulleted" },
  {
    key: "orderedList",
    label: "Liste numérotée",
    icon: "format_list_numbered",
  },
  { key: "blockquote", label: "Citation", icon: "format_quote" },
  { key: "code", label: "Code", icon: "code" },
  { key: "image", label: "Image", icon: "image" },
  {
    key: "horizontalRule",
    label: "Ligne horizontale",
    icon: "horizontal_rule",
  },
  { key: "table", label: "Tableau", icon: "table_view" },
];

export const HEIGHT_ITEMS: ConfigItem[] = [
  { key: "fixedHeight", label: "Hauteur fixe", icon: "height" },
  { key: "maxHeight", label: "Hauteur maximale", icon: "vertical_align_top" },
];

export const DEFAULT_DEMO_CONTENT = `
<h1>Guide Complet de l'Éditeur Tiptap</h1>
<p>Découvrez toutes les fonctionnalités de cet éditeur de texte <strong>moderne</strong> et <em>puissant</em> pour Angular.</p>

<h2>Fonctionnalités de Base</h2>
<p>L'éditeur supporte une large gamme de formatages :</p>
<ul>
  <li><strong>Texte en gras</strong> pour mettre en évidence</li>
  <li><em>Texte en italique</em> pour l'emphase</li>
  <li><u>Texte souligné</u> pour l'importance</li>
  <li><s>Texte barré</s> pour les corrections</li>
  <li><code>Code inline</code> pour les extraits techniques</li>
  <li><mark style="background-color: #ffff00">Texte surligné</mark> pour attirer l'attention</li>
</ul>

<h2>Listes et Organisation</h2>
<p>Créez des listes ordonnées et non ordonnées :</p>
<ol>
  <li>Premier élément important</li>
  <li>Deuxième élément avec <strong>formatage</strong></li>
  <li>Troisième élément avec <a href="https://tiptap.dev">lien vers Tiptap</a></li>
</ol>

<blockquote>
  <p>Les citations permettent de mettre en valeur des passages importants ou des témoignages clients.</p>
</blockquote>

<h2>Contenu Multimédia</h2>
<p>Intégrez facilement des images dans vos contenus :</p>
<img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop" class="tiptap-image" alt="Paysage montagneux avec lac">
<p><em>Cliquez sur l'image ci-dessus pour accéder au menu contextuel et la redimensionner.</em></p>

<h2>Commandes Rapides</h2>
<p>Utilisez les raccourcis pour une édition efficace :</p>
<ul>
  <li>Tapez <strong>/</strong> pour ouvrir le menu des slash commands</li>
  <li>Sélectionnez du texte pour voir apparaître le bubble menu</li>
  <li>Utilisez <strong>Ctrl+B</strong> pour mettre en gras</li>
  <li>Utilisez <strong>Ctrl+I</strong> pour mettre en italique</li>
</ul>

<h2>Tables et Données</h2>
<p>Créez des tableaux pour organiser vos données :</p>
<table>
  <thead>
    <tr>
      <th>Fonctionnalité</th>
      <th>Description</th>
      <th>Statut</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Tables redimensionnables</td>
      <td>Redimensionnez les colonnes en glissant</td>
      <td>✅ Disponible</td>
    </tr>
    <tr>
      <td>En-têtes de colonnes</td>
      <td>Convertissez les cellules en en-têtes</td>
      <td>✅ Disponible</td>
    </tr>
    <tr>
      <td>Fusion de cellules</td>
      <td>Combinez plusieurs cellules</td>
      <td>✅ Disponible</td>
    </tr>
  </tbody>
</table>

<hr>

<h3>Personnalisation</h3>
<p>Utilisez le panneau de droite pour :</p>
<ul>
  <li>Activer/désactiver la toolbar</li>
  <li>Personnaliser les boutons disponibles</li>
  <li>Configurer le bubble menu</li>
  <li>Activer les slash commands</li>
</ul>

<p>Cet éditeur est parfait pour créer du contenu riche et interactif ! 🚀</p>
`;
