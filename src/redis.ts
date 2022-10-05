import {createClient, RedisClientType} from "redis";

const redisUser = process.env.REDIS_USER
const redisPass = process.env.REDIS_PASS
const redisUrl = process.env.REDIS_URL
const redisPort = process.env.REDIS_PORT


export let redisClient : RedisClientType
export async function initRedisConnnection() {
    redisClient = createClient({
        url: `redis://${redisUrl}:${redisPort}`
    });

    await redisClient.connect()
}
