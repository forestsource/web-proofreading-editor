import { executeClaudeCorrection, type ClaudeRequest } from './claude';
import { getComment, updateComment, getSettings, emitEvent } from './store';
import type { StatusEvent } from '$lib/types';

export async function executeComments(commentIds: string[]): Promise<void> {
	const settings = getSettings();
	const parallelism = Math.max(1, Math.min(10, settings.parallelism));

	// Mark all as pending
	for (const id of commentIds) {
		updateComment(id, { status: 'pending' });
		emitEvent({ type: 'status', commentId: id, status: 'pending' });
	}

	// Semaphore-based parallel execution
	const slots: Promise<void>[] = new Array(parallelism).fill(Promise.resolve());

	for (const commentId of commentIds) {
		// Wait for any slot to become available
		const slotIndex = await Promise.race(slots.map((p, i) => p.then(() => i)));
		slots[slotIndex] = processComment(commentId, settings.repoPath, settings.commonInstructions, settings.commonContext);
	}

	// Wait for all remaining
	await Promise.all(slots);
}

async function processComment(
	commentId: string,
	repoPath: string,
	commonInstructions: string,
	commonContext: string
): Promise<void> {
	const comment = getComment(commentId);
	if (!comment) return;

	// Mark as running
	updateComment(commentId, { status: 'running' });
	emitEvent({ type: 'status', commentId, status: 'running' });

	try {
		const req: ClaudeRequest = {
			filePath: comment.filePath,
			hunkContent: comment.hunkContent,
			instruction: comment.text,
			selectedText: comment.selectedText,
			commonInstructions,
			commonContext,
			repoPath
		};

		const result = await executeClaudeCorrection(req);

		const event: StatusEvent = {
			type: 'status',
			commentId,
			status: result.success ? 'completed' : 'failed',
			result: result.result,
			executionTimeMs: result.executionTimeMs
		};

		if (result.success) {
			updateComment(commentId, {
				status: 'completed',
				result: result.result,
				executionTimeMs: result.executionTimeMs
			});
		} else {
			updateComment(commentId, {
				status: 'failed',
				error: result.result,
				executionTimeMs: result.executionTimeMs
			});
			event.error = result.result;
		}

		emitEvent(event);
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		updateComment(commentId, { status: 'failed', error: errorMsg });
		emitEvent({ type: 'status', commentId, status: 'failed', error: errorMsg });
	}
}
