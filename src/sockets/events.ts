/**
 * ═══════════════════════════════════════════════════════════════
 * SOCKET EVENTS
 * Constantes para todos los eventos de WebSocket
 * ═══════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────
// CLIENT → SERVER EVENTS
// ─────────────────────────────────────────────────────────────

export const ClientEvents = {
    // Table
    TABLE_JOIN: 'table:join',
    TABLE_LEAVE: 'table:leave',

    // Voting
    VOTE_CAST: 'vote:cast',
    VOTE_CHANGE: 'vote:change',

    // Custom Split
    SPLIT_TOGGLE_ITEM: 'split:toggle_item',
    SPLIT_CONFIRM: 'split:confirm',

    // Payment
    PAYMENT_SUBMIT: 'payment:submit',
} as const;

// ─────────────────────────────────────────────────────────────
// SERVER → CLIENT EVENTS
// ─────────────────────────────────────────────────────────────

export const ServerEvents = {
    // Table State
    TABLE_STATE: 'table:state',
    TABLE_GUEST_JOINED: 'table:guest_joined',
    TABLE_GUEST_LEFT: 'table:guest_left',

    // Voting
    VOTE_UPDATED: 'vote:updated',
    VOTE_COMPLETED: 'vote:completed',
    VOTE_TIE: 'vote:tie',

    // Custom Split
    SPLIT_UPDATED: 'split:updated',
    SPLIT_VALIDATED: 'split:validated',

    // Payment
    PAYMENT_RECEIVED: 'payment:received',
    TABLE_COMPLETED: 'table:completed',

    // Errors
    ERROR: 'error',
} as const;

// ─────────────────────────────────────────────────────────────
// ERROR CODES
// ─────────────────────────────────────────────────────────────

export const ErrorCodes = {
    TABLE_FULL: 'TABLE_FULL',
    TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
    GUEST_NOT_FOUND: 'GUEST_NOT_FOUND',
    ALREADY_IN_TABLE: 'ALREADY_IN_TABLE',
    INVALID_PAYMENT_MODE: 'INVALID_PAYMENT_MODE',
    INVALID_PAYMENT_INFO: 'INVALID_PAYMENT_INFO',
    ITEMS_NOT_ASSIGNED: 'ITEMS_NOT_ASSIGNED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
