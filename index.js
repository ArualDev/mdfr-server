import express from 'express'
import * as fs from 'fs';

import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
ffmpeg.setFfmpegPath(ffmpegPath)

import { v1 as uuidv1 } from 'uuid';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express()

function combine(videoPath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .input(audioPath)
            .audioCodec('copy')
            .output(outputPath)
            .outputFormat('mp4')
            .on('end', e => {
                resolve()
            })
            .on('error', error => {
                reject(error)
            })
            .run()
    });
}

async function createDownload(id, videoUrl, audioUrl) {
    const outputPath = `/output/${id}/video.mp4`;
    fs.mkdirSync(`./output/${id}`);

    try {
        await combine(videoUrl, audioUrl, '.' + outputPath)
    } catch (err) {
        throw ('An error occurred while processing files.');
    }
    return `${__dirname}/${outputPath}`
}

app.get('/combine', async (req, res) => {
    if (!req.query?.video_url || !req.query?.audio_url) {
        res.json('Wrong request parameters.')
        return
    }

    try {
        const id = uuidv1();
        const filePath = await createDownload(id, req.query.video_url, req.query.audio_url);
        res.download(filePath, error => {
            fs.rm(`./output/${id}`, { recursive: true }, () => { })
        });
    } catch (err) {
        res.json(err)
    }

})

app.get('/', (req, res) => {
    res.send('Server is running...')
})

function init() {

    const configFile = fs.readFileSync('config.json');
    const configData = JSON.parse(configFile);

    const port = configData?.port && Number.isInteger(configData.port) ? configData.port : 21370

    const server = app.listen(port)
    console.log('Server is running...')

    // Close the server on any interruption event
    for (const event of ['SIGINT', 'SIGQUIT', 'SIGTERM']) {
        process.on(event, _ => {
            server.close();
        })
    }
}

init();
