import { randomBytes, randomUUID } from 'crypto';
import { Socket } from 'socket.io';
import jsonwebtoken from 'jsonwebtoken';
import { ErrorCode } from 'wiki-timeline-common';

const jwtKey = process.env.JWT_KEY || randomUUID();

export function getJWT(socket: Socket) {
	let jwt = socket.handshake.auth.token;
	//Check if JWT is empty. Create a new one with a unique user ID if true.
	if (!jwt) {
		const newUserID = randomBytes(16).toString('hex');
		jwt = jsonwebtoken.sign({ id: newUserID }, jwtKey);
		socket.emit('receive-token', jwt);
	}
	return jwt;
}

export function decodeJWT(jwt: string): jsonwebtoken.JwtPayload {
	let decodedJwt: jsonwebtoken.JwtPayload | string;
	//Verify if JWT is valid or not
	try {
		decodedJwt = jsonwebtoken.verify(jwt, jwtKey);
	} catch (err) {
		throw ErrorCode.JwtInvalid;
	}
	if (!decodedJwt || typeof decodedJwt === 'string') {
		throw ErrorCode.JwtInvalid;
	}
	return decodedJwt;
}
