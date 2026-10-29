/**
 * A built-in sample store so anyone can try the Shopify flow without credentials.
 * Deterministic orders for an Indian plant-protein brand, spread across every cohort.
 */
import type { ShopifyOrder } from "./client";

const PRODUCTS: Array<[string, string]> = [
  ["No-Nonsense Plant Protein", "Indonesian Cacao"],
  ["No-Nonsense Plant Protein", "Chikmagalur Mocha"],
  ["No-Nonsense Plant Protein", "Strawberry Shake"],
  ["Fermented Yeast Protein", "Indonesian Cacao"],
  ["Marine Collagen", "Unflavoured"],
  ["Greens Superfood", "Mint"],
];

type Seed = {
  name: string;
  state: string;
  product: number;
  /** Days ago for each order, oldest last; the first entry is the latest order */
  orders: number[];
  /** Days ago the latest order was delivered; null when the carrier never reported */
  delivered: number | null;
};

const SEEDS: Seed[] = [
  // new: first order delivered 4 to 7 days ago
  { name: "Ananya Rao", state: "KA", product: 0, orders: [8], delivered: 5 },
  { name: "Rohit Menon", state: "KL", product: 1, orders: [9], delivered: 6 },
  { name: "Priya Subramanian", state: "TN", product: 2, orders: [7], delivered: 4 },
  { name: "Karan Malhotra", state: "DL", product: 3, orders: [10], delivered: 7 },
  // running low: 24 to 59 days since the last order
  { name: "Meera Iyer", state: "TN", product: 0, orders: [27, 61], delivered: 24 },
  { name: "Arjun Shetty", state: "KA", product: 1, orders: [31], delivered: 28 },
  { name: "Neha Agarwal", state: "UP", product: 0, orders: [26, 55, 88], delivered: 23 },
  { name: "Vikram Nair", state: "MH", product: 4, orders: [35, 70], delivered: 32 },
  { name: "Divya Krishnan", state: "KA", product: 2, orders: [29], delivered: 26 },
  { name: "Sandeep Kulkarni", state: "MH", product: 0, orders: [40, 75], delivered: 37 },
  { name: "Farah Khan", state: "TG", product: 5, orders: [25], delivered: 22 },
  { name: "Harish Reddy", state: "TG", product: 1, orders: [33, 66, 99], delivered: 30 },
  // lapsed: 60+ days
  { name: "Sneha Patil", state: "MH", product: 0, orders: [75, 110], delivered: 72 },
  { name: "Aditya Verma", state: "DL", product: 3, orders: [92], delivered: 89 },
  { name: "Lakshmi Venkatesh", state: "TN", product: 2, orders: [68, 101, 140], delivered: 65 },
  { name: "Manish Jain", state: "RJ", product: 1, orders: [120], delivered: 117 },
  { name: "Kavya Hegde", state: "KA", product: 4, orders: [84, 130], delivered: 81 },
  { name: "Imran Sheikh", state: "GJ", product: 0, orders: [63], delivered: 60 },
  // active: bought recently, not due
  { name: "Tanvi Desai", state: "GJ", product: 5, orders: [3], delivered: null },
  { name: "Rahul Bhat", state: "KA", product: 0, orders: [12, 44], delivered: 9 },
  { name: "Pooja Sharma", state: "HR", product: 2, orders: [15], delivered: 12 },
  { name: "Suresh Pillai", state: "KL", product: 1, orders: [18, 50, 82], delivered: 15 },
  { name: "Nikita Joshi", state: "MH", product: 3, orders: [2], delivered: null },
  { name: "Abhishek Gowda", state: "KA", product: 0, orders: [20, 52], delivered: 17 },
];

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

/** Obviously fake, well-formed Indian mobile numbers: +91 90000 000NN. */
function phone(i: number): string {
  return `+91 90000 ${String(i + 1).padStart(5, "0")}`;
}

export function sampleOrders(): ShopifyOrder[] {
  const out: ShopifyOrder[] = [];
  let n = 1000;
  SEEDS.forEach((seed, i) => {
    const [first, last] = seed.name.split(" ");
    const [product, flavour] = PRODUCTS[seed.product];
    seed.orders.forEach((daysAgo, j) => {
      const latest = j === 0;
      const deliveredAt = latest ? seed.delivered : daysAgo - 3;
      out.push({
        id: `gid://shopify/Order/${n}`,
        name: `#${n++}`,
        createdAt: iso(daysAgo),
        cancelledAt: null,
        displayFulfillmentStatus: deliveredAt != null ? "FULFILLED" : "UNFULFILLED",
        customer: {
          id: `gid://shopify/Customer/${7000 + i}`,
          displayName: seed.name,
          phone: phone(i),
          defaultAddress: { phone: phone(i), provinceCode: seed.state },
        },
        shippingAddress: { phone: phone(i), provinceCode: seed.state, firstName: first, lastName: last },
        fulfillments:
          deliveredAt != null
            ? [
                {
                  status: "SUCCESS",
                  displayStatus: "DELIVERED",
                  deliveredAt: iso(deliveredAt),
                  updatedAt: iso(deliveredAt),
                },
              ]
            : [],
        lineItems: { nodes: [{ title: product, variantTitle: flavour, quantity: 1 }] },
      });
    });
  });
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const SAMPLE_SHOP_NAME = "Cosmix (sample store)";
