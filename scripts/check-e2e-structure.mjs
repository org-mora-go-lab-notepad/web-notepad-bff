import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const errors = [];
const requirements = new Map();
let cases = 0;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

for (const document of walk(path.join(root, "tests-prd")).filter((file) =>
  file.endsWith(".md"),
)) {
  const relative = path.relative(path.join(root, "tests-prd"), document);
  const entries = [
    ...readFileSync(document, "utf8").matchAll(/^(\d+)\.\s+(.+)$/gm),
  ].map((match) => ({ number: Number(match[1]), title: match[2] }));
  const numbers = entries.map(({ number }) => number);
  if (
    !numbers.length ||
    numbers.length > 10 ||
    numbers.some((number, index) => number !== index + 1)
  ) {
    errors.push(
      `${relative}: requirements must be sequential and contain 1–10 entries`,
    );
  }
  for (const { number, title } of entries) {
    requirements.set(
      path.join(
        relative.slice(0, -3),
        `${String(number).padStart(2, "0")}.e2e.spec.ts`,
      ),
      `${number}. ${title}`,
    );
  }
}

const files = walk(path.join(root, "tests"));
for (const file of files.filter((file) => file.endsWith(".e2e.spec.ts"))) {
  const relative = path.relative(path.join(root, "tests"), file);
  const expectedTitle = requirements.get(relative);
  if (!expectedTitle) errors.push(`${relative}: no matching PRD requirement`);
  else requirements.delete(relative);
  const sourceText = readFileSync(file, "utf8");
  const lineCount =
    sourceText.split(/\r?\n/).length - (sourceText.endsWith("\n") ? 1 : 0);
  if (lineCount < 20)
    errors.push(
      `${relative}: expected at least 20 lines, received ${lineCount}`,
    );
  if (/\/\*\*\s*\n\s*\*\s*E2E 품질 계약/.test(sourceText))
    errors.push(`${relative}: repeated E2E quality contract comment`);
  if (
    /\b(?:expectEssentialResponsiveContract|run[A-Z][A-Za-z]+Case)\s*\(/.test(
      sourceText,
    )
  )
    errors.push(`${relative}: delegated case runners are not allowed`);
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const isTest = (node) =>
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "test";
  const topLevel = source.statements.filter(
    (node) => ts.isExpressionStatement(node) && isTest(node.expression),
  );
  const testCall = topLevel[0]?.expression;
  const title = testCall?.arguments[0];
  const expectedNumber = expectedTitle?.match(/^(\d+)\./)?.[1];
  if (
    expectedNumber &&
    (!title ||
      !ts.isStringLiteralLike(title) ||
      !title.text.startsWith(`${expectedNumber}. `) ||
      title.text.length <= `${expectedNumber}. `.length)
  )
    errors.push(
      `${relative}: test title must match its PRD requirement number`,
    );
  const callback = testCall?.arguments.at(-1);
  const onlyStatement =
    callback &&
    (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
    ts.isBlock(callback.body) &&
    callback.body.statements.length === 1
      ? callback.body.statements[0]
      : null;
  if (
    onlyStatement &&
    ts.isExpressionStatement(onlyStatement) &&
    ts.isAwaitExpression(onlyStatement.expression) &&
    ts.isCallExpression(onlyStatement.expression.expression)
  ) {
    const awaited = onlyStatement.expression.expression;
    const isStep =
      ts.isPropertyAccessExpression(awaited.expression) &&
      ts.isIdentifier(awaited.expression.expression) &&
      awaited.expression.expression.text === "test" &&
      awaited.expression.name.text === "step";
    if (!isStep)
      errors.push(
        `${relative}: test body must expose setup, action, and assertions directly`,
      );
  }
  let declarations = 0;
  const visit = (node) => {
    if (isTest(node)) declarations += 1;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (topLevel.length !== 1 || declarations !== 1)
    errors.push(`${relative}: expected one top-level test declaration`);
  cases += declarations;
}
for (const missing of requirements.keys())
  errors.push(`${missing}: PRD requirement has no test`);

const resourceDirectories = new Set();
for (const file of files) {
  let directory = path.dirname(file);
  while (directory !== path.join(root, "tests")) {
    if (
      path
        .relative(root, directory)
        .split(path.sep)
        .some((part) => /^__(fixture|util|mock|constant)__$/.test(part))
    )
      resourceDirectories.add(directory);
    directory = path.dirname(directory);
  }
}
for (const directory of resourceDirectories) {
  if (!files.includes(path.join(directory, "index.ts")))
    errors.push(`${path.relative(root, directory)}: missing resource barrel`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `PRD ↔ E2E structure valid: ${cases} cases, one test per file, all resource barrels present.`,
  );
}
