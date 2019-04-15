'use strict';

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
import * as Net from 'net';
import RosDebugSession from './debugger/debug-session';
import * as vscode from "vscode";

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
    let target: string;

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

export class RosDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new RosDebugSession();
				session.setRunAsServer(true);
				session.start(<NodeJS.ReadableStream>socket, socket);
			}).listen(0);
		}

		// make VS Code connect to debug server
		return new vscode.DebugAdapterServer(this.server.address().port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}
