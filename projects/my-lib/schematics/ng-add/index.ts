import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

import * as packageJson from '../../package.json';
import { addDependency } from './add-dependency';

/**
 * Add necessary dependencies and then run the setup-project schematic
 * @param options Schematics options
 * @returns Rule to be executed
 */
export default function (): Rule {
  return (tree: Tree, context: SchematicContext) => {
    addDependency(tree, context, packageJson.name, `^${packageJson.version}`);
    return tree;
  };
}
