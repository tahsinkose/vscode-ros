import * as utils from "./utils";
import * as vscode from "vscode";
import { basename } from "path";
import { readFileSync } from 'fs';

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
	
	let disposable = vscode.commands.registerCommand('extension.PrepareToDebug', async () => {
		const packages = utils.getPackages();
		const package_ = await vscode.window.showQuickPick(packages.then(Object.keys), { placeHolder: "Package" });
		let basenames = (files: string[]) => files.map(file => basename(file));
		const launches = utils.findPackageLaunchFiles(package_).then(basenames);
		const absolute_launch_paths = await utils.findPackageLaunchFiles(package_);
		const target = await vscode.window.showQuickPick(launches, { placeHolder: "Launch file" });
		let fpath: string;
		for(let path_ of absolute_launch_paths){
			if(basename(path_) === target){
				fpath = path_;
			}
		}
		const sourceLines = readFileSync(fpath).toString().split('\n');	
	});

	subscriptions.push(disposable);
}

export function deactivate() {
  subscriptions.forEach(disposable => disposable.dispose());
}
