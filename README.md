# cmdo

[![npm version](https://badge.fury.io/js/%40prattiikk%2Fcmdo.svg)](https://www.npmjs.com/package/@prattiikk/cmdo)
[![npm downloads](https://img.shields.io/npm/dm/@prattiikk/cmdo.svg)](https://www.npmjs.com/package/@prattiikk/cmdo)
[![npm total downloads](https://img.shields.io/npm/dt/@prattiikk/cmdo.svg)](https://www.npmjs.com/package/@prattiikk/cmdo)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![GitHub stars](https://img.shields.io/github/stars/prattiikk/cmdo.svg)](https://github.com/prattiikk/cmdo)
[![GitHub issues](https://img.shields.io/github/issues/prattiikk/cmdo.svg)](https://github.com/prattiikk/cmdo/issues)

AI-powered CLI tool for terminal command management. Generate, explain, debug, and optimize commands using natural language.

## Installation

```bash
npm install -g @prattiikk/cmdo
```

## Usage

Run the CLI:

```bash
cmdo
```

This opens an interactive menu with the following options:

```
? What would you like to do?
❯ Generate Command
  Explain Command
  Learn Command (Tutorial)
  Usage Examples
  Optimize Command
  Convert Command (Shell/OS)
  Debug Errors
  Fix Broken Command
  Configure Settings
```

## Features

### Generate Command
Convert natural language descriptions into terminal commands.

**Example:**
```
Input: "find all JavaScript files modified in the last 7 days"
Output: find . -name "*.js" -mtime -7
```

### Explain Command
Get detailed explanations of what commands do and how they work.

**Example:**
```
Input: tar -xzf archive.tar.gz
Output: Extracts files from a gzip-compressed tar archive
- tar: archive utility
- -x: extract files
- -z: handle gzip compression
- -f: specify filename
```

### Learn Command
Interactive tutorials that teach you how commands work step-by-step.

### Usage Examples
See practical examples and common use cases for any command.

### Optimize Command
Get suggestions for more efficient or better alternatives to existing commands.

**Example:**
```
Input: ls -la | grep ".txt"
Suggestion: ls -la *.txt (more efficient)
```

### Convert Command
Translate commands between different shells (bash, zsh, PowerShell) and operating systems (Linux, macOS, Windows).

### Debug Errors
Troubleshoot command failures by analyzing error messages and providing solutions.

### Fix Broken Command
Automatically detect and correct syntax errors, typos, and common mistakes in commands.

## AI Model Options

cmdo provides three ways to access AI functionality:

### 1. Default Service (Recommended for beginners)
- Uses a free tier with rate limiting
- No setup required - works out of the box
- Powered by my server infrastructure

### 2. Your Own API Keys
- Bring your own API key for unlimited usage
- Supported providers:
  - OpenAI GPT models
  - Anthropic Claude
  - Google Gemini
  - Any OpenAI-compatible API

### 3. Local Models (Ollama)
- Complete offline functionality
- No API costs or rate limits
- Full privacy - nothing leaves your machine
- Supports all Ollama-compatible models

## Configuration

Configure your preferred AI provider:
1. Run `cmdo`
2. Select "Configure Settings" 
3. Choose from:
   - Use default service (no setup needed)
   - Add your API key
   - Set up Ollama models

All configuration is stored locally on your machine.

## Requirements

- Node.js 16 or higher
- Terminal/Command Prompt access
- For Ollama: [Ollama installation](https://ollama.ai)

## Contributing

This is an open-source solo project that needs contributions to grow. Areas where help is needed:

- **Bug fixes and improvements**
- **New features and command support**
- **Documentation and examples**
- **Testing across different platforms**
- **Performance optimizations**

If you find cmdo useful, consider:
- Reporting bugs and issues
- Submitting feature requests
- Contributing code improvements
- Sharing with other developers

## Links

- **Website**: [cmdo.vercel.app](https://cmdo.vercel.app)
- **Source Code**: [github.com/prattiikk/cmdo](https://github.com/prattiikk/cmdo)
- **Bug Reports**: [GitHub Issues](https://github.com/prattiikk/cmdo/issues)

## License

ISC © [Pratik](https://github.com/prattiikk)