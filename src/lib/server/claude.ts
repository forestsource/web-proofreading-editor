import { spawn } from 'child_process';

export interface ClaudeRequest {
	filePath: string;
	hunkContent: string;
	instruction: string;
	selectedText?: string;
	commonInstructions: string;
	commonContext: string;
	repoPath: string;
}

export interface ClaudeResult {
	success: boolean;
	result: string;
	executionTimeMs: number;
}

export async function executeClaudeCorrection(req: ClaudeRequest): Promise<ClaudeResult> {
	const startTime = Date.now();

	const prompt = buildPrompt(req);
	const args = ['-p', '--dangerously-skip-permissions', '--output-format', 'text'];

	if (req.commonInstructions) {
		args.push('--system-prompt', req.commonInstructions);
	}

	args.push('--allowedTools', 'Edit,Read,Write,Glob,Grep');
	args.push('--add-dir', req.repoPath);

	try {
		const { exitCode, stdout, stderr } = await spawnClaude(args, req.repoPath, prompt);
		const executionTimeMs = Date.now() - startTime;

		if (exitCode === 0) {
			return { success: true, result: stdout.trim(), executionTimeMs };
		} else {
			return {
				success: false,
				result: stderr.trim() || stdout.trim() || `Exit code: ${exitCode}`,
				executionTimeMs
			};
		}
	} catch (err) {
		return {
			success: false,
			result: `Failed to spawn claude: ${err instanceof Error ? err.message : String(err)}`,
			executionTimeMs: Date.now() - startTime
		};
	}
}

function spawnClaude(
	args: string[],
	cwd: string,
	stdin: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const proc = spawn('claude', args, { cwd, shell: true });

		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});
		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('error', reject);
		proc.on('close', (exitCode) => {
			resolve({ exitCode: exitCode ?? 1, stdout, stderr });
		});

		proc.stdin.write(stdin);
		proc.stdin.end();
	});
}

function buildPrompt(req: ClaudeRequest): string {
	let prompt = `あなたは校正アシスタントです。指示に従ってファイルを修正してください。\n\n`;
	prompt += `対象ファイル: ${req.filePath}\n\n`;

	if (req.commonContext) {
		prompt += `## 共通コンテキスト\n${req.commonContext}\n\n`;
	}

	prompt += `## 現在の差分（変更箇所）\n\`\`\`diff\n${req.hunkContent}\n\`\`\`\n\n`;

	if (req.selectedText) {
		prompt += `## レビュアーが特に指摘した箇所\n\`\`\`\n${req.selectedText}\n\`\`\`\n\n`;
	}

	prompt += `## レビュアーからの指摘\n${req.instruction}\n\n`;
	prompt += `上記の指摘に基づいて、ファイル "${req.filePath}" を修正してください。指摘された箇所のみを修正し、他の部分は変更しないでください。`;

	return prompt;
}
