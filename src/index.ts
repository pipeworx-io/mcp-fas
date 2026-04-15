interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * FAS MCP — USDA Foreign Agricultural Service (trade & global production data)
 *
 * No auth required. Uses USDA FAS OpenData API endpoints for PSD (Production,
 * Supply & Distribution) and trade data.
 *
 * API: https://apps.fas.usda.gov/OpenData/api
 *
 * Note: FAS API endpoints have historically changed. If the primary endpoints
 * return errors, the tool provides clear error messages with alternative data
 * sources (NASS Quick Stats, EIA, FRED).
 *
 * Tools:
 * - fas_exports: US agricultural export data by commodity and destination
 * - fas_imports: US agricultural import data by commodity and origin
 * - fas_production: World production estimates (PSD data)
 * - fas_commodity_codes: List available commodity codes for PSD queries
 */


const PSD_BASE = 'https://apps.fas.usda.gov/OpenData/api/psd';
const GATS_BASE = 'https://apps.fas.usda.gov/OpenData/api/gats';

// ── Common commodity codes for PSD ──────────────────────────────────

interface CommodityInfo {
  code: string;
  name: string;
  category: string;
}

const COMMODITY_CODES: CommodityInfo[] = [
  { code: '0440000', name: 'Corn', category: 'Grains' },
  { code: '0410000', name: 'Wheat', category: 'Grains' },
  { code: '0450000', name: 'Rice, Milled', category: 'Grains' },
  { code: '0451000', name: 'Rice, Rough', category: 'Grains' },
  { code: '0460000', name: 'Barley', category: 'Grains' },
  { code: '0459000', name: 'Sorghum', category: 'Grains' },
  { code: '0430000', name: 'Oats', category: 'Grains' },
  { code: '2222000', name: 'Soybeans', category: 'Oilseeds' },
  { code: '2232000', name: 'Soybean Meal', category: 'Oilseeds' },
  { code: '2234000', name: 'Soybean Oil', category: 'Oilseeds' },
  { code: '2226000', name: 'Rapeseed (Canola)', category: 'Oilseeds' },
  { code: '2224000', name: 'Sunflowerseed', category: 'Oilseeds' },
  { code: '2223000', name: 'Peanuts', category: 'Oilseeds' },
  { code: '2631000', name: 'Palm Oil', category: 'Oilseeds' },
  { code: '0574000', name: 'Cotton', category: 'Fiber' },
  { code: '0114000', name: 'Beef and Veal', category: 'Meat' },
  { code: '0112000', name: 'Pork', category: 'Meat' },
  { code: '0113000', name: 'Poultry, Broiler', category: 'Meat' },
  { code: '0401000', name: 'Dairy, Butter', category: 'Dairy' },
  { code: '0402000', name: 'Dairy, Cheese', category: 'Dairy' },
  { code: '0404000', name: 'Dairy, Dry Whole Milk Powder', category: 'Dairy' },
  { code: '0405000', name: 'Dairy, Nonfat Dry Milk', category: 'Dairy' },
  { code: '0612000', name: 'Sugar, Centrifugal', category: 'Sugar' },
  { code: '0711000', name: 'Coffee, Green', category: 'Tropical' },
  { code: '0721000', name: 'Cocoa Beans', category: 'Tropical' },
];

// ── Common country codes ────────────────────────────────────────────

const COUNTRY_CODES: Record<string, string> = {
  US: 'United States',
  BR: 'Brazil',
  CN: 'China',
  AR: 'Argentina',
  IN: 'India',
  AU: 'Australia',
  CA: 'Canada',
  EU: 'European Union',
  RU: 'Russia',
  UA: 'Ukraine',
  ID: 'Indonesia',
  TH: 'Thailand',
  MX: 'Mexico',
  JP: 'Japan',
  KR: 'South Korea',
  EG: 'Egypt',
  NG: 'Nigeria',
  PK: 'Pakistan',
  VN: 'Vietnam',
  MY: 'Malaysia',
};

// ── Helpers ───────────────────────────────────────────────────────────

function findCommodityCode(name: string): string | null {
  const lower = name.toLowerCase();
  const match = COMMODITY_CODES.find(
    (c) => c.name.toLowerCase() === lower || c.name.toLowerCase().includes(lower),
  );
  return match?.code ?? null;
}

async function fasGet(baseUrl: string, path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404) {
      throw new Error(
        `FAS API endpoint not found (${res.status}). The USDA FAS API may have changed. ` +
        `Alternative sources: use NASS Quick Stats (nass_query) for US production data, ` +
        `or check https://apps.fas.usda.gov/psdonline for manual PSD data access. Error: ${text}`,
      );
    }
    throw new Error(`FAS API error (${res.status}): ${text}`);
  }

  return res.json();
}

