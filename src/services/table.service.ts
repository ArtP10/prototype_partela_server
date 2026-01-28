/**
 * ═══════════════════════════════════════════════════════════════
 * TABLE SERVICE
 * Gestiona el estado de las mesas en memoria
 * ═══════════════════════════════════════════════════════════════
 */

import { v4 as uuidv4 } from 'uuid';
import {
    Table,
    Guest,
    MenuItem,
    TableDTO,
    GuestDTO,
    PaymentMode,
    TableStatus
} from '../models';
import { config } from '../config/environment';
import {
    generateGuestItems,
    generateGuestName,
    calculateTableTotals,
    generateTableId
} from './demo-data.service';

// ─────────────────────────────────────────────────────────────
// IN-MEMORY STORE
// ─────────────────────────────────────────────────────────────

const tables: Map<string, Table> = new Map();
const socketToTable: Map<string, string> = new Map(); // socketId -> tableId
const socketToGuest: Map<string, string> = new Map(); // socketId -> guestId

// ─────────────────────────────────────────────────────────────
// TABLE OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene una mesa por ID, o la crea si no existe
 */
export function getOrCreateTable(tableId: string): Table {
    let table = tables.get(tableId);

    if (!table) {
        table = createTable(tableId);
        tables.set(tableId, table);
        console.log(`[TableService] Created new table: ${tableId}`);
    }

    return table;
}

/**
 * Crea una nueva mesa
 */
