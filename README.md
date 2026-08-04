# mcp-fas

FAS MCP — USDA Foreign Agricultural Service (trade & global production data)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `fas_exports` | Check US agricultural exports by commodity and destination. Returns export volumes, values, and trade partner details. Use fas_commodity_codes to find commodity codes (e.g., "corn", "wheat"). |
| `fas_imports` | Check US agricultural imports by commodity and origin country. Returns import volumes, values, and source country details. Use fas_commodity_codes to find commodity codes (e.g., "coffee", "cocoa"). |
| `fas_production` | Get global agricultural production, consumption, and inventory data by commodity and country. Returns production volumes, supply estimates, consumption figures, and trade flows by year. |
| `fas_commodity_codes` | Search agricultural commodity codes and names. Returns commodity IDs, descriptions, and categories. Use results with fas_production, fas_exports, and fas_imports. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "fas": {
      "url": "https://gateway.pipeworx.io/fas/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Fas data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