// ── Tool definitions ──────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'fas_exports',
    description:
      'Get US agricultural export data by commodity and destination country. Uses USDA FAS GATS (Global Agricultural Trade System) data. Shows export volumes and values.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        commodity: { type: 'string', description: 'Commodity name (e.g., "corn", "soybeans", "wheat", "beef", "pork", "cotton") or commodity code' },
        country: { type: 'string', description: 'Destination country code (e.g., "CN" for China, "MX" for Mexico, "JP" for Japan). Optional — omit for all destinations.' },
        start_year: { type: 'string', description: 'Start year (e.g., "2020"). Optional.' },
        end_year: { type: 'string', description: 'End year (e.g., "2024"). Optional.' },
      },
      required: ['commodity'],
    },
  },
  {
    name: 'fas_imports',
    description:
      'Get US agricultural import data by commodity and origin country. Shows import volumes and values from USDA FAS trade data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        commodity: { type: 'string', description: 'Commodity name (e.g., "coffee", "cocoa", "sugar", "beef") or commodity code' },
        country: { type: 'string', description: 'Origin country code (e.g., "BR" for Brazil, "CO" for Colombia). Optional — omit for all origins.' },
        start_year: { type: 'string', description: 'Start year (optional)' },
        end_year: { type: 'string', description: 'End year (optional)' },
      },
      required: ['commodity'],
    },
  },
  {
    name: 'fas_production',
    description:
      'Get world production, supply, and distribution estimates for agricultural commodities from USDA FAS PSD (Production, Supply & Distribution) database. Covers global production, consumption, stocks, and trade flows.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        commodity: { type: 'string', description: 'Commodity name (e.g., "corn", "soybeans", "wheat") or PSD commodity code (e.g., "0440000")' },
        country: { type: 'string', description: 'Country code (e.g., "US", "BR", "CN"). Optional — omit for world totals.' },
        market_year: { type: 'string', description: 'Market year (e.g., "2024"). Optional.' },
      },
      required: ['commodity'],
    },
  },
  {
    name: 'fas_commodity_codes',
    description:
      'List available USDA FAS PSD commodity codes with names and categories. Use these codes with fas_production and other FAS tools. Supports filtering by category or keyword.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category: "Grains", "Oilseeds", "Meat", "Dairy", "Fiber", "Sugar", "Tropical" (optional)' },
        search: { type: 'string', description: 'Search keyword (e.g., "soy", "wheat"). Optional.' },
      },
    },
  },
];

