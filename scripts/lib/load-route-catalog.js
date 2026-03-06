const fs = require('node:fs');
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

function loadRouteCatalogModule() {
  const source = fs.readFileSync(routeCatalogPath, 'utf8');
  const ts = loadTypeScript();
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: routeCatalogPath,
  });

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(routeCatalogPath),
    __filename: routeCatalogPath,
    console,
    process,
  };

  vm.runInNewContext(transpiled.outputText, sandbox, { filename: routeCatalogPath });
  return module.exports;
}

module.exports = {
  repoRoot,
  routeCatalogPath,
  loadRouteCatalogModule,
};
