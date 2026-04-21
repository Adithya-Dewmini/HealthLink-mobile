import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../config/api";

const resolveSocketUrl = () => {
  try {
    const url = new URL(API_BASE_URL);
    return url.origin;
  } catch {
    return API_BASE_URL.replace(/\/api$/, "");
  }
};

const SOCKET_URL = resolveSocketUrl();

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export const connectSocket = () => {
  if (!socket.connected) socket.connect();
  return socket;
};

export const getSocket = () => socket;

export const joinDoctorRoom = (doctorId: number | string) => {
  socket.emit("joinDoctorRoom", { doctorId });
};

export const joinPatientRoom = (patientId: number | string) => {
  socket.emit("joinPatientRoom", { patientId });
};

export const joinCenterRoom = (medicalCenterId: string) => {
  socket.emit("joinCenterRoom", { medicalCenterId });
};
