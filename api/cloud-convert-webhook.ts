import { VercelRequest, VercelResponse } from '@vercel/node'
import { Telegraf } from 'telegraf'
import assert from 'assert'

export default async function(req: VercelRequest, res: VercelResponse) {
  console.log('[cloud-convert-webhook]', req.body.event, req.body.job.id, req.body.job.status)
  
  assert(process.env.TELEGRAM_BOT_TOKEN)

  try {
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
    const payload = req.body as CloudConverRes
    const tag = JSON.parse(payload.job.tag)
    const chatId = tag.chat_id
    const messageId = tag.message_id
    const filename = tag.filename
    
    if (payload.event === 'job.failed') {
      console.error(req.body);
      
      await bot.telegram.sendMessage(chatId, 'Cannot convert ' + filename, {
        reply_to_message_id: messageId,
        allow_sending_without_reply: true,
      })
      res.send('OK')
      return
    }
  
    if (payload.event === 'job.finished') {
      const resultTask = payload.job.tasks.find(
        task => task.status === 'finished' && task.operation === 'export/url')
  
      await bot.telegram.sendVideo(chatId, resultTask!.result.files[0].url, {
        caption: `Convert ${ filename } success`,
        reply_to_message_id: messageId,
        allow_sending_without_reply: true,
      })
    } 
  } catch (error) {
    console.error(error)
  }

  res.send('OK')
}

interface CloudConverRes {
  event: 'job.created' | 'job.finished' | 'job.failed';
  job: Job;
}

interface Job {
  id: string;
  tag: string;
  status?: any;
  created_at: string;
  started_at?: any;
  ended_at?: any;
  tasks: Task[];
  links: Links;
}

interface Task {
  id: string;
  name: string;
  operation: string;
  status: string;
  message?: any;
  percent: number;
  result: Result;
  created_at: string;
  started_at: string;
  ended_at: string;
  depends_on_task_ids: any[];
  links: Links;
}

interface Links {
  self: string;
}

interface Result {
  files: File[];
}

interface File {
  filename: string;
  url: string;
}
