import { Socket } from 'socket.io';
import { Game } from './entities/Game.js';
import { Player } from './entities/Player.js';
import { GlobalStatus } from 'wiki-timeline-common';

export function socketHandler(socket: Socket) {
	socket.on('join-game', async (userName, callback) => {
		try {
			const game = await Game.getGame(socket);
			const userID = Player.getPlayerID(socket);
			await game.connectToGame(socket, userID, userName);
			callback({ status: GlobalStatus.Ok, userID });
		} catch (error) {
			callback({ status: GlobalStatus.Error, code: error });
		}
	});
	socket.on('disconnect', async (reason) => {
		try {
			const game = await Game.getGame(socket);
			const userID = Player.getPlayerID(socket);
			await game.disconnectPlayer(socket, game, userID);
		} catch (error) {
			console.error('Error code:' + error);
		}
	});
	socket.on('ready-player', async (ready) => {
		try {
			const game = await Game.getGame(socket);
			const userID = Player.getPlayerID(socket);

			await game.handleReadyPlayer(socket, userID, ready);
		} catch (error) {
			console.error('Error code:' + error);
		}
	});

	socket.on('answer-question', async (yearIndex) => {
		try {
			const game = await Game.getGame(socket);
			const userID = Player.getPlayerID(socket);
			await game.checkAnswer(socket, userID, yearIndex);
		} catch (error) {
			console.error('Error code:' + error);
		}
	});
	socket.on('pass-question', async () => {
		try {
			const game = await Game.getGame(socket);
			const userID = Player.getPlayerID(socket);
			await game.onPassTurn(socket, userID);
		} catch (error) {
			console.error('Error code:' + error);
		}
	});
}
