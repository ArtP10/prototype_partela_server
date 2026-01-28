/**
 * ═══════════════════════════════════════════════════════════════
 * SPLIT SERVICE
 * Maneja la lógica de división de la cuenta
 * ═══════════════════════════════════════════════════════════════
 */

import { Table, MenuItem, PaymentMode } from '../models';
import * as tableService from './table.service';

// ─────────────────────────────────────────────────────────────
// SPLIT CALCULATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Calcula el monto a pagar por cada comensal según el modo
 */
export function calculatePaymentAmounts(tableId: string): void {
    const table = tableService.getTable(tableId);
    if (!table || !table.winningMode) return;

    switch (table.winningMode) {
        case 'pay_my_part':
            calculatePayMyPart(table);
            break;
        case 'split_equally':
            calculateSplitEqually(table);
            break;
        case 'custom_split':
            calculateCustomSplit(table);
            break;
    }

    table.updatedAt = new Date();
}

/**
 * Pagar Mi Parte: cada quien paga lo que ordenó
 */
function calculatePayMyPart(table: Table): void {
    const guestCount = table.guests.length;
    let accumulatedTotal = 0;

    for (let i = 0; i < guestCount; i++) {
        const guest = table.guests[i];

        // Calculate amount for this guest
        const guestSubtotal = guest.items.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        );

        const proportion = table.subtotal > 0 ? guestSubtotal / table.subtotal : 1 / guestCount;
        const tax = table.taxAmount * proportion;
        const service = table.serviceFeeAmount * proportion;

        let amount = Math.round((guestSubtotal + tax + service) * 100) / 100;

        // If last guest, adjust amount to match total exactly
        if (i === guestCount - 1) {
            amount = Math.round((table.total - accumulatedTotal) * 100) / 100;
        }

        guest.paymentAmount = amount;
        guest.paymentStatus = 'ready';

        accumulatedTotal += amount;
    }
}

/**
 * División Equitativa: todos pagan lo mismo
 */
function calculateSplitEqually(table: Table): void {
    const guestCount = table.guests.length;
    if (guestCount === 0) return;

    let accumulatedTotal = 0;
    const baseAmount = Math.round((table.total / guestCount) * 100) / 100;

    for (let i = 0; i < guestCount; i++) {
        const guest = table.guests[i];
        let amount = baseAmount;

        // If last guest, adjust amount to match total exactly
        if (i === guestCount - 1) {
            amount = Math.round((table.total - accumulatedTotal) * 100) / 100;
        }

        guest.paymentAmount = amount;
        guest.paymentStatus = 'ready';

        accumulatedTotal += amount;
    }
}

/**
 * División Personalizada: cada quien paga los items que seleccionó
 */
function calculateCustomSplit(table: Table): void {
    // Obtener todos los items de la mesa
    const allItems = getAllTableItems(table);
    const guestCount = table.guests.length;
    let accumulatedTotal = 0;

    for (let i = 0; i < guestCount; i++) {
        const guest = table.guests[i];
        let guestTotal = 0;

        for (const itemId of guest.selectedItemIds) {
            const item = allItems.find(i => i.id === itemId);
            if (!item) continue;

            // Obtener cuántos comensales están pagando este item
            const payersCount = getItemPayersCount(table, itemId);

            if (payersCount > 0) {
                // Dividir el precio entre los que pagan
                guestTotal += item.price / payersCount;
            }
        }

        // Añadir proporción de impuestos y servicio
        const proportion = table.subtotal > 0 ? guestTotal / table.subtotal : 0;
        const tax = table.taxAmount * proportion;
        const service = table.serviceFeeAmount * proportion;

        let amount = Math.round((guestTotal + tax + service) * 100) / 100;

        // If last guest and all items are assigned, adjust amount to match total exactly
        // Only if table is fully assigned, otherwise sum < total is expected
        if (i === guestCount - 1 && table.allItemsAssigned) {
            amount = Math.round((table.total - accumulatedTotal) * 100) / 100;
        }

        guest.paymentAmount = amount;

        accumulatedTotal += amount;
    }
}

// ─────────────────────────────────────────────────────────────
// CUSTOM SPLIT OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Toggle la selección de un item para un comensal
 */
