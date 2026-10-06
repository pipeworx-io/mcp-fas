# @pipeworx/fas

USDA Foreign Agricultural Service MCP — global production, supply and distribution (PSD) estimates by commodity and country.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1689+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Tools

- `fas_production(commodity, country?, market_year?)` — PSD rows (production, consumption, stocks, trade totals) for a commodity, world-wide or for one country. Accepts a commodity name ("corn") or PSD code ("0440000"); walks back up to two market years when the current one is not yet published.
- `fas_commodity_codes(category?, search?)` — the bundled list of PSD commodity codes and common country codes.

### Agricultural trade (exports / imports)

`fas_exports` and `fas_imports` were removed on 2026-10-06 (fleet #2704). They never returned data — every call answered "use comtrade". For US or global agricultural trade by commodity and partner, call the keyless **comtrade** pack: `comtrade_trade_data`, `comtrade_top_partners`, `comtrade_top_commodities`.

## Auth

Platform key. FAS OpenData sits on the api.data.gov umbrella and now requires a key; the gateway injects the shared data.gov platform key. A caller may pass their own as `_apiKey`. With no key, `fas_production` returns `api_key_required` with the signup link instead of failing.

## Data sources

- PSD API: `https://api.fas.usda.gov/api/psd`
- Key signup: https://apps.fas.usda.gov/opendataweb/

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/fas/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1689+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/fas_production \
  -H 'Content-Type: application/json' \
  -d '{"commodity":"corn","country":"US","market_year":"2024"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/fas_production`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "fas": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-fas"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-fas
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Fas data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
