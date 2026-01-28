/**
 * ═══════════════════════════════════════════════════════════════
 * PAYMENT SERVICE
 * Maneja la lógica de procesamiento de pagos
 * ═══════════════════════════════════════════════════════════════
 */

import { PaymentInfo, Table } from '../models';
import * as tableService from './table.service';

// ─────────────────────────────────────────────────────────────
// PAYMENT OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Procesa el pago de un comensal (simulado)
 */
export function submitPayment(
    tableId: string,
    guestId: string,
    paymentInfo: PaymentInfo
): { success: boolean; allPaid: boolean } {
    const table = tableService.getTable(tableId);
    if (!table) {
        return { success: false, allPaid: false };
    }

    const guest = table.guests.find(g => g.id === guestId);
    if (!guest) {
        return { success: false, allPaid: false };
    }

    // Guardar información de pago
    guest.paymentDetails = paymentInfo;
    guest.paymentStatus = 'submitted';

    // Simular procesamiento (en producción aquí iría la integración real)
    // Por ahora, marcamos como confirmado inmediatamente
    setTimeout(() => {
        guest.paymentStatus = 'confirmed';
    }, 500);

    table.tableStatus = 'waiting_payments';
    table.updatedAt = new Date();

    // Verificar si todos han pagado
    const allPaid = checkAllPaymentsComplete(table);

    if (allPaid) {
        table.tableStatus = 'completed';
    }

    console.log(`[PaymentService] Payment received from ${guest.displayName} for REF ${guest.paymentAmount}`);

    return { success: true, allPaid };
}

/**
 * Verifica si todos los comensales han pagado
 */
function checkAllPaymentsComplete(table: Table): boolean {
    return table.guests.every(g =>
        g.paymentStatus === 'submitted' || g.paymentStatus === 'confirmed'
    );
}

/**
 * Obtiene el estado de pagos de una mesa
 */
export function getPaymentStatus(tableId: string): {
    paidCount: number;
    totalGuests: number;
    paidGuests: string[];
    pendingGuests: string[];
    allPaid: boolean;
} {
    const table = tableService.getTable(tableId);
    if (!table) {
        return {
            paidCount: 0,
            totalGuests: 0,
            paidGuests: [],
            pendingGuests: [],
            allPaid: false
        };
    }

    const paidGuests = table.guests
        .filter(g => g.paymentStatus === 'submitted' || g.paymentStatus === 'confirmed')
        .map(g => g.displayName);

    const pendingGuests = table.guests
        .filter(g => g.paymentStatus !== 'submitted' && g.paymentStatus !== 'confirmed')
        .map(g => g.displayName);

    return {
        paidCount: paidGuests.length,
        totalGuests: table.guests.length,
        paidGuests,
        pendingGuests,
        allPaid: pendingGuests.length === 0
    };
}

/**
 * Valida la información de pago
 */
export function validatePaymentInfo(info: PaymentInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!info.bank || info.bank.trim() === '') {
        errors.push('Banco es requerido');
    }

    if (!info.idType || !['V', 'E', 'J', 'P'].includes(info.idType)) {
        errors.push('Tipo de documento inválido');
    }

    if (!info.idNumber || info.idNumber.length < 6) {
        errors.push('Número de documento debe tener al menos 6 dígitos');
    }

    if (!info.phoneCode || !['0412', '0414', '0424', '0416', '0426'].includes(info.phoneCode)) {
        errors.push('Código de teléfono inválido');
    }

    if (!info.phoneNumber || info.phoneNumber.length !== 7) {
        errors.push('Número de teléfono debe tener 7 dígitos');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Obtiene el resumen de pago para un comensal
 */
export function getPaymentSummary(tableId: string, guestId: string): {
    guestName: string;
    amount: number;
    itemCount: number;
    breakdown: { description: string; amount: number }[];
} | null {
    const table = tableService.getTable(tableId);
    if (!table) return null;

    const guest = table.guests.find(g => g.id === guestId);
    if (!guest) return null;

    const breakdown: { description: string; amount: number }[] = [];

    if (table.winningMode === 'pay_my_part') {
        // Mostrar items individuales
        for (const item of guest.items) {
            breakdown.push({
                description: `${item.quantity}x ${item.name}`,
                amount: item.price * item.quantity
            });
        }
    } else if (table.winningMode === 'split_equally') {
        breakdown.push({
            description: `Total dividido entre ${table.guests.length} personas`,
            amount: guest.paymentAmount
        });
    } else if (table.winningMode === 'custom_split') {
        // Mostrar items seleccionados
        const allItems = table.guests.flatMap(g => g.items);
        for (const itemId of guest.selectedItemIds) {
            const item = allItems.find(i => i.id === itemId);
            if (item) {
                const payersCount = (table.itemAssignments[itemId] || []).length;
                const splitAmount = payersCount > 1
                    ? `(dividido entre ${payersCount})`
                    : '';
                breakdown.push({
                    description: `${item.name} ${splitAmount}`,
                    amount: item.price / Math.max(payersCount, 1)
                });
            }
        }
    }

    return {
        guestName: guest.displayName,
        amount: guest.paymentAmount,
        itemCount: breakdown.length,
        breakdown
    };
}
