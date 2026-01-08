import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { ToolDefinition, AgentContext, escapeXmlAttr } from "./types";
import { safeJoin } from "@/ipc/utils/path_utils";

const execAsync = promisify(exec);

// Map internal command names to actual OpenSpec CLI commands
const OPENSPEC_COMMAND_MAP = {
    "list": "list",
    "validate": "validate",
    "show": "show",
    "archive": "archive",
    "spec-list": "spec list",
    "change-list": "change list"
} as const;

const runOpenspecCommandSchema = z.object({
    command: z.enum([
        "list",
        "validate",
        "show",
        "archive",
        "spec-list",
        "change-list"
    ]).describe("The OpenSpec command to execute"),
    args: z.string().optional().describe("Additional arguments for the command"),
});

export const runOpenspecCommandTool: ToolDefinition<z.infer<typeof runOpenspecCommandSchema>> = {
    name: "run_openspec_command",
    description: `Execute OpenSpec CLI commands to manage specifications and change proposals.

Available commands:
- list: List active change proposals (maps to 'openspec list')
  * No args required
- validate: Validate a change proposal or specification (maps to 'openspec validate')
  * REQUIRES args: --all | --changes | --specs | <change-name> [--strict]
- show: Display details of a change proposal or specification (maps to 'openspec show')
  * REQUIRES args: <change-name> or <spec-name>
- archive: Archive a completed change proposal (maps to 'openspec archive')
  * REQUIRES args: <change-name> [--yes]
- spec-list: List all specifications (maps to 'openspec spec list')
  * Optional args: --long | --json
- change-list: List all change proposals (maps to 'openspec change list', deprecated, use 'list')

Examples:
- List active changes: {"command": "list"}
- Validate all changes: {"command": "validate", "args": "--all --strict"}
- Validate specific proposal: {"command": "validate", "args": "my-change-proposal --strict"}
- Show proposal details: {"command": "show", "args": "my-change-proposal"}
- List specifications: {"command": "spec-list", "args": "--long"}
- List specs shorthand: {"command": "list", "args": "--specs"}`,

    inputSchema: runOpenspecCommandSchema,
    defaultConsent: "always",

    getConsentPreview: (args) => `Execute OpenSpec command: ${args.command}${args.args ? ` ${args.args}` : ""}`,

    buildXml: (args, _isComplete) => {
        const actualCommand = OPENSPEC_COMMAND_MAP[args.command as keyof typeof OPENSPEC_COMMAND_MAP] || args.command;
        const fullCommand = `openspec ${actualCommand}${args.args ? ` ${args.args}` : ""}`;
        return `<dyad-openspec command="${escapeXmlAttr(fullCommand)}"></dyad-openspec>`;
    },

    execute: async (args, ctx: AgentContext) => {
        try {
            const actualCommand = OPENSPEC_COMMAND_MAP[args.command as keyof typeof OPENSPEC_COMMAND_MAP] || args.command;

            // Build the full command
            let fullCommand = `openspec ${actualCommand}`;
            if (args.args) {
                fullCommand += ` ${args.args}`;
            }

            // Execute the command in the project root
            const { stdout, stderr } = await execAsync(fullCommand, {
                cwd: ctx.appPath,
                maxBuffer: 1024 * 1024, // 1MB buffer
            });

            // Return the combined output
            const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : "");

            if (!output.trim()) {
                return "Command executed successfully (no output)";
            }

            return output.trim();

        } catch (error: any) {
            // Handle execution errors
            if (error.code === 'ENOENT') {
                throw new Error("OpenSpec CLI is not available. Please ensure OpenSpec is properly installed.");
            }

            // Return error output if available
            if (error.stdout || error.stderr) {
                const errorOutput = error.stdout + (error.stderr ? `\nSTDERR:\n${error.stderr}` : "");
                throw new Error(`OpenSpec command failed:\n${errorOutput}`);
            }

            throw new Error(`Failed to execute OpenSpec command: ${error.message}`);
        }
    },
};
