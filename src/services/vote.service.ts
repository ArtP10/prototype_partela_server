/**
 * ═══════════════════════════════════════════════════════════════
 * VOTE SERVICE
 * Maneja la lógica de votación para el modo de pago
 * ═══════════════════════════════════════════════════════════════
 */

import { Table, PaymentMode, VoteResult } from '../models';
import * as tableService from './table.service';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface VoteOutcome {
    allVoted: boolean;
    isTie: boolean;
    winner: PaymentMode | null;
    tiedModes: PaymentMode[];
    results: VoteResult[];
}

// ─────────────────────────────────────────────────────────────
// VOTE OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Registra el voto de un comensal
 */
export function castVote(
    tableId: string,
    guestId: string,
    mode: PaymentMode
): { success: boolean; outcome: VoteOutcome } {
    const table = tableService.getTable(tableId);
    if (!table) {
        return {
            success: false,
            outcome: { allVoted: false, isTie: false, winner: null, tiedModes: [], results: [] }
        };
    }

    const guest = table.guests.find(g => g.id === guestId);
    if (!guest) {
        return {
            success: false,
            outcome: { allVoted: false, isTie: false, winner: null, tiedModes: [], results: [] }
        };
    }

    // Eliminar voto anterior si existe
    if (guest.votedPaymentMode) {
        const previousVotes = table.votes[guest.votedPaymentMode];
        const index = previousVotes.indexOf(guestId);
        if (index > -1) {
            previousVotes.splice(index, 1);
        }
    }

    // Registrar nuevo voto
    guest.votedPaymentMode = mode;
    table.votes[mode].push(guestId);
    table.updatedAt = new Date();

    // Calcular resultados y verificar outcome
    const outcome = checkVoteOutcome(table);

    if (outcome.allVoted && outcome.winner && !outcome.isTie) {
        table.winningMode = outcome.winner;
        table.votingOpen = false;
        table.tableStatus = 'splitting';
    }

    return { success: true, outcome };
}

/**
 * Calcula los resultados de la votación
 */
export function calculateVoteResults(table: Table): VoteResult[] {
    const totalGuests = table.guests.length;
    const results: VoteResult[] = [];

    const modes: PaymentMode[] = ['pay_my_part', 'split_equally', 'custom_split'];
    let maxVotes = 0;

    // Primera pasada: contar votos y encontrar máximo
    for (const mode of modes) {
        const voterIds = table.votes[mode];
        if (voterIds.length > maxVotes) {
            maxVotes = voterIds.length;
        }
    }

    // Segunda pasada: crear resultados
    for (const mode of modes) {
        const voterIds = table.votes[mode];
        const voterNames = voterIds
            .map(id => table.guests.find(g => g.id === id)?.displayName || 'Desconocido');

        results.push({
            mode,
            votes: voterIds.length,
            percentage: totalGuests > 0 ? (voterIds.length / totalGuests) * 100 : 0,
            isWinner: voterIds.length === maxVotes && maxVotes > 0,
            voters: voterNames
        });
    }

    return results;
}

/**
 * Verifica el resultado de la votación: ganador vs empate
 */
export function checkVoteOutcome(table: Table): VoteOutcome {
    const results = calculateVoteResults(table);
    const totalGuests = table.guests.length;
    const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);

    // No todos han votado aún
    if (totalVotes < totalGuests) {
        return {
            allVoted: false,
            isTie: false,
            winner: null,
            tiedModes: [],
            results
        };
    }

    // Todos han votado - verificar si hay empate
    const sortedResults = [...results].sort((a, b) => b.votes - a.votes);
    const maxVotes = sortedResults[0].votes;

    // Encontrar todos los modos con el mismo número máximo de votos
    const topModes = sortedResults
        .filter(r => r.votes === maxVotes && r.votes > 0)
        .map(r => r.mode);

    // Si hay más de un modo empatado, hay empate
    if (topModes.length > 1) {
        return {
            allVoted: true,
            isTie: true,
            winner: null,
            tiedModes: topModes,
            results
        };
    }

    // Hay un ganador claro
    return {
        allVoted: true,
        isTie: false,
        winner: topModes[0],
        tiedModes: [],
        results
    };
}

/**
 * Reinicia los votos para una revotación
 */
export function resetVotes(tableId: string): boolean {
    const table = tableService.getTable(tableId);
    if (!table) return false;

    // Limpiar votos de todos los comensales
    for (const guest of table.guests) {
        guest.votedPaymentMode = null;
    }

    // Reiniciar contadores de votos
    table.votes = {
        pay_my_part: [],
        split_equally: [],
        custom_split: []
    };

    table.winningMode = null;
    table.votingOpen = true;
    table.updatedAt = new Date();

    return true;
}

/**
 * Obtiene el mensaje de ganador
 */
export function getWinnerMessage(mode: PaymentMode, votes: number, total: number): string {
    const modeNames: Record<PaymentMode, string> = {
        'pay_my_part': 'Pagar Mi Parte',
        'split_equally': 'División Equitativa',
        'custom_split': 'División Personalizada'
    };

    const modeName = modeNames[mode];

    if (votes === total) {
        return `¡Todos eligieron ${modeName}!`;
    }

    return `La mayoría eligió ${modeName} (${votes}/${total})`;
}

/**
 * Obtiene el estado actual de votación
 */
export function getVotingStatus(tableId: string): {
    results: VoteResult[];
    totalVotes: number;
    totalGuests: number;
    outcome: VoteOutcome;
} {
    const table = tableService.getTable(tableId);
    if (!table) {
        return {
            results: [],
            totalVotes: 0,
            totalGuests: 0,
            outcome: { allVoted: false, isTie: false, winner: null, tiedModes: [], results: [] }
        };
    }

    const outcome = checkVoteOutcome(table);

    return {
        results: outcome.results,
        totalVotes: outcome.results.reduce((sum, r) => sum + r.votes, 0),
        totalGuests: table.guests.length,
        outcome
    };
}
