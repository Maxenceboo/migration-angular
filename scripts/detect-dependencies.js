#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Standard HTML & SVG tags to ignore
const STANDARD_HTML_TAGS = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote',
  'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist',
  'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption',
  'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr',
  'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map',
  'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output',
  'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'search',
  'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg',
  'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track',
  'u', 'ul', 'var', 'video', 'wbr',
  // SVG common tags
  'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'g', 'text', 'defs', 'use', 'symbol', 'clippath',
  // Angular built-in tags
  'ng-container', 'ng-template', 'ng-content', 'router-outlet'
]);

/**
 * Find project root (looking for angular.json or package.json upwards)
 */
function findProjectRoot(startPath) {
  let current = path.resolve(startPath);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'angular.json')) || fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return path.resolve(startPath);
}

/**
 * Recursively find files matching extensions
 */
function findFiles(dir, extensions, ignoreDirs = ['node_modules', '.git', 'dist', '.angular', '.vscode']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFiles(fullPath, extensions, ignoreDirs));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Find relative path starting from src/app/ or src/
 */
function getAppRelativePath(fullPath, rootDir) {
  const normalizedFull = path.resolve(fullPath).replace(/\\/g, '/');
  const normalizedRoot = path.resolve(rootDir).replace(/\\/g, '/');
  
  const srcAppIdx = normalizedFull.indexOf('/src/app/');
  if (srcAppIdx !== -1) {
    return normalizedFull.substring(srcAppIdx + 1);
  }
  
  const srcIdx = normalizedFull.indexOf('/src/');
  if (srcIdx !== -1) {
    return normalizedFull.substring(srcIdx + 1);
  }

  return path.relative(normalizedRoot, normalizedFull).replace(/\\/g, '/');
}

/**
 * Extract metadata and artifact type (component, service, pipe, directive, guard, model, util)
 */