// ── callTool dispatcher ───────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'fas_exports':
      return getExports(args);
    case 'fas_imports':
      return getImports(args);
    case 'fas_production':
      return getProduction(args);
    case 'fas_commodity_codes':
      return getCommodityCodes(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Tool implementations ─────────────────────────────────────────────

async function getExports(args: Record<string, unknown>) {
  const commodity = args.commodity as string;
  const commodityCode = findCommodityCode(commodity) ?? commodity;

  const params: Record<string, string> = {};
  if (args.country) params.partnerCode = args.country as string;
  if (args.start_year) params.startYear = args.start_year as string;
  if (args.end_year) params.endYear = args.end_year as string;

  try {
    const data = await fasGet(GATS_BASE, `/exports/commodity/${commodityCode}`, params);
    const records = Array.isArray(data) ? data : [];
    return {
      commodity: commodity,
      commodity_code: commodityCode,
      direction: 'exports',
      count: records.length,
      data: records.slice(0, 100).map((r: Record<string, unknown>) => ({
        year: r.year ?? r.Year ?? null,
        month: r.month ?? r.Month ?? null,
        partner: r.partnerDesc ?? r.PartnerDesc ?? r.partner ?? null,
        partner_code: r.partnerCode ?? r.PartnerCode ?? null,
        value: r.value ?? r.Value ?? null,
        quantity: r.quantity ?? r.Quantity ?? null,
        unit: r.unit ?? r.Unit ?? null,
      })),
      truncated: records.length > 100,
    };
  } catch (e) {
    // Try alternative endpoint format
    try {
      const altData = await fasGet(GATS_BASE, `/exports`, {
        ...params,
        commodityCode,
      });
      const records = Array.isArray(altData) ? altData : [];
      return {
        commodity,
        commodity_code: commodityCode,
        direction: 'exports',
        count: records.length,
        data: records.slice(0, 100),
        truncated: records.length > 100,
      };
    } catch {
      throw new Error(
        `Could not retrieve FAS export data for "${commodity}". ` +
        `The FAS API may have changed or be temporarily unavailable. ` +
        `Alternatives: (1) Visit https://apps.fas.usda.gov/gats for manual trade data, ` +
        `(2) Use nass_prices for domestic price data, ` +
        `(3) Use fas_commodity_codes to verify the commodity code. ` +
        `Original error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

async function getImports(args: Record<string, unknown>) {
  const commodity = args.commodity as string;
  const commodityCode = findCommodityCode(commodity) ?? commodity;

  const params: Record<string, string> = {};
  if (args.country) params.partnerCode = args.country as string;
  if (args.start_year) params.startYear = args.start_year as string;
  if (args.end_year) params.endYear = args.end_year as string;

  try {
    const data = await fasGet(GATS_BASE, `/imports/commodity/${commodityCode}`, params);
    const records = Array.isArray(data) ? data : [];
    return {
      commodity,
      commodity_code: commodityCode,
      direction: 'imports',
      count: records.length,
      data: records.slice(0, 100).map((r: Record<string, unknown>) => ({
        year: r.year ?? r.Year ?? null,
        month: r.month ?? r.Month ?? null,
        partner: r.partnerDesc ?? r.PartnerDesc ?? r.partner ?? null,
        partner_code: r.partnerCode ?? r.PartnerCode ?? null,
        value: r.value ?? r.Value ?? null,
        quantity: r.quantity ?? r.Quantity ?? null,
        unit: r.unit ?? r.Unit ?? null,
      })),
      truncated: records.length > 100,
    };
  } catch (e) {
    try {
      const altData = await fasGet(GATS_BASE, `/imports`, {
        ...params,
        commodityCode,
      });
      const records = Array.isArray(altData) ? altData : [];
      return {
        commodity,
        commodity_code: commodityCode,
        direction: 'imports',
        count: records.length,
        data: records.slice(0, 100),
        truncated: records.length > 100,
      };
    } catch {
      throw new Error(
        `Could not retrieve FAS import data for "${commodity}". ` +
        `The FAS API may have changed or be temporarily unavailable. ` +
        `Alternatives: (1) Visit https://apps.fas.usda.gov/gats for manual trade data, ` +
        `(2) Use fas_commodity_codes to verify the commodity code. ` +
        `Original error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

async function getProduction(args: Record<string, unknown>) {
  const commodity = args.commodity as string;
  const commodityCode = findCommodityCode(commodity) ?? commodity;

  const params: Record<string, string> = {};
  if (args.country) params.countryCode = args.country as string;
  if (args.market_year) params.marketYear = args.market_year as string;

  try {
    const data = await fasGet(PSD_BASE, `/commodity/${commodityCode}`, params);
    const records = Array.isArray(data) ? data : [];
    return {
      commodity,
      commodity_code: commodityCode,
      type: 'production_supply_distribution',
      count: records.length,
      data: records.slice(0, 100).map((r: Record<string, unknown>) => ({
        country: r.countryDesc ?? r.CountryDesc ?? r.country ?? null,
        country_code: r.countryCode ?? r.CountryCode ?? null,
        market_year: r.marketYear ?? r.MarketYear ?? null,
        attribute: r.attributeDesc ?? r.AttributeDesc ?? r.attribute ?? null,
        value: r.value ?? r.Value ?? null,
        unit: r.unitDesc ?? r.UnitDesc ?? r.unit ?? null,
      })),
      truncated: records.length > 100,
    };
  } catch (e) {
    // Try alternative endpoint
    try {
      const altData = await fasGet(PSD_BASE, '', {
        ...params,
        commodityCode,
      });
      const records = Array.isArray(altData) ? altData : [];
      return {
        commodity,
        commodity_code: commodityCode,
        type: 'production_supply_distribution',
        count: records.length,
        data: records.slice(0, 100),
        truncated: records.length > 100,
      };
    } catch {
      throw new Error(
        `Could not retrieve FAS PSD data for "${commodity}" (code: ${commodityCode}). ` +
        `The FAS PSD API may have changed or be temporarily unavailable. ` +
        `Alternatives: (1) Visit https://apps.fas.usda.gov/psdonline for manual PSD data, ` +
        `(2) Use nass_crop_production for US-specific production data, ` +
        `(3) Use fas_commodity_codes to verify the commodity code. ` +
        `Original error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

function getCommodityCodes(args: Record<string, unknown>) {
  let filtered = COMMODITY_CODES;

  if (args.category) {
    const cat = (args.category as string).toLowerCase();
    filtered = filtered.filter((c) => c.category.toLowerCase() === cat);
  }

  if (args.search) {
    const term = (args.search as string).toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term) ||
        c.code.includes(term),
    );
  }

  const grouped: Record<string, { code: string; name: string }[]> = {};
  for (const c of filtered) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push({ code: c.code, name: c.name });
  }

  return {
    total: filtered.length,
    categories: grouped,
    country_codes: COUNTRY_CODES,
    note: 'Use commodity codes with fas_production, fas_exports, and fas_imports. Country codes are ISO 2-letter codes.',
  };
}

export default { tools, callTool, meter: { credits: 5 }, provider: 'fas' } satisfies McpToolExport;
