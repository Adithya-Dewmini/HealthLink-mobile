import { io, Socket } from "socket.io-client";

export const socket: Socket = io("http://172.20.10.4:5050");

export const connectSocket = (_serverUrl: string) => socket;

export const getSocket = () => socket;

export const joinDoctorRoom = (doctorId: number | string) => {
  socket.emit("joinDoctorRoom", doctorId);
};
