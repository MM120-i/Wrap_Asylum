# Warp Asylum

Warp Asylum is a terminal-based coding assistant inspired by OpenCode. You can
chat with an AI model, save conversations, inspect a project, and ask the
assistant to help plan or build changes.

The project is currently in active development.

## What It Can Do

- Chat with an AI model and see responses as they are generated
- Save and reopen previous conversations
- Switch between **Plan** and **Build** modes
- Choose between supported Anthropic, OpenAI, and local models
- Use local models through Ollama or another OpenAI-compatible server
- Read files, list folders, search code, and find files
- Edit files and run project commands in Build mode
- Choose a visual theme for the terminal interface
- Store sessions and messages in PostgreSQL

## How It Works

Warp Asylum has two parts:

- **Terminal app**: the interface where you chat with the assistant
- **Server**: handles AI requests, tools, sessions, and database access

The terminal app connects to the server at `API_URL`. Both normally run on your
computer during development.

## Requirements

Install these before starting:

- [Bun](https://bun.sh/), version `1.3.14` or compatible
- PostgreSQL, either locally or through a hosted service such as [Neon](https://neon.tech/)
- At least one AI provider:
  - OpenAI
  - Anthropic
  - Ollama for local models

On Windows, install [Git for Windows](https://gitforwindows.org/) if you want
to use the assistant's shell-command tool. It provides the `bash` command used
by the server.

## Installation

Clone the repository and enter its directory:

```bash
git clone https://github.com/MM120-i/Wrap_Asylum.git
cd Wrap_Asylum
```

Install dependencies:

```bash
bun install
```

Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Generate the database client:

```bash
cd packages/database
bun run db:generate
cd ../..
```

## Environment Settings

Open `.env` and set the values you need:

```env
API_URL=http://localhost:3000
DATABASE_URL=your-postgresql-connection-string
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

You only need the API key for the provider you plan to use. Never commit `.env`
or share its contents.

### Using Ollama Locally

Ollama lets you run an AI model on your own computer without sending requests
to a cloud provider.

1. Install [Ollama](https://ollama.com/).
2. Download a model:

   ```bash
   ollama pull qwen3:8b
   ```

3. Confirm it is installed:

   ```bash
   ollama list
   ```

4. Add these settings to `.env`:

   ```env
   LOCAL_MODEL_BASE_URL=http://localhost:11434/v1
   DEFAULT_CHAT_MODEL=local:qwen3:8b
   ```

The model name after `local:` must match the name shown by `ollama list`.

Ollama must be running on the same computer as the server. A cloud deployment
cannot connect to an Ollama server running on your personal computer.

### Using OpenAI or Anthropic

The default model is `gpt-5.4`. For OpenAI, set:

```env
OPENAI_API_KEY=your-openai-key
DEFAULT_CHAT_MODEL=gpt-5.4
```

For Anthropic, set:

```env
ANTHROPIC_API_KEY=your-anthropic-key
DEFAULT_CHAT_MODEL=claude-opus-4-6
```

You can also choose the built-in cloud models through the `/models` command in
the terminal app. Local Ollama models are selected with `DEFAULT_CHAT_MODEL`.

## Start the Application

Start the server in one terminal:

```bash
bun run dev:server
```

Start the terminal app in a second terminal:

```bash
bun run dev:cli
```

The server runs at `http://localhost:3000` by default.

## Using the App

Type a message and press Enter.

Press Tab to switch between:

- **Plan**: the assistant can inspect the project and suggest a solution, but it
  cannot edit files or run commands
- **Build**: the assistant can inspect files, edit files, and run project
  commands

Commands are entered by typing `/` in the input box. Useful commands include:

| Command | What it does |
| --- | --- |
| `/new` | Start a new conversation |
| `/agents` | Switch between Plan and Build modes |
| `/models` | Choose an AI model |
| `/sessions` | Browse saved conversations |
| `/theme` | Change the terminal theme |
| `/exit` | Close the application |

File operations are restricted to the selected project directory, including
checks for path traversal and symlink escapes. Shell commands run with limited
environment variables and bounded output, but you should still review commands
before allowing them to run.

## Project Layout

```text
packages/
  cli/       Terminal user interface
  server/    API, AI streaming, and project tools
  database/  Prisma schema and database client
  shared/    Shared models, schemas, and stream types
```

## Checks and CI

GitHub Actions runs on pull requests and pushes to `main`. It:

1. Installs dependencies with Bun
2. Generates the Prisma client
3. Typechecks the shared, database, server, and CLI packages

Run the main checks locally with:

```bash
bun install --frozen-lockfile
cd packages/database
bunx prisma generate
cd ../..
bunx --package typescript@5.9.3 tsc --noEmit -p packages/shared
bunx --package typescript@5.9.3 tsc --noEmit -p packages/database
bunx --package typescript@5.9.3 tsc --noEmit -p packages/server
bunx --package typescript@5.9.3 tsc --noEmit -p packages/cli
```

## Deployment

The repository includes a `render.yaml` file for deploying the server to
[Render](https://render.com/).

The deployed server needs:

- `DATABASE_URL`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` if it should answer chat requests

Local Ollama models are not available to the deployed server because Render
runs on a different machine. Use a cloud provider for the deployed version, or
continue using Ollama locally.

## Troubleshooting

### The server says port 3000 is already in use

Stop the other server process, or start this server on another port:

```powershell
$env:PORT=3001; bun run dev:server
```

Update `API_URL` in `.env` to match the new port.

### The assistant does not respond

Check that:

- The server is running
- The terminal app's `API_URL` points to the server
- Your selected model matches an available API key or local model
- Ollama is running if you selected a `local:` model
- `DATABASE_URL` is valid

### The local model is not found

Run `ollama list` and make sure `DEFAULT_CHAT_MODEL` uses the exact model name.

## Security Notes

- Keep API keys and database URLs in `.env` only.
- Do not commit `.env` to Git.
- Review Build-mode shell commands before running them.
- Do not expose the development server directly to the public internet.

## License

No license has been selected for this project yet.