export function toggleItemSelection(
    tableId: string,
    guestId: string,
    itemId: string
): { success: boolean; itemAssignments: Record<string, string[]>; remainingBalance: number; allAssigned: boolean } {
    const table = tableService.getTable(tableId);
    if (!table) {
        return { success: false, itemAssignments: {}, remainingBalance: 0, allAssigned: false };
    }

    const guest = table.guests.find(g => g.id === guestId);
    if (!guest) {
        return { success: false, itemAssignments: {}, remainingBalance: 0, allAssigned: false };
    }

    // Toggle en la lista del comensal
    const index = guest.selectedItemIds.indexOf(itemId);
    if (index > -1) {
        guest.selectedItemIds.splice(index, 1);
    } else {
        guest.selectedItemIds.push(itemId);
    }

    // Actualizar itemAssignments global
    updateItemAssignments(table);

    // Calcular balance restante
    const { remainingBalance, allAssigned } = calculateRemainingBalance(table);
    table.remainingBalance = remainingBalance;
    table.allItemsAssigned = allAssigned;

    table.updatedAt = new Date();

    return {
        success: true,
        itemAssignments: table.itemAssignments,
        remainingBalance,
        allAssigned
    };
}

/**
 * Actualiza el mapa de asignaciones de items
 */
function updateItemAssignments(table: Table): void {
    const allItems = getAllTableItems(table);
    const assignments: Record<string, string[]> = {};

    for (const item of allItems) {
        const payers = table.guests
            .filter(g => g.selectedItemIds.includes(item.id))
            .map(g => g.id);

        assignments[item.id] = payers;
    }

    table.itemAssignments = assignments;
}

/**
 * Calcula el balance restante (items sin asignar)
 */
function calculateRemainingBalance(table: Table): { remainingBalance: number; allAssigned: boolean } {
    const allItems = getAllTableItems(table);
    let unassignedTotal = 0;
    let allAssigned = true;

    for (const item of allItems) {
        const payers = table.itemAssignments[item.id] || [];
        if (payers.length === 0) {
            unassignedTotal += item.price * item.quantity;
            allAssigned = false;
        }
    }

    // Añadir impuestos y servicio proporcionales al balance restante
    if (table.subtotal > 0) {
        const proportion = unassignedTotal / table.subtotal;
        unassignedTotal += (table.taxAmount + table.serviceFeeAmount) * proportion;
    }

    return {
        remainingBalance: Math.round(unassignedTotal * 100) / 100,
        allAssigned
    };
}

/**
 * Confirma la selección de un comensal
 */
export function confirmSelection(tableId: string, guestId: string): boolean {
    const table = tableService.getTable(tableId);
    if (!table) return false;

    const guest = table.guests.find(g => g.id === guestId);
    if (!guest) return false;

    guest.paymentStatus = 'ready';
    table.updatedAt = new Date();

    // Verificar si todos han confirmado
    const allConfirmed = table.guests.every(g => g.paymentStatus === 'ready');

    if (allConfirmed && table.allItemsAssigned) {
        // Calcular montos finales
        calculateCustomSplit(table);
        table.tableStatus = 'paying';
    }

    return allConfirmed && table.allItemsAssigned;
}

/**
 * Valida que todos los items estén asignados
 */
export function validateCustomSplit(tableId: string): { valid: boolean; issues: string[] } {
    const table = tableService.getTable(tableId);
    if (!table) {
        return { valid: false, issues: ['Mesa no encontrada'] };
    }

    const issues: string[] = [];
    const allItems = getAllTableItems(table);

    for (const item of allItems) {
        const payers = table.itemAssignments[item.id] || [];
        if (payers.length === 0) {
            issues.push(`${item.name} no tiene a nadie asignado`);
        }
    }

    return {
        valid: issues.length === 0,
        issues
    };
}

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene todos los items de una mesa
 */
function getAllTableItems(table: Table): MenuItem[] {
    return table.guests.flatMap(g => g.items);
}

/**
 * Cuenta cuántos comensales están pagando un item
 */
function getItemPayersCount(table: Table, itemId: string): number {
    return (table.itemAssignments[itemId] || []).length;
}

/**
 * Obtiene información de split para un item específico
 */
export function getItemSplitInfo(
    tableId: string,
    itemId: string
): { payerNames: string[]; splitAmount: number } | null {
    const table = tableService.getTable(tableId);
    if (!table) return null;

    const allItems = getAllTableItems(table);
    const item = allItems.find(i => i.id === itemId);
    if (!item) return null;

    const payerIds = table.itemAssignments[itemId] || [];
    const payerNames = payerIds
        .map(id => table.guests.find(g => g.id === id)?.displayName || 'Desconocido');

    const splitAmount = payerIds.length > 0
        ? Math.round((item.price / payerIds.length) * 100) / 100
        : item.price;

    return { payerNames, splitAmount };
}
