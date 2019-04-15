import * as extension from "./extension";
import * as utils from "./utils";
import { basename } from "path";
import {
  CancellationToken,
  DebugConfiguration,
  DebugConfigurationProvider,
  window,
  ProviderResult,
  WorkspaceFolder,
} from "vscode";

/**
 * Gets stringified settings to pass to the debug server.
 */
export async function getDebugSettings() {
  return JSON.stringify({ env: extension.env });
}

/**
 * Interacts with the user to create a `roslaunch` or `rosrun` configuration.
 */
export class RosDebugConfigProvider implements DebugConfigurationProvider {
  provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken) {
    return [];
  }

  async resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken) {
    
    config.type = "ros";
    if(!config.command){
      config.command = await window.showQuickPick(["roslaunch", "rosrun"], {  placeHolder: "Launch command" });
    }
    if(!config.package)
    {
      const packages = utils.getPackages();
      config.package = await window.showQuickPick(packages.then(Object.keys), { placeHolder: "Package" });
    }

    if (!config.target) {
      let basenames = (files: string[]) => files.map(file => basename(file));

      if (config.command === "roslaunch") {
        const launches = utils.findPackageLaunchFiles(config.package).then(basenames);
        config.target = await window.showQuickPick(launches, { placeHolder: "Launch file" });
      } else {
        const executables = utils.findPackageExecutables(config.package).then(basenames);
        config.target = await window.showQuickPick(executables, { placeHolder: "Executable" });
      }
    }
    config.debugSettings = "${command:debugSettings}";

    return config;
  }
}
