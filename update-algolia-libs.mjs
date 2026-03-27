#!/usr/bin/env node
/**
 * Updates Algolia vendor files in scripts/ to their latest stable versions.
 *
 * Packages updated:
 *   algoliasearch@4            -> scripts/lib-algoliasearch.js
 *   instantsearch.js@4 + chat  -> scripts/lib-instantsearch.js  (esbuild bundle)
 *   @algolia/autocomplete-js   -> scripts/lib-autocomplete.js
 *   @algolia/autocomplete-plugin-query-suggestions -> scripts/lib-autocomplete-plugin-query-suggestions.js
 *   @algolia/autocomplete-plugin-recent-searches   -> scripts/lib-autocomplete-plugin-recent-searches.js
 *
 * The instantsearch.js bundle is built from ES modules using esbuild so that
 * the chat widget (not included in the official UMD build) is available as
 * instantsearch.widgets.chat on the window global.
 */

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const SCRIPTS_DIR = join(ROOT, 'scripts');

// Libraries that are copied directly from their npm UMD dist files
const COPY_LIBRARIES = [
  {
    package: 'algoliasearch@4',
    src: 'node_modules/algoliasearch/dist/algoliasearch-lite.umd.js',
    dest: 'lib-algoliasearch.js',
  },
  {
    package: '@algolia/autocomplete-js',
    src: 'node_modules/@algolia/autocomplete-js/dist/umd/index.production.js',
    dest: 'lib-autocomplete.js',
  },
  {
    package: '@algolia/autocomplete-plugin-query-suggestions',
    src: 'node_modules/@algolia/autocomplete-plugin-query-suggestions/dist/umd/index.production.js',
    dest: 'lib-autocomplete-plugin-query-suggestions.js',
  },
  {
    package: '@algolia/autocomplete-plugin-recent-searches',
    src: 'node_modules/@algolia/autocomplete-plugin-recent-searches/dist/umd/index.production.js',
    dest: 'lib-autocomplete-plugin-recent-searches.js',
  },
];

const tempDir = join(tmpdir(), `algolia-update-${randomBytes(4).toString('hex')}`);

try {
  console.log('Creating temp directory…');
  mkdirSync(tempDir, { recursive: true });

  const allPackages = [
    ...COPY_LIBRARIES.map((l) => l.package),
    'instantsearch.js@4',
  ].join(' ');

  console.log(`Installing packages:\n  ${allPackages.replace(/ /g, '\n  ')}\n`);
  execSync(
    `npm install --prefix "${tempDir}" ${allPackages} --no-save --legacy-peer-deps`,
    { stdio: 'inherit' },
  );

  // --- Copy plain UMD files ---
  console.log('\nCopying UMD files to scripts/:');
  for (const lib of COPY_LIBRARIES) {
    const srcPath = join(tempDir, lib.src);
    const destPath = join(SCRIPTS_DIR, lib.dest);
    copyFileSync(srcPath, destPath);
    console.log(`  ✓  ${lib.dest}`);
  }

  // --- Build instantsearch + chat widget with esbuild ---
  console.log('\nBuilding lib-instantsearch.js (instantsearch + chat widget)…');

  // Resolve the installed version for the banner comment
  const isPkg = JSON.parse(
    readFileSync(join(tempDir, 'node_modules/instantsearch.js/package.json'), 'utf8'),
  );

  const entryFile = join(tempDir, '_is-entry.mjs');
  writeFileSync(
    entryFile,
    `
import instantsearchFn from 'instantsearch.js';
import * as widgets from 'instantsearch.js/es/widgets/index.js';
import * as connectors from 'instantsearch.js/es/connectors/index.js';
import chat from 'instantsearch.js/es/widgets/chat/chat.js';

const widgetsWithChat = { ...widgets, chat };

// The ES module build defines non-configurable, error-throwing getters for
// .widgets and .connectors. Use a Proxy to intercept those property accesses
// and return the real namespaces without touching the original object.
const instantsearch = new Proxy(instantsearchFn, {
  get(target, prop) {
    if (prop === 'widgets') return widgetsWithChat;
    if (prop === 'connectors') return connectors;
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

if (typeof window !== 'undefined') {
  window.instantsearch = instantsearch;
}
`,
  );

  await build({
    entryPoints: [entryFile],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile: join(SCRIPTS_DIR, 'lib-instantsearch.js'),
    platform: 'browser',
    banner: {
      js: `/*! InstantSearch.js ${isPkg.version} + chat widget | © Algolia, Inc. and contributors; MIT License | https://github.com/algolia/instantsearch */`,
    },
    nodePaths: [join(tempDir, 'node_modules')],
  });

  console.log('  ✓  lib-instantsearch.js');
  console.log('\nDone.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
