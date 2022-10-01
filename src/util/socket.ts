import { Socket } from 'socket.io';
import { Game } from '../entities/Game.js';

export async function emitGameUpdate(socket: Socket, game: Game) {
	if (game.activeEventQuestion) {
		game.activeEventQuestion.year = NaN;
	}
	socket.emit('game-update', game);
	socket.to(game.id).emit('game-update', game);
}

export async function emitTimerUpdate(socket: Socket, time: number, gameID: string) {
	socket.emit('timer-update', time);
	socket.to(gameID).emit('timer-update', time);
}
