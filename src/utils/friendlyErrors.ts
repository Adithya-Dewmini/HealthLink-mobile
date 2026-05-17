const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  if (isRecord(error)) {
    const directMessage = error.message;
    if (typeof directMessage === "string") return directMessage;

    const response = error.response;
    if (isRecord(response)) {
      const responseMessage = response.message;
      if (typeof responseMessage === "string") return responseMessage;

      const data = response.data;
      if (isRecord(data) && typeof data.message === "string") return data.message;
    }
  }

  return "";
};

const extractStatusCode = (error: unknown) => {
  if (!isRecord(error)) return null;

  const directStatus = error.status;
  if (typeof directStatus === "number") return directStatus;

  const response = error.response;
  if (!isRecord(response)) return null;
  return typeof response.status === "number" ? response.status : null;
};

const extractErrorCode = (error: unknown) => {
  if (!isRecord(error)) return null;

  const directCode = error.code;
  if (typeof directCode === "string" && directCode.trim()) return directCode.trim().toUpperCase();

  const response = error.response;
  if (!isRecord(response)) return null;
  const data = response.data;
  if (!isRecord(data)) return null;
  return typeof data.code === "string" && data.code.trim() ? data.code.trim().toUpperCase() : null;
};

export const getFriendlyError = (
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again."
) => {
  const message = extractMessage(error).trim();
  const normalized = message.toLowerCase();
  const statusCode = extractStatusCode(error);
  const errorCode = extractErrorCode(error);

  switch (errorCode) {
    case "SESSION_NOT_LIVE":
      return "This session is not live yet. Start or reopen the queue first.";
    case "DOCTOR_NOT_ASSIGNED":
      return "Your doctor profile is not linked to this clinic session.";
    case "QUEUE_NOT_FOUND":
      return "Queue details are unavailable right now. Refresh and try again.";
    case "ACTIVE_CONSULTATION_EXISTS":
      return "Finish the active consultation before ending the queue.";
    case "QUEUE_ALREADY_COMPLETED":
      return "This clinic queue has already ended.";
    case "PATIENT_NOT_CALLED":
      return "No active called patient was found for this action.";
    case "CONSULTATION_NOT_FOUND":
      return "This consultation could not be found.";
    case "CONSULTATION_ALREADY_COMPLETED":
      return "This consultation has already been completed.";
    case "PRESCRIPTION_REQUIRED_FIELDS":
      return "Review the medicine details before issuing or completing the prescription.";
    case "NOT_ALLOWED":
      return "You do not have permission to perform this action.";
    default:
      break;
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network request failed") ||
    normalized.includes("network error")
  ) {
    return "Could not connect to the server. Please check your connection and try again.";
  }

  if (statusCode === 401 || normalized.includes("unauthorized") || normalized.includes("session expired")) {
    return "Your session has expired. Please sign in again.";
  }

  if (statusCode === 403 || normalized.includes("forbidden")) {
    return "You do not have permission to perform this action.";
  }

  if (statusCode === 404 || normalized.includes("not found")) {
    return "The requested record could not be found.";
  }

  if (statusCode === 409 || normalized.includes("conflict")) {
    return "This action conflicts with the latest clinic data. Please refresh and try again.";
  }

  if (
    normalized.includes("max patients") &&
    (normalized.includes("generated slot") || normalized.includes("slot count"))
  ) {
    return "Max patients is higher than the available appointment slots for this time range.";
  }

  if (normalized.includes("end time") && normalized.includes("start time")) {
    return "End time must be later than start time.";
  }

  if (normalized.includes("doctor") && (normalized.includes("overlap") || normalized.includes("already"))) {
    return "This doctor already has a session during this time.";
  }

  if (normalized.includes("room") && (normalized.includes("booked") || normalized.includes("overlap"))) {
    return "This room is already booked during this time.";
  }

  return message || fallbackMessage;
};
