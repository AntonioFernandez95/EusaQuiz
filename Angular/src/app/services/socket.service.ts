import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly url: string = 'http://localhost:3000'; // Socket.io base URL

  constructor() {
    this.socket = io(this.url, {
        autoConnect: false // Don't connect until needed
    });
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  emit(event: string, payload: any): void {
    this.socket.emit(event, payload);
  }

  on(event: string): Observable<any> {
    return new Observable(observer => {
      this.socket.on(event, (data: any) => {
        observer.next(data);
      });
      return () => this.socket.off(event);
    });
  }

  joinRoom(room: string): void {
    this.emit('join', room);
  }
}
