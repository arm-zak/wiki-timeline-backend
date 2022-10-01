import {
	GameStatus,
	Language,
	GameEvent,
	GameEventType,
	ErrorCode,
	Game as GameInterface
} from 'wiki-timeline-common';
import { redisClient } from '../redis.js';
import { Socket } from 'socket.io';
import { emitGameUpdate, emitTimerUpdate } from '../util/socket.js';
import { makeID } from '../util/makeID.js';
import { EventQuestion } from './EventQuestion.js';
import { Player } from './Player.js';
import { runTimer } from '../util/timer.js';

let timer: NodeJS.Timer;

export class Game implements GameInterface {
	activeEventQuestion: EventQuestion | null;
	activePlayer: string;
	id: string;
	language: Language;
	eventLog: Array<GameEvent>;
	maxPlayers: number;
	players: Array<Player>;
	round: number;
	status: GameStatus;
	timeLimitPlayer: number;
	timer: number;
	winningCardsAmount: number;

	constructor() {
		this.id = '';
		this.players = [];
		this.maxPlayers = NaN;
		this.activePlayer = '';
		this.activeEventQuestion = null;
		this.winningCardsAmount = NaN;
		this.timeLimitPlayer = NaN;
		this.status = GameStatus.Lobby;
		this.language = Language.English;
		this.timer = 0;
		this.round = 1;
		this.eventLog = [];
	}

	async init(
		maxPlayers: number,
		winningCardsAmount: number,
		timeLimitPlayer: number,
		lang: Language
	) {
		let id = makeID(4);
		while (await redisClient.exists(id)) {
			id = makeID(4);
		}
		this.id = id;
		this.maxPlayers = maxPlayers;
		this.winningCardsAmount = winningCardsAmount;
		this.timeLimitPlayer = timeLimitPlayer;
		this.language = lang;
	}

	map(game: Game) {
		this.id = game.id;
		this.players = game.players;
		this.maxPlayers = game.maxPlayers;
		this.activePlayer = game.activePlayer;
		this.activeEventQuestion = game.activeEventQuestion;
		this.winningCardsAmount = game.winningCardsAmount;
		this.timeLimitPlayer = game.timeLimitPlayer;
		this.status = game.status;
		this.language = game.language;
		this.timer = game.timer;
		this.round = game.round;
		this.eventLog = game.eventLog;
	}

	async updateGame() {
		await redisClient.json.set(this.id, '.', JSON.stringify(this));
		await redisClient.expire(this.id, 60 * 60);
	}

	async startGame(socket: Socket) {
		this.status = GameStatus.Active;
		this.players = this.players.sort(() => Math.random() - 0.5);
		this.activePlayer = this.players[0].id;
		await this.updateGame();
		await emitGameUpdate(socket, this);
		for (const player of this.players) {
			player.eventQuestions.push(await EventQuestion.initLockedQuestion(this.language));
		}
		this.activeEventQuestion = new EventQuestion();
		await this.activeEventQuestion.create(this.language);
		await this.updateGame();
		await emitGameUpdate(socket, this);
	}

	async connectToGame(socket: Socket, userID: string, userName: string) {
		//If player already inside game
		if (this.players.some((player) => player.id === userID)) {
			socket.join(this.id);
		}
		//If name already exists in game
		if (this.players.some((player) => player.name.toLowerCase() === userName.toLowerCase())) {
			throw ErrorCode.NameAlreadyExists;
		}
		//If game already started
		else if (this.status !== GameStatus.Lobby) {
			throw ErrorCode.GameAlreadyStarted;
		}
		//Add new player to game
		else {
			const newPlayer = new Player();
			newPlayer.init(userID, userName);
			this.players.push(newPlayer);
			await this.updateGame();
			socket.join(this.id);
		}
		await emitGameUpdate(socket, this);
	}

	async checkAnswer(socket: Socket, userID: string, yearIndex: number) {
		const question = EventQuestion.checkQuestion(this.activeEventQuestion);
		const playerIndex = this.players.findIndex((player) => player.id === userID);
		const futureQuestion = this.players[playerIndex].eventQuestions[yearIndex];
		const pastQuestion = this.players[playerIndex].eventQuestions[yearIndex - 1];
		this.timer = 10;

		if (
			(futureQuestion && futureQuestion.year < question.year) ||
			(pastQuestion && pastQuestion.year > question.year)
		) {
			await this.onWrongAnswer(socket, playerIndex, question, userID);
		} else {
			await this.onRightAnswer(socket, playerIndex, question, userID);
		}
	}

