import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { addPackageJsonDependency, NodeDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';

/**
 * Adds single dependency to tree
 * @param tree - file system tree
 * @param context - schematic context
 * @param dependencyName - name of the dependency to add
 * @param dependencyVersion - version of the dependency to add
 */
export function addDependency(
  tree: Tree,
  context: SchematicContext,
  dependencyName: string,
  dependencyVersion: string,
): void {
  const nodeDependency: NodeDependency = {
    type: NodeDependencyType.Default,
    name: dependencyName,
    version: dependencyVersion,
  };
  addPackageJsonDependency(tree, nodeDependency);
  context.logger.log('info', `√  Added "${dependencyName}" to package`);
}
