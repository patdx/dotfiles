# @patdx/llm (Experimental)

A command-line interface for interacting with AI models via OpenRouter or Groq.

## Table of Contents

-   [Features](#features)
-   [Installation](#installation)
-   [Configuration](#configuration)
-   [Usage](#usage)
-   [Examples](#examples)
-   [Requirements](#requirements)
-   [Troubleshooting](#troubleshooting)
-   [Contributing](#contributing)
-   [License](#license)

## Features

-   Supports multiple AI providers (OpenRouter, Groq)
-   Access to various AI models
-   Read input from files, stdin, or interactive mode
-   Save and load conversation context
-   Format output as text, JSON, or Markdown
-   Clear context and output files
-   Verbose logging for debugging

## Installation

```
deno install -A --unstable-kv --name llm-cli jsr:@patdx/llm
```

## Configuration

1. Set up your API keys as environment variables:
    - For OpenRouter:
        ```bash
        export OPENROUTER_API_KEY='your-api-key-here'
        ```
    - For Groq:
        ```bash
        export GROQ_API_KEY='your-api-key-here'
        ```

## Usage

```bash
deno install -A --unstable-kv --name llm-cli jsr:@patdx/llm
```

### Options

-   `-f, --file <file>`: Read input from a file
-   `-s, --stdin`: Read input from stdin
-   `-p, --provider <name>`: Choose provider (openrouter or groq)
-   `-m, --model <name>`: Choose model (default: deepseek/deepseek-chat)
-   `--format <format>`: Output format (text, json, markdown)
-   `-i, --interactive`: Enter interactive mode
-   `--context <file>`: Load/save conversation context
-   `--verbose`: Enable verbose logging
-   `--clear`: Clear the output and context files
-   `--help`: Display this help message

## Examples

1. Run with a specific provider and model:

    ```bash
    deno run --allow-env llm-cli.ts -p openrouter -m deepseek/deepseek-chat
    ```

2. Read from a file:

    ```bash
    deno run --allow-read llm-cli.ts -f input.txt
    ```

3. Use stdin:

    ```bash
    echo "Hello" | deno run --allow-env llm-cli.ts -s
    ```

4. Interactive mode:

    ```bash
    deno run --allow-env llm-cli.ts --interactive
    ```

5. Save conversation context:

    ```bash
    deno run --allow-env llm-cli.ts --context conversation.md
    ```

6. Clear context and output files:

    ```bash
    deno run llm-cli.ts --clear
    ```

7. Verbose mode:
    ```bash
    deno run llm-cli.ts --verbose
    ```

## Troubleshooting

1. **Missing API Keys**:

    - Ensure you've set the appropriate environment variables for your provider.
    - Check that the API keys are valid and have the necessary permissions.

2. **File Permissions**:

    - Make sure you have read/write permissions for the files you're working with.
    - If using context files, ensure the directory is writable.

3. **Network Issues**:
    - Verify your internet connection.
    - Check if there are any firewall restrictions blocking API requests.
