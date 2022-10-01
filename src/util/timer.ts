import { Socket } from 'socket.io';
import { emitTimerUpdate } from './socket.js';
import { GameEventType, GameStatus } from 'wiki-timeline-common';
import { Game } from '../entities/Game.js';

export async function runTimer(socket: Socket, game: Game, timer: NodeJS.Timer) {
	const time = game.timer - 1;
	game.timer = time;

	if (time === 0) {
		clearInterval(timer);
		if (game.status === GameStatus.Lobby) {
			await game.startGame(socket);
		} else {
			switch (game.eventLog[game.eventLog.length - 1].event) {
				case GameEventType.WrongAnswer:
					await game.continueNewPlayer(socket);
					break;
				case GameEventType.PassTurn:
					await game.continueNewPlayer(socket);
					break;
				case GameEventType.RightAnswer:
					await game.continueSamePlayer(socket);
					break;
			}
		}
	} else {
		await game.updateGame();
		await emitTimerUpdate(socket, time, game.id);
	}
}
