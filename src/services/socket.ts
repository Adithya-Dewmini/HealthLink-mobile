import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../api/client";

const doctorRooms = new Set<string>();
const patientRooms = new Set<string>();
const centerRooms = new Set<string>();
const sessionRooms = new Set<string>();
const clinicScheduleRooms = new Set<string>();
const orderRooms = new Set<string>();
const pharmacyRooms = new Set<string>();
let joinedReceptionRoom = false;
const socketDebugEnabled = typeof __DEV__ !== "undefined" && __DEV__;

const logSocket = (...args: unknown[]) => {
  if (!socketDebugEnabled) return;
  console.log("[socket]", ...args);
};

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

let reconnectBound = false;

const bindReconnectHandlers = () => {
  if (reconnectBound) {
    return;
  }

  socket.on("connect", () => {
    logSocket("connected", socket.id);
    for (const doctorId of doctorRooms) {
      socket.emit("joinDoctorRoom", { doctorId });
    }
    for (const patientId of patientRooms) {
      socket.emit("joinPatientRoom", { patientId });
    }
    for (const medicalCenterId of centerRooms) {
      socket.emit("joinCenterRoom", { medicalCenterId });
    }
    for (const sessionId of sessionRooms) {
      socket.emit("joinSession", { sessionId });
    }
    for (const clinicId of clinicScheduleRooms) {
      socket.emit("joinClinicScheduleRoom", { clinicId });
    }
    for (const orderId of orderRooms) {
      socket.emit("joinOrderRoom", { orderId });
    }
    for (const pharmacyId of pharmacyRooms) {
      socket.emit("joinPharmacyRoom", { pharmacyId });
    }
    if (joinedReceptionRoom) {
      socket.emit("joinReceptionRoom");
    }
  });

  socket.on("disconnect", (reason) => {
    logSocket("disconnected", reason);
  });

  socket.on("connect_error", (error) => {
    logSocket("connect_error", error.message);
  });

  reconnectBound = true;
};

export const connectSocket = (token?: string | null) => {
  bindReconnectHandlers();
  if (token) {
    socket.auth = { token };
  }
  if (!socket.connected) {
    logSocket("connecting", SOCKET_URL);
    socket.connect();
  }
  return socket;
};

export const getSocket = () => socket;

export const joinDoctorRoom = (doctorId: number | string) => {
  const roomId = String(doctorId);
  if (doctorRooms.has(roomId)) {
    return;
  }
  doctorRooms.add(roomId);
  logSocket("joinDoctorRoom", doctorId);
  socket.emit("joinDoctorRoom", { doctorId });
};

export const joinPatientRoom = (patientId: number | string) => {
  const roomId = String(patientId);
  if (patientRooms.has(roomId)) {
    return;
  }
  patientRooms.add(roomId);
  logSocket("joinPatientRoom", patientId);
  socket.emit("joinPatientRoom", { patientId });
};

export const joinOrderRoom = (orderId: number | string) => {
  const roomId = String(orderId);
  if (orderRooms.has(roomId)) {
    return;
  }
  orderRooms.add(roomId);
  logSocket("joinOrderRoom", orderId);
  socket.emit("joinOrderRoom", { orderId });
};

export const leaveOrderRoom = (orderId: number | string) => {
  orderRooms.delete(String(orderId));
};

export const joinPharmacyRoom = (pharmacyId: number | string) => {
  const roomId = String(pharmacyId);
  if (pharmacyRooms.has(roomId)) {
    return;
  }
  pharmacyRooms.add(roomId);
  logSocket("joinPharmacyRoom", pharmacyId);
  socket.emit("joinPharmacyRoom", { pharmacyId });
};

export const joinCenterRoom = (medicalCenterId: string) => {
  const roomId = String(medicalCenterId);
  if (centerRooms.has(roomId)) {
    return;
  }
  centerRooms.add(roomId);
  logSocket("joinCenterRoom", medicalCenterId);
  socket.emit("joinCenterRoom", { medicalCenterId });
};

export const joinReceptionRoom = () => {
  joinedReceptionRoom = true;
  logSocket("joinReceptionRoom");
  socket.emit("joinReceptionRoom");
};

export const joinSessionRoom = (sessionId: number | string) => {
  const roomId = String(sessionId);
  if (sessionRooms.has(roomId)) {
    return;
  }
  sessionRooms.add(roomId);
  logSocket("joinSessionRoom", sessionId);
  socket.emit("joinSession", { sessionId });
};

export const leaveSessionRoom = (sessionId: number | string) => {
  sessionRooms.delete(String(sessionId));
};

export const joinClinicScheduleRoom = (clinicId: string) => {
  const roomId = String(clinicId);
  if (clinicScheduleRooms.has(roomId)) {
    return;
  }
  clinicScheduleRooms.add(roomId);
  logSocket("joinClinicScheduleRoom", clinicId);
  socket.emit("joinClinicScheduleRoom", { clinicId });
};

export const leaveClinicScheduleRoom = (clinicId: string) => {
  clinicScheduleRooms.delete(String(clinicId));
  socket.emit("leaveClinicScheduleRoom", { clinicId });
};
