/**
 * A built-in sample store so anyone can try the Shopify flow without credentials.
 * Deterministic orders for an Indian plant-protein brand: every cohort is present,
 * repeat buyers reorder on a roughly monthly cycle, and a few first orders used a
 * welcome code so the discount effect on retention is visible.
 */
import type { ShopifyOrder } from "./client";

const PRODUCTS: Array<[string, string, number]> = [
  ["No-Nonsense Plant Protein", "Indonesian Cacao", 1799],
  ["No-Nonsense Plant Protein", "Chikmagalur Mocha", 1799],
  ["No-Nonsense Plant Protein", "Strawberry Shake", 1799],
  ["Fermented Yeast Protein", "Indonesian Cacao", 1499],
  ["Marine Collagen", "Unflavoured", 1299],
  ["Greens Superfood", "Mint", 899],
];

type Seed = {
  name: string;
  state: string;
  product: number;
  /** Days ago for each order, latest first */
  orders: number[];
  /** Days ago the latest order was delivered; null when the carrier never reported */
  delivered: number | null;
  /** The first order used a welcome discount code */
  welcome?: boolean;
};

const SEEDS: Seed[] = [
  // new: first order delivered 4 to 7 days ago
  { name: "Ananya Rao", state: "KA", product: 0, orders: [8], delivered: 5 },
  { name: "Rohit Menon", state: "KL", product: 1, orders: [9], delivered: 6, welcome: true },
  { name: "Priya Subramanian", state: "TN", product: 2, orders: [7], delivered: 4 },
  { name: "Karan Malhotra", state: "DL", product: 3, orders: [10], delivered: 7, welcome: true },
  // running low: due to run out this week
  { name: "Meera Iyer", state: "TN", product: 0, orders: [27, 59, 91, 123], delivered: 24 },
  { name: "Arjun Shetty", state: "KA", product: 1, orders: [31], delivered: 28 },
  { name: "Neha Agarwal", state: "UP", product: 0, orders: [26, 58, 90, 122, 154, 186, 218], delivered: 23 },
  { name: "Vikram Nair", state: "MH", product: 4, orders: [35, 70, 105], delivered: 32 },
  { name: "Divya Krishnan", state: "KA", product: 2, orders: [29], delivered: 26 },
  { name: "Sandeep Kulkarni", state: "MH", product: 0, orders: [40, 73, 106, 139], delivered: 37 },
  { name: "Farah Khan", state: "TG", product: 5, orders: [25], delivered: 22 },
  { name: "Harish Reddy", state: "TG", product: 1, orders: [33, 66, 99, 132, 165], delivered: 30 },
  { name: "Nandini Rao", state: "TN", product: 2, orders: [45, 78, 111, 144, 177], delivered: 42 },
  { name: "Prakash Jha", state: "BR", product: 1, orders: [57, 89, 121, 153], delivered: 54 },
  { name: "Yash Patel", state: "GJ", product: 3, orders: [48, 96], delivered: 45 },
  { name: "Sameer Khan", state: "TG", product: 0, orders: [36, 68, 100], delivered: 33 },
  // lapsed: 60+ days
  { name: "Sneha Patil", state: "MH", product: 0, orders: [75, 106, 137, 168], delivered: 72 },
  { name: "Aditya Verma", state: "DL", product: 3, orders: [92], delivered: 89, welcome: true },
  { name: "Lakshmi Venkatesh", state: "TN", product: 2, orders: [68, 101, 134, 167, 200, 233], delivered: 65 },
  { name: "Manish Jain", state: "RJ", product: 1, orders: [120], delivered: 117, welcome: true },
  { name: "Kavya Hegde", state: "KA", product: 4, orders: [84, 130, 176, 222], delivered: 81 },
  { name: "Imran Sheikh", state: "GJ", product: 0, orders: [63], delivered: 60, welcome: true },
  { name: "Anita George", state: "KL", product: 5, orders: [80, 110], delivered: 77 },
  // lapsed, the August welcome-code push: one order each, never came back
  { name: "Ritika Bansal", state: "HR", product: 5, orders: [78], delivered: 75, welcome: true },
  { name: "Mohit Saxena", state: "UP", product: 3, orders: [82], delivered: 79, welcome: true },
  { name: "Deepa Nair", state: "KL", product: 0, orders: [80], delivered: 77, welcome: true },
  { name: "Varun Kapoor", state: "DL", product: 1, orders: [85], delivered: 82, welcome: true },
  { name: "Shruti Deshmukh", state: "MH", product: 2, orders: [77], delivered: 74, welcome: true },
  // active: bought recently, not due
  { name: "Tanvi Desai", state: "GJ", product: 5, orders: [3], delivered: null },
  { name: "Rahul Bhat", state: "KA", product: 0, orders: [12, 42, 72, 104], delivered: 9 },
  { name: "Pooja Sharma", state: "HR", product: 2, orders: [15], delivered: 12 },
  { name: "Suresh Pillai", state: "KL", product: 1, orders: [18, 50, 82, 114, 146, 178, 210], delivered: 15 },
  { name: "Nikita Joshi", state: "MH", product: 3, orders: [2], delivered: null },
  { name: "Abhishek Gowda", state: "KA", product: 0, orders: [20, 51, 83], delivered: 17 },
  { name: "Gautam Rao", state: "KA", product: 0, orders: [22, 54, 86, 118, 150, 182], delivered: 19 },
  { name: "Ishita Mehta", state: "GJ", product: 4, orders: [28, 72, 116, 160], delivered: 25 },
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
    const [product, flavour, price] = PRODUCTS[seed.product];
    seed.orders.forEach((daysAgo, j) => {
      const latest = j === 0;
      const earliest = j === seed.orders.length - 1;
      const deliveredAt = latest ? seed.delivered : daysAgo - 3;
      const discounted = Boolean(seed.welcome && earliest);
      const amount = discounted ? Math.round(price * 0.9) : price;
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
        currentTotalPriceSet: { shopMoney: { amount: amount.toFixed(2), currencyCode: "INR" } },
        discountCodes: discounted ? ["WELCOME10"] : [],
      });
    });
  });
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const SAMPLE_SHOP_NAME = "Cosmix (sample store)";
