import { Component, input } from "@angular/core";

@Component({
  selector: "app-code-view",
  standalone: true,
  imports: [],
  template: `
    <div class="code-view">
      <pre class="code-block"><code>{{ code() }}</code></pre>
    </div>
  `,
  styles: [
    `
      .code-view {
        width: 100%;
        height: 100%;
        padding: 0.75rem 1.25rem;
        box-sizing: border-box;
      }

      .code-block {
        margin: 0;
        font-family: "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace;
        font-size: 13px;
        line-height: 1.7;
        color: #94a3b8;
        white-space: pre-wrap;
        word-break: break-all;
      }

      .code-block code {
        font-family: inherit;
        color: inherit;
      }
    `,
  ],
})
export class CodeViewComponent {
  code = input<string>("");
}
