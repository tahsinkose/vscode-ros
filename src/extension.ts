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
		let sourceLines = readFileSync(fpath).toString();
		sourceLines = sourceLines.replace(/\n|\t/g, '');
		var include_reg = /<include (.*?)<\/include>|<include (.*?)\/>/g;
		var node_reg = /<node (.*?)\/>/g;
		let includes: Array<String> = [];
		let nodes: Array<String> = [];
		// Parse all including packages and nodes
		do {
			var m = include_reg.exec(sourceLines);
			var n = node_reg.exec(sourceLines);
			if (m) {
				if(m[1]){
					includes.push(m[1]);
				}
				else if(m[2]){
					includes.push(m[2]);
				}
			}
			if(n){
				nodes.push(n[1]);
			}
		} while (m);
		nodes.push(...parse_packages(includes));
	});

	subscriptions.push(disposable);
}

export function parse_packages(includes: Array<String>) : Array<String> {
	return includes;
}
export function deactivate() {
  subscriptions.forEach(disposable => disposable.dispose());
}
