/**
 * ═══════════════════════════════════════════════════════════════
 * SOCKET SERVER SETUP
 * Configura Socket.IO y registra todos los handlers
 * ═══════════════════════════════════════════════════════════════
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config/environment';
import { ClientEvents, ServerEvents, ErrorCodes } from './events';
import * as tableService from '../services/table.service';
import * as voteService from '../services/vote.service';
import * as splitService from '../services/split.service';
import * as paymentService from '../services/payment.service';
import { PaymentMode, PaymentInfo } from '../models';

let io: Server;

/**
 * Inicializa el servidor Socket.IO
 */
export function initializeSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigins,
            methods: ['GET', 'POST'],
            credentials: false
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on('connection', handleConnection);

    console.log('[Socket] Socket.IO server initialized');

    return io;
}

/**
 * Obtiene la instancia de Socket.IO
 */
export function getIO(): Server {
    return io;
}

/**
 * Maneja una nueva conexión
 */
function handleConnection(socket: Socket): void {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ───────────────────────────────────────────────────────────
    // TABLE EVENTS
    // ───────────────────────────────────────────────────────────

    socket.on(ClientEvents.TABLE_JOIN, (data: { tableId: string, guestId?: string }) => {
        try {
            const { tableId, guestId } = data;

            if (!tableId) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.TABLE_NOT_FOUND,
                    message: 'ID de mesa no proporcionado'
                });
                return;
            }

            // Intentar unirse o reconectarse a la mesa
            const guest = tableService.addGuestToTable(tableId, socket.id, guestId);

            if (!guest) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.TABLE_FULL,
                    message: 'La mesa está llena o ya estás en una mesa'
                });
                return;
            }

            // Unir al room de la mesa
            socket.join(tableId);

            // Obtener estado actualizado de la mesa
            const table = tableService.getTable(tableId);
            if (!table) return;

            const tableDTO = tableService.tableToDTO(table);

            // Enviar estado completo al nuevo comensal
            socket.emit(ServerEvents.TABLE_STATE, tableDTO);

            // Notificar a otros comensales (solo si es nuevo o estaba offline)
            socket.to(tableId).emit(ServerEvents.TABLE_GUEST_JOINED, {
                guest: tableService.guestToDTO(guest),
                guestCount: table.guests.length
            });

            // Enviar estado actualizado a todos
            io.to(tableId).emit(ServerEvents.TABLE_STATE, tableDTO);

            console.log(`[Socket] ${guest.displayName} joined/reconnected table ${tableId}`);
        } catch (error) {
            console.error('[Socket] Error in TABLE_JOIN:', error);
            socket.emit(ServerEvents.ERROR, {
                code: ErrorCodes.UNKNOWN_ERROR,
                message: 'Error al unirse a la mesa'
            });
        }
    });

    socket.on('table:reset', () => {
        try {
            const table = tableService.getTableBySocket(socket.id);
            if (!table) return;

            console.log(`[Socket] Reset requested for table ${table.id}`);
            const resetTable = tableService.resetTable(table.id);

            if (resetTable) {
                io.to(table.id).emit(ServerEvents.TABLE_STATE, tableService.tableToDTO(resetTable));
            }
        } catch (error) {
            console.error('[Socket] Error in TABLE_RESET:', error);
        }
    });

    socket.on(ClientEvents.TABLE_LEAVE, () => {
        handleDisconnect(socket);
    });

    // ───────────────────────────────────────────────────────────
    // VOTE EVENTS
    // ───────────────────────────────────────────────────────────

    socket.on(ClientEvents.VOTE_CAST, (data: { mode: PaymentMode }) => {
        try {
            const { mode } = data;

            const table = tableService.getTableBySocket(socket.id);
            const guest = tableService.getGuestBySocket(socket.id);

            if (!table || !guest) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.GUEST_NOT_FOUND,
                    message: 'No estás en una mesa'
                });
                return;
            }

            // Abrir votación si no está abierta
            if (!table.votingOpen) {
                tableService.openVoting(table.id);
            }

            // Registrar voto
            const { success, outcome } = voteService.castVote(
                table.id,
                guest.id,
                mode
            );

            if (!success) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.INVALID_PAYMENT_MODE,
                    message: 'Error al registrar voto'
                });
                return;
            }

            // Notificar a todos los comensales
            io.to(table.id).emit(ServerEvents.VOTE_UPDATED, {
                votes: outcome.results,
                totalVotes: outcome.results.reduce((sum, r) => sum + r.votes, 0),
                totalGuests: table.guests.length
            });

            // Si todos votaron, verificar resultado
            if (outcome.allVoted) {
                if (outcome.isTie) {
                    // ¡EMPATE! Notificar y reiniciar votos
                    io.to(table.id).emit(ServerEvents.VOTE_TIE, {
                        tiedModes: outcome.tiedModes,
                        message: '¡Hubo un empate! Vuelvan a votar para desempatar.'
                    });

                    // Reiniciar votos después de un pequeño delay
                    setTimeout(() => {
                        voteService.resetVotes(table.id);

                        // Enviar estado actualizado
                        const updatedTable = tableService.getTable(table.id);
                        if (updatedTable) {
                            io.to(table.id).emit(ServerEvents.TABLE_STATE, tableService.tableToDTO(updatedTable));
                            io.to(table.id).emit(ServerEvents.VOTE_UPDATED, {
                                votes: [],
                                totalVotes: 0,
                                totalGuests: updatedTable.guests.length
                            });
                        }
                    }, 3000); // 3 segundos para mostrar el mensaje de empate

                    console.log(`[Socket] Vote tie in table ${table.id}: ${outcome.tiedModes.join(' vs ')}`);
                } else if (outcome.winner) {
                    // ¡HAY GANADOR!
                    const message = voteService.getWinnerMessage(
                        outcome.winner,
                        outcome.results.find(r => r.mode === outcome.winner)?.votes || 0,
                        table.guests.length
                    );

                    io.to(table.id).emit(ServerEvents.VOTE_COMPLETED, {
                        winningMode: outcome.winner,
                        message
                    });

                    // Calcular montos de pago
                    splitService.calculatePaymentAmounts(table.id);

                    // Enviar estado actualizado
                    const updatedTable = tableService.getTable(table.id);
                    if (updatedTable) {
                        io.to(table.id).emit(ServerEvents.TABLE_STATE, tableService.tableToDTO(updatedTable));
                    }

                    console.log(`[Socket] Vote completed in table ${table.id}: ${outcome.winner} wins!`);
                }
            }

            console.log(`[Socket] ${guest.displayName} voted for ${mode}`);
        } catch (error) {
            console.error('[Socket] Error in VOTE_CAST:', error);
            socket.emit(ServerEvents.ERROR, {
                code: ErrorCodes.UNKNOWN_ERROR,
                message: 'Error al votar'
            });
        }
    });

    // ───────────────────────────────────────────────────────────
    // SPLIT EVENTS
    // ───────────────────────────────────────────────────────────

    socket.on(ClientEvents.SPLIT_TOGGLE_ITEM, (data: { itemId: string }) => {
        try {
            const { itemId } = data;

            const table = tableService.getTableBySocket(socket.id);
            const guest = tableService.getGuestBySocket(socket.id);

            if (!table || !guest) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.GUEST_NOT_FOUND,
                    message: 'No estás en una mesa'
                });
                return;
            }

            const { success, itemAssignments, remainingBalance, allAssigned } =
                splitService.toggleItemSelection(table.id, guest.id, itemId);

            if (!success) return;

            // Notificar a todos
            io.to(table.id).emit(ServerEvents.SPLIT_UPDATED, {
                itemAssignments,
                remainingBalance,
                allAssigned
            });

            // Enviar estado actualizado
            const updatedTable = tableService.getTable(table.id);
            if (updatedTable) {
                io.to(table.id).emit(ServerEvents.TABLE_STATE, tableService.tableToDTO(updatedTable));
            }
        } catch (error) {
            console.error('[Socket] Error in SPLIT_TOGGLE_ITEM:', error);
        }
    });

    socket.on(ClientEvents.SPLIT_CONFIRM, () => {
        try {
            const table = tableService.getTableBySocket(socket.id);
            const guest = tableService.getGuestBySocket(socket.id);

            if (!table || !guest) return;

            const allConfirmed = splitService.confirmSelection(table.id, guest.id);

            if (allConfirmed) {
                // Validar que todos los items estén asignados
                const validation = splitService.validateCustomSplit(table.id);

                io.to(table.id).emit(ServerEvents.SPLIT_VALIDATED, {
                    valid: validation.valid,
                    issues: validation.issues
                });

                if (validation.valid) {
                    // Enviar estado actualizado
                    const updatedTable = tableService.getTable(table.id);
                    if (updatedTable) {
                        io.to(table.id).emit(ServerEvents.TABLE_STATE, tableService.tableToDTO(updatedTable));
                    }
                }
            }
        } catch (error) {
            console.error('[Socket] Error in SPLIT_CONFIRM:', error);
        }
    });

    // ───────────────────────────────────────────────────────────
    // PAYMENT EVENTS
    // ───────────────────────────────────────────────────────────

    socket.on(ClientEvents.PAYMENT_SUBMIT, (data: PaymentInfo) => {
        try {
            const table = tableService.getTableBySocket(socket.id);
            const guest = tableService.getGuestBySocket(socket.id);

            if (!table || !guest) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.GUEST_NOT_FOUND,
                    message: 'No estás en una mesa'
                });
                return;
            }

            // Validar información de pago
            const validation = paymentService.validatePaymentInfo(data);
            if (!validation.valid) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.INVALID_PAYMENT_INFO,
                    message: validation.errors.join(', ')
                });
                return;
            }

            // Procesar pago
            const { success, allPaid } = paymentService.submitPayment(
                table.id,
                guest.id,
                data
            );

            if (!success) {
                socket.emit(ServerEvents.ERROR, {
                    code: ErrorCodes.UNKNOWN_ERROR,
                    message: 'Error al procesar el pago'
                });
                return;
            }

            // Notificar a todos que este comensal pagó
            io.to(table.id).emit(ServerEvents.PAYMENT_RECEIVED, {
                guestId: guest.id,
                displayName: guest.displayName
            });

            // Si todos pagaron
            if (allPaid) {
                io.to(table.id).emit(ServerEvents.TABLE_COMPLETED);
            }

            // Enviar estado actualizado
            const updatedTable = tableService.getTable(table.id);
            if (updatedTable) {
                io.to(table.id).emit(ServerEvents.TABLE_STATE, tableService.tableToDTO(updatedTable));
            }

            console.log(`[Socket] ${guest.displayName} submitted payment. All paid: ${allPaid}`);
        } catch (error) {
            console.error('[Socket] Error in PAYMENT_SUBMIT:', error);
            socket.emit(ServerEvents.ERROR, {
                code: ErrorCodes.UNKNOWN_ERROR,
                message: 'Error al procesar el pago'
            });
        }
    });

    // ───────────────────────────────────────────────────────────
    // DISCONNECT
    // ───────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
}

/**
 * Maneja la desconexión de un socket
 */
/**
 * Maneja la desconexión de un socket
 */
function handleDisconnect(socket: Socket): void {
    // Usar handleGuestDisconnect en lugar de removeGuestFromTable
    const result = tableService.handleGuestDisconnect(socket.id);

    if (result) {
        const { table, guest } = result;

        // Notificar a otros comensales (opcional, para UI "offline")
        // No emitimos TABLE_GUEST_LEFT para que no desaparezca de la lista

        // Enviar estado actualizado (para que se marque como offline si la UI lo soporta)
        const updatedTable = tableService.getTable(table.id);
        if (updatedTable) {
            // Verificar si los que quedan online ya pagaron todos
            // TODO: Importar lógica de verificación de pagos si se desea auto-completar

            io.to(table.id).emit(ServerEvents.TABLE_STATE, tableService.tableToDTO(updatedTable));
        }

        console.log(`[Socket] ${guest.displayName} set to offline in table ${table.id}`);
    }

    console.log(`[Socket] Client disconnected: ${socket.id}`);
}
