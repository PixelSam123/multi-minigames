import type { TicTacToeTurnPayload } from '../../../types'

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Socket, Server } from 'socket.io'

@WebSocketGateway({
  cors: {
    origin: 'http://localhost',
    methods: ['GET', 'POST']
  },
  serveClient: false
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name)

  @WebSocketServer()
  server: Server

  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Connection: ${client.id}`)
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Disconnection: ${client.id}`)
  }

  afterInit() {
    this.server.of('/').adapter.on('join-room', (room, id) => {
      this.logger.log(`Room Joined: ${room} by ${id}`)
    })
    this.server.of('/').adapter.on('leave-room', (room, id) => {
      this.logger.log(`Room Left: Room ${room} by ${id}`)
    })
    this.server.of('/').adapter.on('create-room', (room) => {
      this.logger.log(`Room Created: ${room}`)
    })
    this.server.of('/').adapter.on('delete-room', (room) => {
      this.logger.log(`Room Deleted: ${room}`)
    })
  }

  @SubscribeMessage('request-join-room')
  handleRequestJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket
  ) {
    const currentRoomSize =
      this.server.of('/').adapter.rooms.get(room)?.size || null
    if (!!currentRoomSize && currentRoomSize >= 2) return 'denied'
    else {
      client.join(room)
      this.server.to(room).emit('somebody-joined', currentRoomSize)
      return 'ok'
    }
  }

  @SubscribeMessage('send-turn')
  handleMessage(
    @MessageBody() data: TicTacToeTurnPayload,
    @ConnectedSocket() client: Socket
  ) {
    client.to(data.toRoom).emit('send-turn', data)
  }

  @SubscribeMessage('send-reset')
  handleResetMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket
  ) {
    client.to(data).emit('send-reset')
  }
}
