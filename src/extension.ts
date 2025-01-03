import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	const _ = context.subscriptions.push.bind(context.subscriptions);

	vscode.workspace.registerTextDocumentContentProvider(
		"strings-jsonl",
		new PeekJsonlContentProvider(),
	);

	_(
		vscode.commands.registerCommand("strings.peekjsonl", () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			const doc = editor.document;
			const line = doc.lineAt(editor.selection.active.line);

			const uri = doc.uri.with({
				scheme: "strings-jsonl",
				query: `line=${line.lineNumber}&path=${doc.uri.path}`,
				path: doc.uri.path.replace(/\.jsonl$/, ".json"),
			});

			const position = new vscode.Position(line.lineNumber, 0);
			const ranges = getRanges(JSON.stringify(JSON.parse(line.text), null, 2));
			const locations = ranges.map((range) => new vscode.Location(uri, range));
			vscode.commands.executeCommand(
				"editor.action.peekLocations",
				doc.uri,
				position,
				locations,
				"peek",
			);
		}),
	);
}

const KEY_LINE = /^\s{2}"([^"]+)"\s*:/;

function getRanges(content: string) {
	const ranges: vscode.Range[] = [];
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = KEY_LINE.exec(line);

		if (match) {
			const key = match[1];
			ranges.push(new vscode.Range(i, 3, i, 3 + key.length));
		}
	}

	return ranges;
}

class PeekJsonlContentProvider implements vscode.TextDocumentContentProvider {
	provideTextDocumentContent(uri: vscode.Uri): string {
		const params = new URLSearchParams(uri.query);
		const line = Number(params.get("line"));
		const path = params.get("path");

		const doc = vscode.workspace.textDocuments.find(
			(doc) => doc.uri.path === path,
		);

		if (!doc) {
			throw new Error(`Document not found: ${path}`);
		}

		const jsonl = doc.lineAt(line).text;

		return JSON.stringify(JSON.parse(jsonl), null, 2);
	}
}

export function deactivate() {}
