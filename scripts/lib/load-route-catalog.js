const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..');
const routeCatalogPath = path.join(repoRoot, 'frontend', 'src', 'routes', 'routeCatalog.ts');

function loadTypeScript() {
  const candidates = [
    path.join(repoRoot, 'frontend', 'node_modules', 'typescript', 'lib', 'typescript.js'),
    path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'typescript.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(candidate);
    }
  }

  throw new Error('Unable to locate TypeScript runtime for route catalog loading.');
}

function resolveLocalTypeScriptModule(baseFilePath, specifier) {
  const resolvedBase = path.resolve(path.dirname(baseFilePath), specifier);
  const candidates = [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    path.join(resolvedBase, 'index.ts'),
    path.join(resolvedBase, 'index.tsx'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function loadTranspiledTypeScriptModule(filePath, ts, cache) {
  if (cache.has(filePath)) {
    return cache.get(filePath).exports;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  cache.set(filePath, module);

  const nodeRequire = Module.createRequire(filePath);
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const localModulePath = resolveLocalTypeScriptModule(filePath, specifier);
      if (localModulePath) {
        return loadTranspiledTypeScriptModule(localModulePath, ts, cache);
      }
    }

    return nodeRequire(specifier);
  };

  const sandbox = {
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: path.dirname(filePath),
    __filename: filePath,
    console,
    process,
    URL,
    URLSearchParams,
  };

  vm.runInNewContext(transpiled.outputText, sandbox, { filename: filePath });
  return module.exports;
}

function loadRouteCatalogModule() {
  const ts = loadTypeScript();
  return loadTranspiledTypeScriptModule(routeCatalogPath, ts, new Map());
}

module.exports = {
  repoRoot,
  routeCatalogPath,
  loadRouteCatalogModule,
};
