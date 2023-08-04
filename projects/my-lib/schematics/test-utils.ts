import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { getSystemPath, Path } from '@angular-devkit/core';
import { HostTree, Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';
import { EMPTY } from 'rxjs';

/**
 * Path to the schematic collection for non-migration schematics. Needs to use
 * the workspace path as otherwise the resolution won't work on Windows.
 */
export const COLLECTION_PATH = path.join(__dirname, './collection.json');

/**
 * Create a base project used for testing.
 * @param runner - Schematic test runner
 * @param projectType - Project type (application or library)
 * @param appOptions - Project options
 * @param tree - Tree to use as base
 * @returns Promise that resolves to the test tree
 */
export async function createTestProject(
  runner: SchematicTestRunner,
  projectType: 'application' | 'library',
  appOptions = {},
  tree?: Tree,
): Promise<UnitTestTree> {
  const workspaceTree = await runner.runExternalSchematic(
    '@schematics/angular',
    'workspace',
    {
      name: 'workspace',
      version: '7.0.0',
      newProjectRoot: 'projects',
    },
    tree,
  );

  return runner.runExternalSchematic(
    '@schematics/angular',
    projectType,
    { name: 'my-app', ...appOptions },
    workspaceTree,
  );
}

/**
 * Create a base app used for testing.
 * @param runner - Schematic test runner
 * @param appOptions - Project options
 * @param tree - Tree to use as base
 * @returns Promise that resolves to the test tree
 */
export async function createTestApp(runner: SchematicTestRunner, appOptions = {}, tree?: Tree): Promise<UnitTestTree> {
  return createTestProject(runner, 'application', appOptions, tree);
}

/**
 * Creates a test app schematic tree that will be copied over to a real filesystem location.
 * This is necessary because otherwise the TypeScript compiler API would not be able to find files
 * @param runner - Schematic test runner
 * @returns Promise that resolves with { appTree, writeFile }
 */
export async function createFileSystemTestApp(
  runner: SchematicTestRunner,
): Promise<{ appTree: UnitTestTree; writeFile: (filePath: string, content: string) => void }> {
  const hostTree = new HostTree();
  const appTree: UnitTestTree = await createTestApp(runner, { name: 'my-app' }, hostTree);

  // Since the TypeScript compiler API expects all files to be present on the real file system, we
  // map every file in the app tree to a temporary location on the file system.
  appTree.files.forEach((filePath) => writeFile(filePath, appTree.readContent(filePath)));

  return {
    appTree,
    writeFile,
  };

  /**
   * Writes a file to the temp file system host and the app tree.
   * @param filePath - path of the new file
   * @param content - contents of the file
   */
  function writeFile(filePath: string, content: string): void {
    // Update the temp file system host to reflect the changes in the real file system.
    // This is still necessary since we depend on the real file system for parsing the
    // TypeScript project.
    if (hostTree.exists(filePath)) {
      hostTree.overwrite(filePath, content);
    } else {
      hostTree.create(filePath, content);
    }
  }
}

/**
 * Creates a test app schematic tree for unit testing.
 * @param migrationName - Name of the migration schematic
 * @param migrationPath - Path to the migration schematic
 * @returns Promise that resolves with { runner, appTree, writeFile, runFixers }
 */
export async function createTestCaseSetup(migrationName: string, migrationPath: string) {
  const runner = new SchematicTestRunner('schematics', migrationPath);
  const { appTree, writeFile } = await createFileSystemTestApp(runner);

  patchTypeScriptDefaultLib(appTree);

  const testAppTsconfigPath = 'projects/my-app/tsconfig.app.json';
  // Parse TypeScript configuration files with JSONC (like the CLI does) as the
  // config files could contain comments or trailing commas
  const testAppTsconfig = parse(appTree.readContent(testAppTsconfigPath), [], {
    allowTrailingComma: true,
  });

  // include all TypeScript files in the project. Otherwise all test input
  // files won't be part of the program and cannot be migrated.
  testAppTsconfig.include.push('src/**/*.ts');

  writeFile(testAppTsconfigPath, JSON.stringify(testAppTsconfig, null, 2));

  const runFixers = async function () {
    // Patch "executePostTasks" to do nothing. This is necessary since
    // we cannot run the node install task in unit tests. Rather we just
    // assert that certain async post tasks are scheduled.
    runner.engine.executePostTasks = () => EMPTY as any;

    await runner.runSchematic(migrationName, { project: 'my-app' }, appTree);
  };

  return { runner, appTree, writeFile, runFixers };
}

/**
 * Patches the specified virtual file system tree to be able to read the TypeScript
 * default library typings. These need to be readable in unit tests because otherwise
 * type checking within migration rules is not working as in real applications.
 * @param tree - Tree to patch
 */
function patchTypeScriptDefaultLib(tree: Tree): void {
  const originalRead = tree.read;
  tree.read = function (filePath: Path) {
    // In case a file within the TypeScript package is requested, we read the file from
    // the real file system. This is necessary because within unit tests, the "typeScript"
    // package from within the Bazel "@npm" repository  is used. The virtual tree can't be
    // used because the "@npm" repository directory is not part of the virtual file system.
    if (filePath.match(/node_modules[/\\]typescript/)) {
      return readFileSync(getSystemPath(filePath));
    } else {
      return originalRead.call(this, filePath);
    }
  };
}
