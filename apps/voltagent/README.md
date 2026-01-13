# VoltAgent Backend

VoltAgent backend server for the agentic monorepo.

## Setup

1. Create a `.env` file in this directory:

```bash
OPENAI_API_KEY=your-openai-api-key-here
```

2. Install dependencies (from root):

```bash
bun install
```

## Development

Run the VoltAgent server in development mode:

```bash
bun run dev
```

The server will start on `http://localhost:3141` by default.

You should see:
```
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

## Production

Build and start:

```bash
bun run build
bun start
```

## API Endpoints

- HTTP Server: `http://localhost:3141`
- Swagger UI: `http://localhost:3141/ui`
- VoltOps Console: https://console.voltagent.dev
