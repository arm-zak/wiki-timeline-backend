import { EventQuestion } from './EventQuestion.js';
import { Socket } from 'socket.io';
import { decodeJWT, getJWT } from '../jwt.js';

export class Player {
	id: string;
	name: string;
	ready: boolean;
	eventQuestions: Array<EventQuestion>;
	constructor() {
		this.id = '';
		this.name = '';
		this.ready = false;
		this.eventQuestions = [];
	}
	init(id: string, name: string) {
		this.id = id;
		this.name = name;
	}

	static getPlayerID(socket: Socket) {
		const jwt = getJWT(socket);
		const decodedJwt = decodeJWT(jwt);
		return decodedJwt.id;
	}
}
