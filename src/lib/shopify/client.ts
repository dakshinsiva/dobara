/**
 * Minimal Shopify Admin GraphQL client. One custom-app token, read-only scopes
 * (read_orders, read_customers). Also talks to the built-in sample store.
 */

export const SHOPIFY_API_VERSION = "2026-07";

export type ShopifyOrder = {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  displayFulfillmentStatus: string | null;
  customer: {
    id: string;
    displayName: string | null;
    phone: string | null;
    defaultAddress: { phone: string | null; provinceCode: string | null } | null;
  } | null;
  shippingAddress: {
    phone: string | null;
    provinceCode: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  fulfillments: Array<{
    status: string;
    displayStatus: string | null;
    deliveredAt: string | null;
    updatedAt: string;
  }>;
  lineItems: { nodes: Array<{ title: string; variantTitle: string | null; quantity: number }> };
};

export const ORDERS_QUERY = `
  query DobaraOrders($cursor: String, $q: String) {
    orders(first: 50, after: $cursor, query: $q, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        createdAt
        cancelledAt
        displayFulfillmentStatus
        customer { id displayName phone defaultAddress { phone provinceCode } }
        shippingAddress { phone provinceCode firstName lastName }
        fulfillments { status displayStatus deliveredAt updatedAt }
        lineItems(first: 10) { nodes { title variantTitle quantity } }
      }
    }
  }
`;

export const SHOP_QUERY = `query DobaraShop { shop { name } }`;

export class ShopifyError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

/** Sample store lives inside this app; real stores are *.myshopify.com. */
export function isSampleStore(shop: string): boolean {
  return /^https?:\/\/.+\/api\/sample-store$/.test(shop);
}

export function normaliseShop(input: string): string {
  const s = input.trim().replace(/\/+$/, "");
  if (isSampleStore(s)) return s;
  const host = s
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) {
    throw new ShopifyError("Enter the store's myshopify.com address, e.g. cosmix.myshopify.com");
  }
  return host;
}

export function endpointFor(shop: string): string {
  return isSampleStore(shop) ? `${shop}/graphql.json` : `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

export class ShopifyClient {
  constructor(
    private shop: string,
    private token: string
  ) {}

  async query<T>(query: string, variables: Record<string, unknown> = {}, attempt = 0): Promise<T> {
    const res = await fetch(endpointFor(this.shop), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": this.token },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      throw new ShopifyError(
        "Shopify rejected the token. Check the Admin API access token and its scopes.",
        res.status
      );
    }
    if (res.status === 404) {
      throw new ShopifyError("Store not found. Check the myshopify.com address.", 404);
    }
    if (!res.ok) throw new ShopifyError(`Shopify returned ${res.status}`, res.status);

    const json = (await res.json()) as {
      data?: T;
      errors?: Array<{ message: string; extensions?: { code?: string } }>;
    };
    if (json.errors?.length) {
      const throttled = json.errors.some((e) => e.extensions?.code === "THROTTLED" || /throttl/i.test(e.message));
      if (throttled && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        return this.query<T>(query, variables, attempt + 1);
      }
      throw new ShopifyError(json.errors.map((e) => e.message).join("; "));
    }
    if (!json.data) throw new ShopifyError("Empty response from Shopify");
    return json.data;
  }

  async shopName(): Promise<string> {
    const data = await this.query<{ shop: { name: string } }>(SHOP_QUERY);
    return data.shop.name;
  }

  /** All non-cancelled orders created since `since`, newest first. */
  async orders(since: Date): Promise<ShopifyOrder[]> {
    const out: ShopifyOrder[] = [];
    let cursor: string | null = null;
    const q = `created_at:>=${since.toISOString().slice(0, 10)}`;
    for (let page = 0; page < 40; page++) {
      const data: {
        orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ShopifyOrder[] };
      } = await this.query(ORDERS_QUERY, { cursor, q });
      out.push(...data.orders.nodes);
      if (!data.orders.pageInfo.hasNextPage) break;
      cursor = data.orders.pageInfo.endCursor;
    }
    return out;
  }
}
