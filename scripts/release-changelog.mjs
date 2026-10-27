import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const changesDir = join(root, "changes");
const changelogFile = join(root, "CHANGELOG.md");

const SECTIONS = [
  ["security", "Security"],
  ["added", "Added"],
  ["changed", "Changed"],
  ["fixed", "Fixed"],
];
const FRAGMENT_NAME = /^(added|changed|fixed|security)\.([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const PR_SUFFIX = /\(#(\d+)\)\s*$/;

const USAGE = `Usage: npm run release:changelog -- <version> [--dry-run] [--date YYYY-MM-DD]

Turns the fragments in changes/ into a "## [<version>] - <date>" section of CHANGELOG.md,
then deletes them. --dry-run prints the section and the fragments it would consume.`;

const fail = message => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const parseArgs = argv => {
  const options = { dryRun: false, version: undefined, date: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--date") options.date = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (arg.startsWith("-")) fail(`unknown option ${arg}\n\n${USAGE}`);
    else if (options.version === undefined) options.version = arg;
    else fail(`unexpected argument ${arg}\n\n${USAGE}`);
  }
  return options;
};

const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

const addedBy = file => {
  const log = git(["log", "--diff-filter=A", "--format=%ct%x09%s", "--", `changes/${file}`]);
  const lines = log ? log.split("\n") : [];
  const [timestamp, ...subject] = (lines.at(-1) ?? "").split("\t");
  return {
    timestamp: timestamp ? Number(timestamp) : Number.MAX_SAFE_INTEGER,
    pr: subject.join("\t").match(PR_SUFFIX)?.[1],
  };
};

const readFragments = () => {
  if (!existsSync(changesDir)) return [];
  const fragments = [];
  for (const file of readdirSync(changesDir).sort()) {
    if (file === "README.md" || file.startsWith(".")) continue;
    const match = file.match(FRAGMENT_NAME);
    if (!match) {
      fail(`changes/${file} does not match <added|changed|fixed|security>.<slug>.md`);
    }
    const text = readFileSync(join(changesDir, file), "utf8")
      .trim()
      .replace(/\s*\n\s*/g, " ");
    if (!text) fail(`changes/${file} is empty`);
    fragments.push({ file, type: match[1], text, ...addedBy(file) });
  }
  return fragments;
};

const renderBullet = ({ text, pr }) => `- ${text}${pr ? ` (#${pr})` : ""}`;

const renderSection = (version, date, fragments) => {
  const blocks = [`## [${version}] - ${date}`];
  for (const [type, title] of SECTIONS) {
    const bullets = fragments
      .filter(fragment => fragment.type === type)
      .sort((a, b) => a.timestamp - b.timestamp || a.file.localeCompare(b.file))
      .map(renderBullet);
    if (bullets.length) blocks.push(`### ${title}\n\n${bullets.join("\n")}`);
  }
  return `${blocks.join("\n\n")}\n`;
};

const insertSection = (changelog, version, section) => {
  if (/^## \[Unreleased\]/m.test(changelog)) {
    fail("CHANGELOG.md has an [Unreleased] section; move its entries into changes/ first");
  }
  if (changelog.includes(`## [${version}]`)) fail(`CHANGELOG.md already has version ${version}`);
  const firstRelease = changelog.search(/^## \[/m);
  if (firstRelease === -1) return `${changelog.trimEnd()}\n\n${section}`;
  return `${changelog.slice(0, firstRelease)}${section}\n${changelog.slice(firstRelease)}`;
};

const main = () => {
  const {
    dryRun,
    version,
    date = new Date().toISOString().slice(0, 10),
  } = parseArgs(process.argv.slice(2));
  if (!version || !VERSION.test(version)) fail(`pass the version as x.y.z\n\n${USAGE}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`invalid --date ${date}, expected YYYY-MM-DD`);

  const fragments = readFragments();
  if (!fragments.length) fail("no fragments in changes/");

  for (const { file, pr } of fragments) {
    if (!pr) {
      console.warn(`Warning: changes/${file} was not added by a commit ending in "(#<number>)"`);
    }
  }

  const section = renderSection(version, date, fragments);
  const updated = insertSection(readFileSync(changelogFile, "utf8"), version, section);

  if (dryRun) {
    console.log(section);
    console.log(
      `Dry run: CHANGELOG.md untouched, ${fragments.length} fragment(s) would be deleted:`
    );
    for (const { file } of fragments) console.log(`  changes/${file}`);
    return;
  }

  writeFileSync(changelogFile, updated);
  for (const { file } of fragments) unlinkSync(join(changesDir, file));
  console.log(`Added ${version} to CHANGELOG.md and deleted ${fragments.length} fragment(s).`);
};

main();
