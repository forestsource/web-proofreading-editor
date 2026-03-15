# web-proofreading-editor

ブラウザ上でファイルをレビューし、[Claude Code](https://docs.anthropic.com/en/docs/claude-code) を使って指摘箇所を自動修正するWebツールです。  
小説の案出しや校閲に利用することを目的としています。

## 主な機能

- **差分ビューア** — ブランチ間やワーキングツリーの差分をファイルツリー付きで表示
- **コメントによるレビュー** — 差分の各セクションにコメント（修正指示）を追加
- **自動修正** — コメントをClaude Codeに送信し、コードを自動修正（並列実行対応）
- **リアルタイム進捗** — SSEによる実行ステータスのライブ更新
- **履歴管理** — 最近開いたリポジトリと差分設定を記録

> [!WARNING]
> **セキュリティに関する重要な注意事項**
>
> このツールはLAN内の全端末からアクセス可能な状態で起動します。  
> また、サーバープロセスの権限で任意のファイルを読み取ることができます。  
> 信頼できないネットワーク上での実行は避けてください。  
> `claude code` に`dangerously-skip-permissions` を渡す点も注意してください。 

## 前提条件

- [Bun](https://bun.sh/) (v1.0+) または [Node.js](https://nodejs.org/) (v20+)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) がインストール済みで `claude` コマンドが使える状態

## セットアップ

```bash
# 依存パッケージをインストール
bun install

# 開発サーバーを起動
bun run dev
```

ブラウザで `http://localhost:5173` を開きます。

## 本番ビルド

```bash
bun run build
bun run start
```

## 使い方

1. 画面上部にレビュー対象のパスを入力
2. ベースブランチとターゲットブランチを指定（省略時はワーキングツリーの差分）
3. 差分が表示されたら、修正したいセクションの「＋」ボタンからコメントを追加
4. コメントに修正指示を記入し、「実行」ボタンでClaude Codeによる自動修正を開始
5. 実行結果はリアルタイムでパネルに反映

### 設定（⚙ボタン）

- **共通指示** — すべてのコメント実行時にClaude Codeに渡すシステムプロンプト
- **共通コンテキスト** — プロジェクト固有の背景情報
- **並列数** — 同時に実行するコメントの最大数（デフォルト: 3）

## 技術スタック

- [SvelteKit](https://svelte.dev/) + [Svelte 5](https://svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [simple-git](https://github.com/steveukx/git-js) — Git操作
- [diff2html](https://diff2html.xyz/) / [parse-diff](https://github.com/nickolasg/parse-diff) — 差分解析

## ライセンス

[MIT](LICENSE)