	async onWrongAnswer(
		socket: Socket,
		playerIndex: number,
		question: EventQuestion,
		userID: string
	) {
		this.eventLog.push({ playerID: userID, event: GameEventType.WrongAnswer, year: question.year });
		this.activeEventQuestion = null;
		this.players[playerIndex].eventQuestions = this.players[playerIndex].eventQuestions.filter(
			(question) => question.locked
		);
		await this.updateGame();
		await emitGameUpdate(socket, this);
		await emitTimerUpdate(socket, 10, this.id);
		timer = setInterval(() => runTimer(socket, this, timer), 1000);
	}

	async onRightAnswer(
		socket: Socket,
		playerIndex: number,
		question: EventQuestion,
		userID: string
	) {
		this.players[playerIndex].eventQuestions.push(question);
		this.players[playerIndex].eventQuestions = this.players[playerIndex].eventQuestions.sort(
			function (a, b) {
				return a.year - b.year;
			}
		);
		this.eventLog.push({ playerID: userID, event: GameEventType.RightAnswer, year: question.year });
		this.activeEventQuestion = null;
		if (this.players[playerIndex].eventQuestions.length >= this.winningCardsAmount) {
			this.status = GameStatus.Over;
			await this.updateGame();
			await emitGameUpdate(socket, this);
		} else {
			await this.updateGame();
			await emitGameUpdate(socket, this);
			await emitTimerUpdate(socket, 10, this.id);
			timer = setInterval(() => runTimer(socket, this, timer), 1000);
		}
	}

	async onPassTurn(socket: Socket, userID: string) {
		const question = EventQuestion.checkQuestion(this.activeEventQuestion);
		const playerIndex = this.players.findIndex((player) => player.id === userID);
		this.players[playerIndex].eventQuestions.forEach((question) => {
			question.locked = true;
		});
		this.eventLog.push({ playerID: userID, event: GameEventType.PassTurn, year: question.year });
		this.activeEventQuestion = null;
		this.timer = 10;
		await this.updateGame();
		await emitGameUpdate(socket, this);
		await emitTimerUpdate(socket, 10, this.id);
		timer = setInterval(() => runTimer(socket, this, timer), 1000);
	}

	async continueNewPlayer(socket: Socket) {
		const playerIndex = this.players.findIndex((player) => player.id === this.activePlayer);
		this.activePlayer = this.players[playerIndex + 1]
			? this.players[playerIndex + 1].id
			: this.players[0].id;
		this.activeEventQuestion = new EventQuestion();
		await this.activeEventQuestion.create(this.language);
		if (playerIndex === 0) {
			this.round++;
		}
		await this.updateGame();
		await emitGameUpdate(socket, this);
	}

	async continueSamePlayer(socket: Socket) {
		this.activeEventQuestion = new EventQuestion();
		await this.activeEventQuestion.create(this.language);
		await this.updateGame();
		await emitGameUpdate(socket, this);
	}

	async handleReadyPlayer(socket: Socket, userID: string, ready: boolean) {
		const playerIndex = this.players.findIndex((player) => player.id === userID);

		this.players[playerIndex].ready = ready;
		if (this.players.every((player) => player.ready)) {
			this.timer = 10;
			await this.updateGame();
			await emitTimerUpdate(socket, 10, this.id);
			await emitGameUpdate(socket, this);
			timer = setInterval(() => runTimer(socket, this, timer), 1000);
		} else {
			this.timer = 0;
			await this.updateGame();
			clearInterval(timer);
			await emitTimerUpdate(socket, 0, this.id);
			await emitGameUpdate(socket, this);
		}
	}

	async disconnectPlayer(socket: Socket, game: Game, userID: string) {
		//If game does not exist
		if (!game) {
			throw ErrorCode.GameNotFound;
		}
		game.players = game.players.filter((player) => player.id !== userID);
		await game.updateGame();
		await emitGameUpdate(socket, game);
	}

	static async createGame(
		maxPlayers: number,
		winningCards: number,
		timeLimit: number,
		lang: Language
	) {
		const game = new Game();
		await game.init(maxPlayers, winningCards, timeLimit, lang);
		await game.updateGame();
		return game.id;
	}

	static getGameID(socket: Socket) {
		const gameID = socket.handshake.query.gameID;
		//Check if room ID is undefined
		if (!gameID) {
			throw ErrorCode.GameIdNotFound;
		}
		return gameID.toString();
	}

	static async getGame(socket: Socket) {
		const gameID = this.getGameID(socket);
		const game = new Game();

		const gameJSON = await redisClient.json.get(gameID);
		if (typeof gameJSON === 'string') {
			game.map(JSON.parse(gameJSON));
		} else {
			throw ErrorCode.GameNotFound;
		}
		return game;
	}
}
