import { Server } from 'socket.io';
import { socketHandler } from './socketHandler.js';
import { createServer } from 'http';
import express from 'express';
import { initRoutes } from './routes.js';
import cors from 'cors';
import { initDbConnnection } from './db.js';
import { initRedisConnnection } from './redis.js';

initServer();

async function initServer() {
	const app = express();
	const httpServer = createServer(app);
	const port = parseInt(process.env.PORT || '') || 8080;
	const io = new Server(httpServer, {
		cors: {
			origin: process.env.CLIENT_URL
		}
	});
	app.use(cors({ origin: process.env.CLIENT_URL }));
	app.use(express.json());
	await initDbConnnection();
	await initRedisConnnection();
	initRoutes(app);
	io.on('connection', socketHandler);
	httpServer.listen(port);
	console.log('Server started on port ' + port);
}
