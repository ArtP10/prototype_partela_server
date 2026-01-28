/**
 * ═══════════════════════════════════════════════════════════════
 * TIPOS Y MODELOS - Partela Backend
 * ═══════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────
// MENU ITEM
// ─────────────────────────────────────────────────────────────

export type ItemCategory = 'drink' | 'dish' | 'dessert';

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
    price: number;
    quantity: number;
    emoji: string;
    imageUrl?: string;
}

// ─────────────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────────────

export type PaymentMode = 'pay_my_part' | 'split_equally' | 'custom_split';
export type PaymentStatus = 'pending' | 'ready' | 'submitted' | 'confirmed';

export interface PaymentInfo {
    bank: string;
    idType: string;
    idNumber: string;
    phoneCode: string;
    phoneNumber: string;
}

// ─────────────────────────────────────────────────────────────
// GUEST
// ─────────────────────────────────────────────────────────────

export interface Guest {
    id: string;
    socketId: string;
    displayName: string;
    items: MenuItem[];

    // Voting state
    votedPaymentMode: PaymentMode | null;

    // Custom split state
    selectedItemIds: string[];

    // Payment state
    paymentAmount: number;
    paymentStatus: PaymentStatus;
    paymentDetails?: PaymentInfo;

    // Timestamps
    joinedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// VOTE RESULT
// ─────────────────────────────────────────────────────────────

export interface VoteResult {
    mode: PaymentMode;
    votes: number;
    percentage: number;
    isWinner: boolean;
    voters: string[];
}

// ─────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────

export type TableStatus =
    | 'viewing'
    | 'voting'
    | 'splitting'
    | 'paying'
    | 'waiting_payments'
    | 'completed';

export interface Table {
    id: string;
    restaurantName: string;

    // Guests
    guests: Guest[];
    maxGuests: number;

    // Totals
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    serviceFeeRate: number;
    serviceFeeAmount: number;
    total: number;

    // Voting state
    votingOpen: boolean;
    votes: Record<PaymentMode, string[]>; // mode -> [guestIds]
    winningMode: PaymentMode | null;

    // Custom split state (itemId -> [guestIds paying for it])
    itemAssignments: Record<string, string[]>;
    allItemsAssigned: boolean;
    remainingBalance: number;

    // Table status
    tableStatus: TableStatus;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// SOCKET EVENTS
// ─────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
    'table:state': (table: TableDTO) => void;
    'table:guest_joined': (data: { guest: GuestDTO; guestCount: number }) => void;
    'table:guest_left': (data: { guestId: string; displayName: string; guestCount: number }) => void;
    'vote:updated': (data: { votes: VoteResult[]; totalVotes: number; totalGuests: number }) => void;
    'vote:completed': (data: { winningMode: PaymentMode; message: string }) => void;
    'split:updated': (data: { itemAssignments: Record<string, string[]>; remainingBalance: number; allAssigned: boolean }) => void;
    'split:validated': (data: { valid: boolean; issues?: string[] }) => void;
    'payment:received': (data: { guestId: string; displayName: string }) => void;
    'table:completed': () => void;
    'error': (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
    'table:join': (data: { tableId: string }) => void;
    'table:leave': () => void;
    'vote:cast': (data: { mode: PaymentMode }) => void;
    'vote:change': (data: { mode: PaymentMode }) => void;
    'split:toggle_item': (data: { itemId: string }) => void;
    'split:confirm': () => void;
    'payment:submit': (data: PaymentInfo) => void;
}

// ─────────────────────────────────────────────────────────────
// DTOs (Data Transfer Objects - what we send to clients)
// ─────────────────────────────────────────────────────────────

export interface GuestDTO {
    id: string;
    displayName: string;
    items: MenuItem[];
    votedPaymentMode: PaymentMode | null;
    selectedItemIds: string[];
    paymentAmount: number;
    paymentStatus: PaymentStatus;
}

export interface TableDTO {
    id: string;
    restaurantName: string;
    guests: GuestDTO[];
    maxGuests: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    serviceFeeRate: number;
    serviceFeeAmount: number;
    total: number;
    votingOpen: boolean;
    votes: Record<PaymentMode, string[]>;
    winningMode: PaymentMode | null;
    itemAssignments: Record<string, string[]>;
    allItemsAssigned: boolean;
    remainingBalance: number;
    tableStatus: TableStatus;
}

// ─────────────────────────────────────────────────────────────
// MENU ITEM TEMPLATE (for demo data generation)
// ─────────────────────────────────────────────────────────────

export interface MenuItemTemplate {
    name: string;
    description: string;
    category: ItemCategory;
    price: number;
    emoji: string;
    imageUrl?: string;
}
