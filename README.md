# Angular Schematics + Yarn PnP Bug

This repo re-creates a bug with using the schematics API from within a yarn pnp 
workspace.

The repo contains an Angular library (my-lib) within a yarn (berry) pnp workspace.  The library has a `schematics` entry point, with a single `ng-add`
schematic that installs the library dependency.  The unit test for this schematic
uses the `SchematicTestRunner`'s `runExternalSchematic` function to build a test
project to execute the tests within.  Calling `runExternalESchematic` within a pnp environment results in an error, due to the `collection.json` of the library
containing the schematic that you're trying to run being improperly constructed.

```bash
ENOTDIR: not a directory, lstat '/node_modules/@schematics/angular/collection.json/package.json'

      21005 |
      21006 | function makeError$1(code, message) {
    > 21007 |   return Object.assign(new Error(`${code}: ${message}`), { code });
            |                        ^
      21008 | }
      21009 | function EBUSY(message) {
      21010 |   return makeError$1(`EBUSY`, message);

      at makeError$1 (../../.pnp.cjs:21007:24)
      at ENOTDIR (../../.pnp.cjs:21025:10)
      at ZipFS.resolveFilename (../../.pnp.cjs:22607:15)
      at ZipFS.realpathSync (../../.pnp.cjs:22398:28)
      at ../../.pnp.cjs:23704:100
      at ../../.pnp.cjs:24200:60
      at ZipOpenFS.getZipSync (../../.pnp.cjs:24329:14)
      at ZipOpenFS.makeCallSync (../../.pnp.cjs:24200:17)
      at ZipOpenFS.realpathSync (../../.pnp.cjs:23696:17)
      at VirtualFS.realpathSync (../../.pnp.cjs:23446:26)
      at PosixFS.realpathSync (../../.pnp.cjs:23197:41)
      at NodePathFS.realpathSync (../../.pnp.cjs:23197:41)
      at maybeRealpathSync (../../.yarn/cache/resolve-patch-6d2631dc64-66cc788f13.zip/node_modules/resolve/lib/sync.js:52:16)
      at resolveSync (../../.yarn/cache/resolve-patch-6d2631dc64-66cc788f13.zip/node_modules/resolve/lib/sync.js:97:25)
      at NodeModulesTestEngineHost.resolve (../angular_devkit/schematics/tools/node-module-engine-host.ts:61:39)
      at NodeModulesTestEngineHost.resolve (../angular_devkit/schematics/tools/node-module-engine-host.ts:68:29)
      at createTestCaseSetup (schematics/test-utils.ts:117:40)
```

## Repro steps
Run from either repo root or `./projects/my-lib`
1. Run `yarn`
1. Run `yarn test`

