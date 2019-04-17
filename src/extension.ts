import * as utils from "./utils";
import * as vscode from "vscode";

/**
 * The catkin workspace base dir.
 */
export let baseDir: string;

export let env: any;

let subscriptions = <vscode.Disposable[]>[];

export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ROS-Debugger" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	env = undefined;
	const baseDir = vscode.workspace.rootPath;
	const workspaceSetup = `${baseDir}/devel/setup.bash`;
	env = await utils.sourceSetupFile(workspaceSetup, env);
	
	let disposable = vscode.commands.registerCommand('extension.PrepareToDebug', () => {
		    const packages = utils.getPackages();
      	const package_ = vscode.window.showQuickPick(packages.then(Object.keys), { placeHolder: "Package" });
	});

	subscriptions.push(disposable);
}
export function deactivate() {
  subscriptions.forEach(disposable => disposable.dispose());
}
