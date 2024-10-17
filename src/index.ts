import { Context, Primary, Schema } from 'koishi'
import { MongoClient } from 'mongodb'

declare module 'koishi' {
  interface Tables {
    '@q78kg/messages-saver-mongodb': Message
  }
}

export const name = 'messages'

export interface Config {
  mongoUri: string
  dbName: string
  collectionName: string
  debugMode: boolean
  reconnectDelay: number
}

export const Config: Schema<Config> = Schema.object({
  mongoUri: Schema.string().required(),
  dbName: Schema.string().default('koishi'),
  collectionName: Schema.string().default('messages'),
  debugMode: Schema.boolean().default(false),
  reconnectDelay: Schema.number().default(5000), // 默认重连延迟为5秒
})

let client: MongoClient
let messagesCollection: any

async function connectToDatabase(mongoUri: string, dbName: string, collectionName:string) {
  client = new MongoClient(mongoUri)
  await client.connect()
  const database = client.db(dbName)
  messagesCollection = database.collection(collectionName)
  console.log('MongoDB connected successfully.')
}

async function reconnect(config: Config) {
  try {
    await client.connect()
    console.log('MongoDB reconnected successfully.')
  } catch (error) {
    console.error('MongoDB reconnection failed:', error)
    setTimeout(() => reconnect(config), config.reconnectDelay) // 使用配置的重连延迟
  }
}

export async function apply(ctx: Context, config: Config) {
  await connectToDatabase(config.mongoUri, config.dbName, config.collectionName)

  ctx.on('message', async (session) => {
    try {
      await messagesCollection.insertOne({
        messageId: session.messageId,
        platform: session.platform,
        channelId: session.channelId,
        guildId: session.guildId,
        userId: session.userId,
        username: session.username,
        content: session.content,
        createdAt: new Date(session.timestamp),
      })
      if (config.debugMode) {
        ctx.logger.info(`Message saved: ${session.messageId}`)
      }
    } catch (error) {
      ctx.logger.error('Error inserting message:', error)
      reconnect(config)
    }
  })

  ctx.on('message-updated', async (session) => {
    try {
      await messagesCollection.updateOne(
        {
          messageId: session.messageId,
          platform: session.platform,
          channelId: session.channelId,
        },
        {
          $set: {
            content: session.content,
            updatedAt: new Date(session.event.message.updatedAt ?? Date.now()),
          },
        }
      )
      if (config.debugMode) {
        ctx.logger.info(`Message updated: ${session.messageId}`)
      }
    } catch (error) {
      ctx.logger.error('Error updating message:', error)
      reconnect(config)
    }
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
