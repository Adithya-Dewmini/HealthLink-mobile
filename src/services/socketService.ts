import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Socket } from "socket.io-client";
import {
  connectSocket,
  getSocket,
  joinOrderRoom,
  joinPatientRoom,
  joinPharmacyRoom,
  leaveOrderRoom,
} from "./socket";
import type { OrderSummary } from "./commerceService";

export type OrderUpdatedEvent = {
  orderId: number;
  patientId: number;
  pharmacyId: number;
  status: string;
  updatedAt: string;
  order: OrderSummary;
};

export type NotificationCreatedEvent = {
  userId: number;
  createdAt: string;
  notification: {
    id: number;
    title: string;
    body: string;
    type: string;
    isRead: boolean;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
};

const withAuthedSocket = async () => {
  const token = await AsyncStorage.getItem("token");
  return connectSocket(token);
};

export const connectRealtimeSocket = async () => {
  return withAuthedSocket();
};

export const subscribeToOrderRoom = async (orderId: number | string) => {
  await withAuthedSocket();
  joinOrderRoom(orderId);
};

export const subscribeToPatientRealtime = async (patientId: number | string) => {
  await withAuthedSocket();
  joinPatientRoom(patientId);
};

export const subscribeToPharmacyRealtime = async (pharmacyId: number | string) => {
  await withAuthedSocket();
  joinPharmacyRoom(pharmacyId);
};

export const onOrderUpdated = (
  handler: (payload: OrderUpdatedEvent) => void
): (() => void) => {
  const socket: Socket = getSocket();
  socket.on("order.updated", handler);
  return () => {
    socket.off("order.updated", handler);
  };
};

export const unsubscribeFromOrderRoom = (orderId: number | string) => {
  leaveOrderRoom(orderId);
};

export const onNotificationCreated = (
  handler: (payload: NotificationCreatedEvent) => void
): (() => void) => {
  const socket: Socket = getSocket();
  socket.on("notification.created", handler);
  return () => {
    socket.off("notification.created", handler);
  };
};
