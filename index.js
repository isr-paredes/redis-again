require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');

const app = express();
const client = createClient({
    password: process.env.REDIS_AUTH,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10)
    }
});
const port = process.env.PORT || 5050;

(async () => {
    try {
        await client.connect();

        app.get('/', (req, res) => {
            res.status(200).send({
                message: "Looks like you've hit the root URL",
                availableUrls: [
                    "/write/:key/:value",
                    "/read/:key"
                ],   
            });
        });

        app.get('/read/:key', async (req, res) => {
            const key = req.params.key;
            const start = process.hrtime();
            try {
                // Get cached info and the time to get it
                let cached = null;
                const cachedValue = await client.get(key);
                if (cachedValue) {
                    const end = process.hrtime(start);
                    const duration = end[0] * 1000 + end[1] / 1000000;
                    cached = {
                        data: cachedValue,
                        source: 'cache',
                        duration: duration.toFixed(2) 
                    };
                }
        
                // Fetch from Redis to compare the time to get it 
                const redisValue = await client.get(key);
                const end = process.hrtime(start);
                const duration = end[0] * 1000 + end[1] / 1000000;
                res.status(200).send({
                    cached: cached,
                    db: {
                        data: redisValue,
                        source: 'redis',
                        duration: duration.toFixed(2)
                    }
                })
            } catch (err) {
                res.status(500).send({
                    error: err.message
                });
            }
        });

        app.get('/write/:key/:value', async (req, res) => {
            try {
                await client.set(req.params.key, req.params.value);
                res.status(200).send({
                    status: 'OK'
                });
            } catch (err) {
                res.status(500).send({
                    error: err.message
                });
            }
        });

        app.get('*', (req, res) => {
            res.status(404).send({
                message: "Que?? jaja so",
                status: 404
            });
        });

        app.listen(port, () => {
            console.log("App successfully started on http://localhost:", port);
        });

    } catch (err) {
        console.error('Error connecting to Redis:', err);
    }
})();
