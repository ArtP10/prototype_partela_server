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
 * Añade un nuevo comensal a una mesa o reconecta uno existente
 */
export function addGuestToTable(tableId: string, socketId: string, existingGuestId?: string): Guest | null {
    const table = getOrCreateTable(tableId);

    // 1. Intentar reconexión si se provee ID
    if (existingGuestId) {
        const existingGuest = table.guests.find(g => g.id === existingGuestId);
        if (existingGuest) {
            console.log(`[TableService] Guest ${existingGuest.displayName} reconnected to table ${tableId}`);

            // Actualizar socket y estado online
            existingGuest.socketId = socketId;
            existingGuest.isOnline = true;

            // Actualizar mappings
            socketToTable.set(socketId, tableId);
            socketToGuest.set(socketId, existingGuestId);

            table.updatedAt = new Date();
            return existingGuest;
        }
    }

    // 2. Si no es reconexión, verificar cupo
    if (table.guests.length >= table.maxGuests) {
        console.log(`[TableService] Table ${tableId} is full`);
        return null;
    }

    // Verificar si el socket ya está en una mesa (sanity check)
    if (socketToTable.has(socketId)) {
        console.log(`[TableService] Socket ${socketId} already in a table`);
        return null;
    }

    // 3. Crear nuevo comensal
    const guestIndex = table.guests.length; // TODO: Mejorar lógica de nombres si hay huecos
    const guest: Guest = {
        id: uuidv4(),
        socketId,
        displayName: generateGuestName(guestIndex),
        items: generateGuestItems(),
        votedPaymentMode: null,
        selectedItemIds: [],
        paymentAmount: 0,
        paymentStatus: 'pending',
        joinedAt: new Date(),
        isOnline: true
    };

    // Añadir a la mesa
    table.guests.push(guest);

    // Registrar mappings
    socketToTable.set(socketId, tableId);
    socketToGuest.set(socketId, guest.id);

    // Recalcular totales
    recalculateTableTotals(table);

    // Inicializar remainingBalance si es el primero
    if (table.guests.length === 1) {
        table.remainingBalance = table.total;
    }

    table.updatedAt = new Date();

    console.log(`[TableService] Guest ${guest.displayName} joined table ${tableId}`);

    return guest;
}

/**
 * Maneja la desconexión de un socket (Soft Delete / Offline)
 */
export function handleGuestDisconnect(socketId: string): { table: Table; guest: Guest } | null {
    const tableId = socketToTable.get(socketId);
    const guestId = socketToGuest.get(socketId);

    if (!tableId || !guestId) return null;

    const table = tables.get(tableId);
    if (!table) return null;

    const guest = table.guests.find(g => g.id === guestId);
    if (!guest) return null;

    // Marcar como desconectado pero NO eliminar
    guest.isOnline = false;

    // Limpiar mappings de socket (el usuario necesitará nuevo socket ID al volver)
    socketToTable.delete(socketId);
    socketToGuest.delete(socketId);

    console.log(`[TableService] Guest ${guest.displayName} disconnected (offline) from table ${tableId}`);

    return { table, guest };
}

/**
 * Reinicia la mesa completamente
 */
export function resetTable(tableId: string): Table | null {
    const table = tables.get(tableId);
    if (!table) return null;

    console.log(`[TableService] Resetting table ${tableId}`);

    // Resetear estado general
    table.tableStatus = 'viewing';
    table.votingOpen = false;
    table.votes = {
        'pay_my_part': [],
        'split_equally': [],
        'custom_split': []
    };
    table.winningMode = null;
    table.itemAssignments = {};
    table.allItemsAssigned = false;

    // Resetear guests (sin eliminarlos)
    table.guests.forEach(g => {
        g.votedPaymentMode = null;
        g.selectedItemIds = [];
        g.paymentAmount = 0;
        g.paymentStatus = 'pending';
        delete g.paymentDetails;
    });

    // Recalcular
    recalculateTableTotals(table);
    table.remainingBalance = table.total;
    table.updatedAt = new Date();

    return table;
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
        paymentStatus: guest.paymentStatus,
        isOnline: guest.isOnline
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
