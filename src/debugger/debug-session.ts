import * as cp from "child_process";
import * as adapter from "vscode-debugadapter";
import * as pfs from "../promise-fs";
import { DebugProtocol as Protocol } from "vscode-debugprotocol";


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
  public shutdown() {
    if (this.process) {
      this.process.kill();
    }

    super.shutdown();
  }

  protected launchRequest(response: Protocol.LaunchResponse, request: ILaunchRequestArguments) {
    if (request.command !== "roslaunch" && request.command !== "rosrun") {
      this.sendErrorResponse(response, 0, "Invalid command");
      return;
    }

    // Merge the ROS env with the current env so we aren't running in headless mode.
    const args = [request.package, request.target].concat(request.args || []);
    const workspaceSetup = '/home/tahsin/dji_ws/devel/setup.bash';
    const env = sourceSetupFile(workspaceSetup, {});
    this.process = cp.spawn(request.command, args, { env });
    console.log(env)
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