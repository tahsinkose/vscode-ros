import * as cp from "child_process";
import * as adapter from "vscode-debugadapter";
import * as pfs from "../promise-fs";
import { DebugProtocol as Protocol } from "vscode-debugprotocol";
const { Subject } = require('await-notify');

interface ILaunchRequestArguments extends Protocol.LaunchRequestArguments {
  command: "roslaunch" | "rosrun";
  package: string;
  target: string;
  args: string[];
  debugSettings: string;
}

export default class DebugSession extends adapter.DebugSession {
  private process: cp.ChildProcess;
  private static THREAD_ID = 1;
  private _variableHandles = new adapter.Handles<string>();

  private _configurationDone = new Subject();
  public constructor() {
      super();
      this.setDebuggerLinesStartAt1(false);
      this.setDebuggerColumnsStartAt1(false);

      this.on('stopOnEntry', () => {
        this.sendEvent(new adapter.StoppedEvent('entry', DebugSession.THREAD_ID));
      });
      this.on('stopOnStep', () => {
        this.sendEvent(new adapter.StoppedEvent('step', DebugSession.THREAD_ID));
      });
      this.on('stopOnBreakpoint', () => {
        this.sendEvent(new adapter.StoppedEvent('breakpoint', DebugSession.THREAD_ID));
      });
      this.on('stopOnException', () => {
        this.sendEvent(new adapter.StoppedEvent('exception', DebugSession.THREAD_ID));
      });
      this.on('breakpointValidated', (bp: Protocol.Breakpoint) => {
        this.sendEvent(new adapter.BreakpointEvent('changed', <Protocol.Breakpoint>{ verified: bp.verified, id: bp.id }));
      });
      this.on('end', () => {
        this.sendEvent(new adapter.TerminatedEvent());
      });
  }

  /**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: Protocol.InitializeResponse, args: Protocol.InitializeRequestArguments): void {

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;

		// make VS Code to show a 'step back' button
		response.body.supportsStepBack = true;

		this.sendResponse(response);

		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new adapter.InitializedEvent());
  }

  public shutdown() {
    if (this.process) {
      this.process.kill();
    }

    super.shutdown();
  }
  /**
	 * Called at the end of the configuration sequence.
	 * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
	 */
	protected configurationDoneRequest(response: Protocol.ConfigurationDoneResponse, args: Protocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);

		// notify the launchRequest that configuration has finished
		this._configurationDone.notify();
  }
  protected async launchRequest(response: Protocol.LaunchResponse, request: ILaunchRequestArguments) {
    if (request.command !== "roslaunch" && request.command !== "rosrun") {
      this.sendErrorResponse(response, 0, "Invalid command");
      return;
    }

    // Merge the ROS env with the current env so we aren't running in headless mode.
    const args = [request.package, request.target].concat(request.args || []);
    const workspaceSetup = '/home/tahsin/dji_ws/devel/setup.bash';
    let env = await sourceSetupFile(workspaceSetup, {});
    for(var key in process.env){
      if(typeof env[key]=== 'undefined')
      {
        env[key] = process.env[key]
      }
    }
    this.process = cp.spawn(request.command, args, { env });
    this.process.stdout.on("data", chunk =>
      this.sendEvent(new adapter.OutputEvent(chunk.toString(), "stdout"))
    );
    this.process.stderr.on("data", chunk =>
      this.sendEvent(new adapter.OutputEvent(chunk.toString(), "stderr"))
    );
    this.process.on('stopOnBreakpoint', () => {
			this.sendEvent(new adapter.StoppedEvent('breakpoint', DebugSession.THREAD_ID));
    });
    this.process.on("error", (err: Error) => {
      this.sendEvent(new adapter.OutputEvent(err.message, "stderr"));
      this.sendEvent(new adapter.TerminatedEvent());
    });
    this.process.on("exit", () => this.sendEvent(new adapter.TerminatedEvent()));

    this.sendResponse(response);
  }
}

export async function sourceSetupFile(filename: string, env?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    cp.exec(`bash -c "source '${filename}' && env"`, { env }, (err, out) => {
      if (!err) {
        resolve(out.split("\n").reduce((env, line) => {
          const index = line.indexOf("=");

          if (index !== -1) {
            env[line.substr(0, index)] = line.substr(index + 1);
          }

          return env;
        }, {}));
      } else {
        reject(err);
      }
    });
  });
}