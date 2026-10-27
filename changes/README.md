# Change fragments

Every PR that changes what users see adds one file here instead of editing `CHANGELOG.md`, so concurrent PRs never conflict on it.

## Format

Name the file `<type>.<slug>.md`:

- `type` is one of `added`, `changed`, `fixed` or `security` (the `CHANGELOG.md` section it ends up in).
- `slug` is a short kebab-case name, for example `fixed.slash-command-race.md`.

The content is the bullet text: a bold title, then what changed and why it matters to users. Do not add the leading `- `, and do not add the PR number: the release script reads it from the `(#123)` that the squash merge appends to the commit that added the file.

```md
**Keys Typed Right After a Slash Command**: Picking a slash command removed the `/` text, then ran the command 10 ms later, so keys typed in between went to the wrong paragraph. The command now runs right away.
```

## Release (maintainer)

```bash
npm run release:changelog -- 3.10.0 --dry-run   # prints the section, writes nothing
npm run release:changelog -- 3.10.0             # writes it into CHANGELOG.md and deletes the fragments
```

`--date YYYY-MM-DD` overrides today's date. The script does not bump the version or commit.
