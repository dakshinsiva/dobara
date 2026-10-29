import type { Contact } from "@/db/schema";
import { optionalEnv } from "./env";

/** The message a team member sends after the agent promised a reorder link. */
export function reorderMessage(contact: Pick<Contact, "name" | "brand" | "product" | "flavour">): string {
  const offer = optionalEnv("OFFER_TEXT", "10% off the next order with code DOBARA10, valid for 7 days");
  const url = optionalEnv("REORDER_URL", "https://cosmix.in");
  const product = [contact.product, contact.flavour].filter(Boolean).join(" · ") || "your order";
  return `Hi ${contact.name}, this is ${contact.brand}. As promised on the call, here is your reorder link for ${product}: ${url}\n\n${offer}`;
}

/** Opens WhatsApp with the message pre-filled; the team member presses send. */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
