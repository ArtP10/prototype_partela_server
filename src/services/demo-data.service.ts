/**
 * ═══════════════════════════════════════════════════════════════
 * DEMO DATA SERVICE
 * Genera datos de prueba para comensales y mesas
 * ═══════════════════════════════════════════════════════════════
 */

import { v4 as uuidv4 } from 'uuid';
import { MenuItem, MenuItemTemplate } from '../models';
import { ALL_MENU_ITEMS, DISHES, DRINKS, DESSERTS } from '../data/menu-items';

/**
 * Obtiene un número aleatorio entre min y max (inclusive)
 */
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Selecciona un elemento aleatorio de un array
 */
function randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Selecciona N elementos sin repetir de un array
 */
function randomElements<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Genera items aleatorios para un comensal
 * Siempre incluye al menos 1 item, máximo 3
 * Prioriza variedad: intenta incluir diferentes categorías
 */
export function generateGuestItems(): MenuItem[] {
    const itemCount = randomInt(1, 3);
    const items: MenuItem[] = [];
    const usedNames = new Set<string>();

    // Garantizar al menos un plato principal
    const mainDish = randomElement(DISHES);
    items.push(createMenuItem(mainDish));
    usedNames.add(mainDish.name);

    if (itemCount >= 2) {
        // Añadir una bebida
        const drink = randomElement(DRINKS);
        if (!usedNames.has(drink.name)) {
            items.push(createMenuItem(drink));
            usedNames.add(drink.name);
        }
    }

    if (itemCount >= 3) {
        // Posibilidad de postre o otra bebida
        const addDessert = Math.random() > 0.5;
        const extraItem = addDessert
            ? randomElement(DESSERTS)
            : randomElement(DRINKS);

        if (!usedNames.has(extraItem.name)) {
            items.push(createMenuItem(extraItem));
        }
    }

    return items;
}

/**
 * Crea un MenuItem a partir de un template
 */
function createMenuItem(template: MenuItemTemplate): MenuItem {
    return {
        id: uuidv4(),
        name: template.name,
        description: template.description,
        category: template.category,
        price: template.price,
        quantity: 1,
        emoji: template.emoji,
        imageUrl: template.imageUrl
    };
}

/**
 * Genera un nombre de comensal
 */
export function generateGuestName(index: number): string {
    return `Comensal ${index + 1}`;
}

/**
 * Calcula el subtotal de una lista de items
 */
export function calculateSubtotal(items: MenuItem[]): number {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Calcula los totales de una mesa
 */
export function calculateTableTotals(
    allItems: MenuItem[],
    taxRate: number,
    serviceFeeRate: number
): { subtotal: number; taxAmount: number; serviceFeeAmount: number; total: number } {
    const subtotal = calculateSubtotal(allItems);
    const taxAmount = subtotal * taxRate;
    const serviceFeeAmount = subtotal * serviceFeeRate;
    const total = subtotal + taxAmount + serviceFeeAmount;

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        serviceFeeAmount: Math.round(serviceFeeAmount * 100) / 100,
        total: Math.round(total * 100) / 100
    };
}

/**
 * Genera un ID de mesa único
 */
export function generateTableId(): string {
    // Genera un ID corto y legible (ej: "MESA-A7B3")
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'MESA-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
