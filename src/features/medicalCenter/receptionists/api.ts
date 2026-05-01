import { apiFetch } from "../../../config/api";
import { parseReceptionistList, parseReceptionistPermissions } from "./utils";
import type { ReceptionistPermissions } from "./types";

const parseResponseBody = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  return typeof body === "object" && body !== null ? body : {};
};

const requireOk = (response: Response, body: Record<string, unknown>, fallback: string) => {
  if (!response.ok) {
    const message =
      typeof body.message === "string" && body.message.trim().length > 0 ? body.message : fallback;
    throw new Error(message);
  }
};

export const fetchReceptionistsRequest = async () => {
  const response = await apiFetch("/api/center/receptionists");
  const body = await parseResponseBody(response);
  requireOk(response, body, "Failed to load receptionists");

  return parseReceptionistList(body);
};

export const updateReceptionistStatusRequest = async (
  receptionistId: string,
  status: "ACTIVE" | "INACTIVE"
) => {
  const response = await apiFetch(`/api/center/receptionists/${receptionistId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const body = await parseResponseBody(response);
  requireOk(response, body, "Failed to update receptionist status");

  const returnedStatus = typeof body.status === "string" ? body.status.toUpperCase() : "";
  return returnedStatus === "DISABLED" ? "DISABLED" : "ACTIVE";
};

export const resendReceptionistInviteRequest = async (receptionistId: string) => {
  const response = await apiFetch(`/api/center/receptionists/${receptionistId}/resend`, {
    method: "POST",
  });
  const body = await parseResponseBody(response);
  requireOk(response, body, "Failed to resend invite");

  return {
    emailSent: body.emailSent === true,
  };
};

export const removeReceptionistRequest = async (receptionistId: string) => {
  const response = await apiFetch(`/api/center/receptionists/${receptionistId}`, {
    method: "DELETE",
  });
  const body = await parseResponseBody(response);
  requireOk(response, body, "Failed to remove receptionist");
};

export const fetchReceptionistPermissionsRequest = async (receptionistId: string) => {
  const response = await apiFetch(`/api/center/receptionists/${receptionistId}/permissions`);
  const body = await parseResponseBody(response);
  requireOk(response, body, "Failed to load permissions");

  return parseReceptionistPermissions(body.permissions);
};

export const updateReceptionistPermissionsRequest = async (
  receptionistId: string,
  permissions: ReceptionistPermissions
) => {
  const response = await apiFetch(`/api/center/receptionists/${receptionistId}/permissions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(permissions),
  });
  const body = await parseResponseBody(response);
  requireOk(response, body, "Failed to update permissions");

  return parseReceptionistPermissions(body.permissions);
};