function extractArtifactMetadata(tsFilePath) {
  const content = fs.readFileSync(tsFilePath, 'utf-8');
  const baseName = path.basename(tsFilePath);

  let artifactType = 'typescript';
  if (baseName.endsWith('.component.ts') || content.includes('@Component(')) {
    artifactType = 'component';
  } else if (baseName.endsWith('.service.ts') || content.includes('@Injectable(')) {
    artifactType = 'service';
  } else if (baseName.endsWith('.pipe.ts') || content.includes('@Pipe(')) {
    artifactType = 'pipe';
  } else if (baseName.endsWith('.directive.ts') || content.includes('@Directive(')) {
    artifactType = 'directive';
  } else if (baseName.endsWith('.guard.ts') || content.includes('CanActivate') || content.includes('CanDeactivate')) {
    artifactType = 'guard';
  } else if (baseName.endsWith('.interceptor.ts') || content.includes('HttpInterceptor')) {
    artifactType = 'interceptor';
  } else if (baseName.endsWith('.model.ts') || baseName.endsWith('.interface.ts') || baseName.endsWith('.types.ts')) {
    artifactType = 'model';
  }

  // Component specifics
  const selectorMatch = content.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/);
  const selector = selectorMatch ? selectorMatch[1].trim() : null;

  const classMatch = content.match(/export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/) ||
                     content.match(/export\s+(?:interface|type|const|function|enum)\s+([A-Za-z0-9_]+)/);
  const entityName = classMatch ? classMatch[1].trim() : path.basename(tsFilePath, path.extname(tsFilePath));

  let templateContent = '';
  let templatePath = null;

  if (artifactType === 'component') {
    const templateMatch = content.match(/templateUrl\s*:\s*['"`]([^'"`]+)['"`]/);
    if (templateMatch) {
      const templateRel = templateMatch[1].trim();
      templatePath = path.resolve(path.dirname(tsFilePath), templateRel);
      if (fs.existsSync(templatePath)) {
        templateContent = fs.readFileSync(templatePath, 'utf-8');
      }
    } else {
      const inlineMatch = content.match(/template\s*:\s*`([^`]*)`/s) || content.match(/template\s*:\s*['"]([^'"]*)['"]/);
      if (inlineMatch) {
        templateContent = inlineMatch[1];
      }
    }
  }

  return {
    artifactType,
    isComponent: artifactType === 'component',
    selector,
    entityName,
    content,
    templateContent,
    templatePath
  };
}

/**
 * Scan HTML template for custom tags (potential child components)
 */
function extractCustomTagsFromTemplate(htmlContent) {
  const tagRegex = /<([a-z0-9]+(?:-[a-z0-9]+)+)/gi;
  const tags = new Set();
  let match;
  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const tag = match[1].toLowerCase();
    if (!STANDARD_HTML_TAGS.has(tag)) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

/**
 * Parse local import paths from TS content
 */
function extractLocalImports(tsFilePath, tsContent, legacyRoot) {
  const importRegex = /import\s+(?:(?:(?:[A-Za-z0-9_,\s{}*]+)\s+from\s+)?['"`]([^'"`]+)['"`]|['"`]([^'"`]+)['"`])/g;
  const localImports = [];
  let match;

  while ((match = importRegex.exec(tsContent)) !== null) {
    const importStr = match[1] || match[2];
    if (!importStr) continue;

    // Filter out third party libraries
    if (importStr.startsWith('@angular/') || importStr === 'rxjs' || importStr.startsWith('rxjs/') || importStr.startsWith('zone.js')) {
      continue;
    }

    let resolvedLegacyPath = null;
    const fileDir = path.dirname(tsFilePath);

    if (importStr.startsWith('.')) {
      // Relative import: resolve directly
      const candidateBase = path.resolve(fileDir, importStr);
      resolvedLegacyPath = resolveTsExtension(candidateBase);
    } else if (importStr.startsWith('@') || importStr.startsWith('src/')) {
      // Possible path alias (e.g. @shared/..., @app/...)
      // Try resolving directly under src/ or src/app/
      const cleanAlias = importStr.replace(/^@[^/]+\//, '');
      const candidates = [
        path.resolve(legacyRoot, 'src', 'app', cleanAlias),
        path.resolve(legacyRoot, 'src', cleanAlias),
        path.resolve(legacyRoot, importStr)
      ];
      for (const cand of candidates) {
        const found = resolveTsExtension(cand);
        if (found) {
          resolvedLegacyPath = found;
          break;
        }
      }
    }

    if (resolvedLegacyPath && fs.existsSync(resolvedLegacyPath)) {
      // Do not include the component's own files or spec files
      if (path.resolve(resolvedLegacyPath) !== path.resolve(tsFilePath) && !resolvedLegacyPath.endsWith('.spec.ts')) {
        localImports.push({
          rawImport: importStr,
          legacyAbsolutePath: resolvedLegacyPath,
          relativeAppPath: getAppRelativePath(resolvedLegacyPath, legacyRoot)
        });
      }
    }
  }

  return localImports;
}

function resolveTsExtension(basePath) {
  const extensions = ['.ts', '.d.ts', '/index.ts'];
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  for (const ext of extensions) {
    const full = basePath + ext;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  return null;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  let sourcePath = null;
  let targetRoot = process.cwd();
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Usage: node detect-dependencies.js <absolute-path-to-component> [--target <target-dir>] [--json]`);
      process.exit(0);
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (args[i] === '--source' || args[i] === '-s') {
      sourcePath = args[++i];
    } else if (args[i] === '--target' || args[i] === '-t') {
      targetRoot = args[++i];
    } else if (!sourcePath && !args[i].startsWith('-')) {
      sourcePath = args[i];
    }
  }

  if (!sourcePath) {
    console.error(JSON.stringify({ error: 'Source component path is required.' }));
    process.exit(1);
  }

  sourcePath = path.resolve(sourcePath);
  if (!fs.existsSync(sourcePath)) {
    console.error(JSON.stringify({ error: `Source path does not exist: ${sourcePath}` }));
    process.exit(1);
  }

  let targetTsPath = sourcePath;
  if (fs.statSync(sourcePath).isDirectory()) {
    const tsFiles = fs.readdirSync(sourcePath).filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
    if (tsFiles.length === 0) {
      console.error(JSON.stringify({ error: `No *.ts found in directory: ${sourcePath}` }));
      process.exit(1);
    }
    const compFile = tsFiles.find(f => f.endsWith('.component.ts'));
    targetTsPath = path.join(sourcePath, compFile || tsFiles[0]);
  }

  const legacyRoot = findProjectRoot(path.dirname(targetTsPath));
  const meta = extractArtifactMetadata(targetTsPath);
  const relativeSourcePath = getAppRelativePath(targetTsPath, legacyRoot);
  const componentDirRelative = path.dirname(relativeSourcePath);

  // 1. Scan template for custom child tags ONLY if component
  const children = [];
  if (meta.isComponent) {
    const customTags = extractCustomTagsFromTemplate(meta.templateContent);
    const allLegacyTs = findFiles(legacyRoot, ['.component.ts']);

    for (const tag of customTags) {
      let foundChild = null;
      for (const tsFile of allLegacyTs) {
        if (path.resolve(tsFile) === path.resolve(targetTsPath)) continue;
        const fileContent = fs.readFileSync(tsFile, 'utf-8');
        const tagMatch = fileContent.match(new RegExp(`selector\\s*:\\s*['"\`]${tag}['"\`]`));
        if (tagMatch) {
          const childClassMatch = fileContent.match(/export\s+class\s+([A-Za-z0-9_]+)/);
          const childRelPath = getAppRelativePath(tsFile, legacyRoot);
          const expectedTargetPath = path.join(targetRoot, childRelPath);
          let migrated = fs.existsSync(expectedTargetPath);
          let actualTargetFile = migrated ? childRelPath : null;

          // Fallback: search targetRoot if component was relocated in the new architecture
          if (!migrated) {
            const allTargetTs = findFiles(targetRoot, ['.component.ts']);
            for (const tTs of allTargetTs) {
              try {
                const tContent = fs.readFileSync(tTs, 'utf-8');
                if (tContent.match(new RegExp(`selector\\s*:\\s*['"\`]${tag}['"\`]`))) {
                  migrated = true;
                  actualTargetFile = path.relative(targetRoot, tTs).replace(/\\/g, '/');
                  break;
                }
              } catch (_) {}
            }
          }

          foundChild = {
            selector: tag,
            className: childClassMatch ? childClassMatch[1] : tag,
            legacyFile: childRelPath,
            targetExpectedFile: actualTargetFile || childRelPath,
            migrated: migrated,
            isExternal: false
          };
          break;
        }
      }

      if (foundChild) {
        children.push(foundChild);
      } else {
        // Tag was not found in legacy project components (might be 3rd party like <mat-icon>, <p-table>, etc.)
        children.push({
          selector: tag,
          className: tag,
          legacyFile: null,
          targetExpectedFile: null,
          migrated: true, // External library components do not block local migration
          isExternal: true
        });
      }
    }
  }

  // 2. Scan TS for local imports (services, models, directives, pipes, utils)
  const rawLocalImports = extractLocalImports(targetTsPath, meta.content, legacyRoot);
  const localImports = [];
  const seenImports = new Set();

  for (const imp of rawLocalImports) {
    if (seenImports.has(imp.relativeAppPath)) continue;
    seenImports.add(imp.relativeAppPath);

    const candidateBase = path.join(targetRoot, imp.relativeAppPath.replace(/\.(ts|d\.ts)$/, ''));
    const resolvedInTarget = resolveTsExtension(candidateBase) || (fs.existsSync(path.join(targetRoot, imp.relativeAppPath)) ? path.join(targetRoot, imp.relativeAppPath) : null);
    const migrated = Boolean(resolvedInTarget);

    localImports.push({
      rawImport: imp.rawImport,
      legacyFile: imp.relativeAppPath,
      targetExpectedFile: imp.relativeAppPath,
      migrated: migrated
    });
  }

  const unmigratedChildren = children.filter(c => !c.migrated && !c.isExternal);
  const unmigratedImports = localImports.filter(i => !i.migrated);
  const totalUnmigrated = unmigratedChildren.length + unmigratedImports.length;
  const canMigrate = totalUnmigrated === 0;

  const result = {
    source: {
      absolutePath: targetTsPath,
      legacyRoot: legacyRoot,
      relativeAppPath: relativeSourcePath,
      componentDirRelative: componentDirRelative,
      artifactType: meta.artifactType,
      isComponent: meta.isComponent,
      selector: meta.selector,
      entityName: meta.entityName
    },
    target: {
      targetRoot: path.resolve(targetRoot),
      targetExpectedPath: path.join(targetRoot, relativeSourcePath).replace(/\\/g, '/'),
      alreadyExists: fs.existsSync(path.resolve(targetRoot, relativeSourcePath))
    },
    children: children,
    localImports: localImports,
    unmigratedChildren: unmigratedChildren,
    unmigratedImports: unmigratedImports,
    totalUnmigrated: totalUnmigrated,
    canMigrate: canMigrate
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\n================ DEPENDENCIES ANALYSIS (BOTTOM-UP) ================`);
  console.log(`Artifact Type    : ${meta.artifactType.toUpperCase()} ${meta.isComponent ? `(<${meta.selector}>)` : ''}`);
  console.log(`Entity Name      : ${meta.entityName}`);
  console.log(`Relative Path    : ${relativeSourcePath}`);
  console.log(`Already in Target: ${result.target.alreadyExists ? 'YES (Warning: already exists)' : 'NO'}`);
  if (meta.isComponent) {
    console.log(`Child Components : ${children.length} (${unmigratedChildren.length} unmigrated)`);
  } else {
    console.log(`Child Components : N/A (Not a component - skipped)`);
  }
  console.log(`Local Imports    : ${localImports.length} (${unmigratedImports.length} unmigrated)`);
  console.log(`Can Migrate Now  : ${canMigrate ? 'YES ✅' : 'NO ❌ (Missing dependencies)'}`);

  if (meta.isComponent && children.length > 0) {
    console.log(`\nChild Components (<app-...>):`);
    children.forEach((c, idx) => {
      if (c.isExternal) {
        console.log(`  ${idx + 1}. [📦 EXTERNAL/UI LIB] <${c.selector}>`);
      } else {
        const status = c.migrated ? '✅ MIGRATED' : '❌ NOT MIGRATED';
        console.log(`  ${idx + 1}. [${status}] ${c.className} (<${c.selector}>)`);
        console.log(`     Legacy: ${c.legacyFile}`);
      }
    });
  }

  if (localImports.length > 0) {
    console.log(`\nLocal Imports (Services, Models, Pipes, Utils):`);
    localImports.forEach((i, idx) => {
      const status = i.migrated ? '✅ MIGRATED' : '❌ NOT MIGRATED';
      console.log(`  ${idx + 1}. [${status}] ${i.rawImport}`);
      console.log(`     Legacy: ${i.legacyFile}`);
    });
  } else {
    console.log(`\nLocal Imports    : None found`);
  }

  if (!canMigrate) {
    console.log(`\n⛔ ACTION REQUIRED: Migration is BLOCKED.`);
    console.log(`The following ${totalUnmigrated} dependency/dependencies MUST be migrated before this ${meta.artifactType}:`);
    unmigratedChildren.forEach(c => console.log(`  - [Child Component] ${c.className} (${c.legacyFile})`));
    unmigratedImports.forEach(i => console.log(`  - [Local Import]     ${i.rawImport} (${i.legacyFile})`));
  } else {
    console.log(`\n🎉 Ready to migrate this ${meta.artifactType}!`);
  }
  console.log(`===================================================================\n`);
}

main();
