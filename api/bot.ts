import { VercelRequest, VercelResponse } from '@vercel/node'
import { Telegraf } from 'telegraf'
import assert from 'assert'
import got from 'got'

export default async function (req: VercelRequest, res: VercelResponse) {
  console.log('webhook', JSON.stringify(req.body.message))

  assert(process.env.CLOUD_CONVERT_API_KEY)
  assert(process.env.TELEGRAM_BOT_TOKEN)

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

  if (!(req.body.message != null && req.body.message.video != null)) {
    res.send('OK')
    return
  }

  try {
    const linkRes = await bot.telegram.getFileLink(req.body.message.video.file_id)
    console.log('linkRes', linkRes.toString())

    const convertOptions = {
      tasks: {
        'import-1': {
          operation: 'import/url',
          url: linkRes.toString(),
          filename: req.body.message.video.file_name
        },
        'task-1': {
          operation: 'convert',
          input_format: 'mov',
          output_format: 'mp4',
          engine: 'ffmpeg',
          input: [
            'import-1'
          ],
          video_codec: 'x264',
          crf: 40,
          preset: 'fast',
          profile: 'baseline',
          fps: 24,
          subtitles_mode: 'none',
          audio_codec: 'aac',
          audio_bitrate: 128,
          channels: 1,
          sample_rate: 44100
        },
        'export-1': {
          operation: 'export/url',
          input: [
            'task-1'
          ],
          inline: false,
          archive_multiple_files: false
        }
      },
      tag: JSON.stringify({
        chat_id: req.body.message.chat.id,
        message_id: req.body.message.message_id,
        filename: req.body.message.video.file_name,
      })
    }

    const convertRes = await got
      .post(`${ process.env.CLOUD_CONVERT_URL }/jobs`, {
        headers: {
          Authorization: 'Bearer ' + process.env.CLOUD_CONVERT_API_KEY
        },
        json: convertOptions
      })
      .json<{ data: unknown }>()

    console.log('Job created', JSON.stringify(convertRes.data))

    await bot.telegram.sendMessage(req.body.message.chat.id, 'Processing your file 💿', {
      reply_to_message_id: req.body.message.message_id,
      allow_sending_without_reply: true
    })
  } catch (error) {
    console.error(error);
  }

  res.send('OK')
}