function createTable(tableId: string): Table {
    const now = new Date();

    return {
        id: tableId,
        restaurantName: 'UPTOWN',
        guests: [],
        maxGuests: config.maxGuestsPerTable,
        subtotal: 0,
        taxRate: config.defaultTaxRate,
        taxAmount: 0,
        serviceFeeRate: config.defaultServiceFeeRate,
        serviceFeeAmount: 0,
        total: 0,
        votingOpen: false,
        votes: {
            'pay_my_part': [],
            'split_equally': [],
            'custom_split': []
        },
        winningMode: null,
        itemAssignments: {},
        allItemsAssigned: false,
        remainingBalance: 0,
        tableStatus: 'viewing',
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Obtiene una mesa por ID
 */
export function getTable(tableId: string): Table | undefined {
    return tables.get(tableId);
}

/**
 * Obtiene la mesa de un socket
 */
export function getTableBySocket(socketId: string): Table | undefined {
    const tableId = socketToTable.get(socketId);
    return tableId ? tables.get(tableId) : undefined;
}

/**
 * Obtiene el guest de un socket
 */
export function getGuestBySocket(socketId: string): Guest | undefined {
    const tableId = socketToTable.get(socketId);
    const guestId = socketToGuest.get(socketId);

    if (!tableId || !guestId) return undefined;

    const table = tables.get(tableId);
    return table?.guests.find(g => g.id === guestId);
}

// ─────────────────────────────────────────────────────────────
// GUEST OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Añade un nuevo comensal a una mesa
 */
export function addGuestToTable(tableId: string, socketId: string): Guest | null {
    const table = getOrCreateTable(tableId);

    // Verificar si la mesa está llena
    if (table.guests.length >= table.maxGuests) {
        console.log(`[TableService] Table ${tableId} is full`);
        return null;
    }

    // Verificar si el socket ya está en una mesa
    if (socketToTable.has(socketId)) {
        console.log(`[TableService] Socket ${socketId} already in a table`);
        return null;
    }

    // Crear el nuevo comensal
    const guestIndex = table.guests.length;
    const guest: Guest = {
        id: uuidv4(),
        socketId,
        displayName: generateGuestName(guestIndex),
        items: generateGuestItems(),
        votedPaymentMode: null,
        selectedItemIds: [],
        paymentAmount: 0,
        paymentStatus: 'pending',
        joinedAt: new Date()
    };

    // Añadir a la mesa
    table.guests.push(guest);

    // Registrar mappings
    socketToTable.set(socketId, tableId);
    socketToGuest.set(socketId, guest.id);

    // Recalcular totales
    recalculateTableTotals(table);

    // Inicializar remainingBalance
    table.remainingBalance = table.total;

    table.updatedAt = new Date();

    console.log(`[TableService] Guest ${guest.displayName} joined table ${tableId}`);

    return guest;
}

/**
 * Elimina un comensal de una mesa
 */
export function removeGuestFromTable(socketId: string): { table: Table; guest: Guest } | null {
    const tableId = socketToTable.get(socketId);
    const guestId = socketToGuest.get(socketId);

    if (!tableId || !guestId) return null;

    const table = tables.get(tableId);
    if (!table) return null;

    const guestIndex = table.guests.findIndex(g => g.id === guestId);
    if (guestIndex === -1) return null;

    const guest = table.guests[guestIndex];

    // Eliminar comensal
    table.guests.splice(guestIndex, 1);

    // Limpiar mappings
    socketToTable.delete(socketId);
    socketToGuest.delete(socketId);

    // Recalcular totales
    recalculateTableTotals(table);

    // Renombrar comensales restantes
    table.guests.forEach((g, i) => {
        g.displayName = generateGuestName(i);
    });

    table.updatedAt = new Date();

    console.log(`[TableService] Guest ${guest.displayName} left table ${tableId}`);

    // Si la mesa está vacía, eliminarla después de un tiempo
    if (table.guests.length === 0) {
        setTimeout(() => {
            if (tables.get(tableId)?.guests.length === 0) {
                tables.delete(tableId);
                console.log(`[TableService] Empty table ${tableId} removed`);
            }
        }, 60000); // 1 minuto
    }

    return { table, guest };
}

/**
 * Recalcula los totales de una mesa
 */
function recalculateTableTotals(table: Table): void {
    const allItems = table.guests.flatMap(g => g.items);
    const totals = calculateTableTotals(
        allItems,
        table.taxRate,
        table.serviceFeeRate
    );

    table.subtotal = totals.subtotal;
    table.taxAmount = totals.taxAmount;
    table.serviceFeeAmount = totals.serviceFeeAmount;
    table.total = totals.total;
}

// ─────────────────────────────────────────────────────────────
// DTOs - Convert to client-safe objects
// ─────────────────────────────────────────────────────────────

/**
 * Convierte un Guest a GuestDTO (sin datos sensibles)
 */
export function guestToDTO(guest: Guest): GuestDTO {
    return {
        id: guest.id,
        displayName: guest.displayName,
        items: guest.items,
        votedPaymentMode: guest.votedPaymentMode,
        selectedItemIds: guest.selectedItemIds,
        paymentAmount: guest.paymentAmount,
        paymentStatus: guest.paymentStatus
    };
}

/**
 * Convierte una Table a TableDTO (sin datos sensibles)
 */
export function tableToDTO(table: Table): TableDTO {
    return {
        id: table.id,
        restaurantName: table.restaurantName,
        guests: table.guests.map(guestToDTO),
        maxGuests: table.maxGuests,
        subtotal: table.subtotal,
        taxRate: table.taxRate,
        taxAmount: table.taxAmount,
        serviceFeeRate: table.serviceFeeRate,
        serviceFeeAmount: table.serviceFeeAmount,
        total: table.total,
        votingOpen: table.votingOpen,
        votes: table.votes,
        winningMode: table.winningMode,
        itemAssignments: table.itemAssignments,
        allItemsAssigned: table.allItemsAssigned,
        remainingBalance: table.remainingBalance,
        tableStatus: table.tableStatus
    };
}

// ─────────────────────────────────────────────────────────────
// STATE UPDATES
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza el estado de una mesa
 */
export function updateTableStatus(tableId: string, status: TableStatus): void {
    const table = tables.get(tableId);
    if (table) {
        table.tableStatus = status;
        table.updatedAt = new Date();
    }
}

/**
 * Abre la votación
 */
export function openVoting(tableId: string): void {
    const table = tables.get(tableId);
    if (table) {
        table.votingOpen = true;
        table.tableStatus = 'voting';
        table.updatedAt = new Date();
    }
}

/**
 * Obtiene todos los IDs de socket de una mesa
 */
export function getTableSocketIds(tableId: string): string[] {
    const table = tables.get(tableId);
    if (!table) return [];

    return table.guests.map(g => g.socketId);
}
