import { Context, Primary, Schema } from 'koishi'

declare module 'koishi' {
  interface Tables {
    '@hieuzest/messages': Message
  }
}

export const name = 'messages'

export const inject = ['database']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.model.extend('@hieuzest/messages', {
    id: 'primary',
    messageId: 'string',
    platform: 'string',
    channelId: 'string',
    guildId: 'string',
    userId: 'string',
    username: 'string',
    content: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  })

  ctx.on('message', async (session) => {
    await ctx.database.create('@hieuzest/messages', {
      messageId: session.messageId,
      platform: session.platform,
      channelId: session.channelId,
      guildId: session.guildId,
      userId: session.userId,
      username: session.username,
      content: session.content,
      createdAt: new Date(session.timestamp),
    })
  })

  ctx.on('message-updated', async (session) => {
    await ctx.database.set('@hieuzest/messages', {
      messageId: session.messageId,
      platform: session.platform,
      channelId: session.channelId,
    }, {
      content: session.content,
      updatedAt: new Date(session.event.message.updatedAt ?? Date.now()),
    })
  })
}

interface Message {
  id: Primary
  messageId: string
  platform: string
  channelId: string
  guildId: string
  userId: string
  username: string
  content: string
  createdAt: Date
  updatedAt: Date
}
