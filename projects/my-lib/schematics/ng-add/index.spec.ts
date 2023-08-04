import * as packageJson from '../../package.json';
import { COLLECTION_PATH, createTestCaseSetup } from '../test-utils';

const packageName = packageJson.name;
const packageVersion = packageJson.version;

describe('schematic: ng-add', () => {
  it('should update the package.json', async () => {
    const { runFixers, appTree } = await createTestCaseSetup('ng-add', COLLECTION_PATH);
    await runFixers();

    const appPackageJson = JSON.parse(appTree.readContent('/package.json'));
    const dependencies = appPackageJson.dependencies;

    expect(dependencies[packageName]).toBe(`^${packageVersion}`);
  });
});
