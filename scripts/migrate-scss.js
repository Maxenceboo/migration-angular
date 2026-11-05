#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Modernize SCSS according to project conventions:
 * 1. Transform `@use '@org/design-system/assets/styles/_variables.scss' as vars`
 *    into `@use '@org/design-system/assets/styles/variables' as varsDs`
 * 2. Transform `@import "variables"` or `@import 'assets/styles/variables'`
 *    into `@use 'assets/styles/variables' as vars`
 * 3. Transform other `@import '...'` into `@use '...' as *`
 * 4. Rename variable prefixes if needed (vars.$ds- -> varsDs.$ds-)
 * 5. Strictly preserve all existing CSS classes and selectors
 */
function migrateScss(scssPath) {
  if (!fs.existsSync(scssPath)) {
    console.error(`SCSS file not found: ${scssPath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(scssPath, 'utf-8');
  let replacementsCount = 0;

  // 1. Transform design system import
  const dsImportRegex = /@use\s+['"]@org\/design-system\/assets\/styles\/_?variables(?:\.scss)?['"]\s+as\s+vars\s*;/g;
  if (dsImportRegex.test(content)) {
    content = content.replace(dsImportRegex, "@use '@org/design-system/assets/styles/variables' as varsDs;");
    replacementsCount++;
  }

  // 2. Transform variables import
  const varsImportRegex = /@import\s+['"](?:assets\/styles\/)?variables(?:\.scss)?['"]\s*;/g;
  if (varsImportRegex.test(content)) {
    content = content.replace(varsImportRegex, "@use 'assets/styles/variables' as vars;");
    replacementsCount++;
  }

  // 3. Transform any remaining @import '...' into @use '...' as *
  const genericImportRegex = /@import\s+(['"][^'"]+['"])\s*;/g;
  content = content.replace(genericImportRegex, (match, importPath) => {
    replacementsCount++;
    return `@use ${importPath} as *;`;
  });

  // 4. Update variable references: vars.$ds- -> varsDs.$ds- if varsDs is used
  if (content.includes('varsDs')) {
    content = content.replace(/vars\.(\$ds-[a-zA-Z0-9_-]+)/g, 'varsDs.$1');
  }

  fs.writeFileSync(scssPath, content, 'utf-8');
  console.log(`✅ SCSS migration complete: ${replacementsCount} transformation(s) applied to ${path.basename(scssPath)}`);
}

const targetFile = process.argv[2];
if (!targetFile || targetFile === '--help' || targetFile === '-h') {
  console.log('Usage: node migrate-scss.js <path-to-file.scss>');
  process.exit(0);
}

migrateScss(path.resolve(targetFile));
