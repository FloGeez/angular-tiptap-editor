# Security Policy

## Reporting a vulnerability

Please do not report security issues in public issues or pull requests.

Report them privately through GitHub instead: open the [Security tab](https://github.com/FloGeez/angular-tiptap-editor/security) of the repository and click **Report a vulnerability**. The report is only visible to you and the maintainer until a fix is released.

Please include:

- the library version, and the Angular and Tiptap versions;
- what an attacker can do (for example inject CSS or HTML, run a script, read data);
- the steps or the content that trigger it, ideally a minimal reproduction.

The fix is worked on in a private fork when needed, released, and then the advisory is published with credit to the reporter.

## Supported versions

Fixes are released on the latest minor version of the current major (`3.x`). Update to the latest release to get them.

Some issues come from Tiptap or ProseMirror themselves. When a fix lands upstream, the library raises its minimum required version, as it did for Tiptap 3.31.4 in 3.8.0.
