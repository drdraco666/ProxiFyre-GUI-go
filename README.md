# ProxiFyre Configuration Editor

Desktop application for editing ProxiFyre configuration, built using Wails v2 (Go + Web Frontend).
Requires **Windows Packet Filter** [download](https://github.com/wiresock/ndisapi/releases/latest).

## Requirements

- **Go 1.23+** - [download](https://golang.org/dl/)
- **Node.js 16+** - [download](https://nodejs.org/)
- **Wails CLI v2** - install with command: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **Git** - for cloning the repository

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ProxiFyre-gui-go
```

2. Install Go dependencies:
```bash
go mod tidy
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

## Building

Automatic Build (Windows)
Run the build script:
```bash
build.bat
```

Manual Build
1. Build the frontend::
```bash
cd frontend
npm run build
cd ..
```

2. Build the application:
```bash
wails build -platform windows/amd64
```

Build output:  `ProxiFyreConfigEditor.exe`

## Development
### Run in development mode

```bash
wails dev
```

### Frontend-only development
```bash
cd frontend
npm run dev
```

## Project Structure

- `main.go` - Go application entry point
- `app.go` - main application logic
- `frontend/` - web interface (Vite + Vanilla JS)
- `wails.json` - Wails configuration

## Platforms

- **Windows** (amd64) - primary support
- Other platforms: change the `-platform` parameter in the build command

## TODO

Add support for multiple proxies simultaneously

## License

Project developed by Taz (taz@turn-guild.ru) with AI assistance
