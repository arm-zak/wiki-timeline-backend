import { Express } from 'express';

import { Game } from './entities/Game.js';
import { Language } from 'wiki-timeline-common';

export function initRoutes(app: Express) {
	app.post('/create', async (req, res) => {
		const maxPlayers: number = req.body.maxPlayers;
		const timeLimit: number = req.body.timeLimit;
		const winningCards: number = req.body.winningCards;
		const language: Language = req.body.language;
		const gameID = await Game.createGame(maxPlayers, winningCards, timeLimit, language);
		res.send(gameID);
	});
}
