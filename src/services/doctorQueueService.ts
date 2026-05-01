import { api } from "./apiClient";

export const getQueueDashboard = async (token: string) => {
  const res = await api.get("/api/doctor/queue/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const startQueue = async (token: string) => {
  const res = await api.post(
    "/api/doctor/queue/start",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const callNextPatient = async (token: string) => {
  const res = await api.post(
    "/api/doctor/queue/next",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const skipPatient = async (token: string) => {
  const res = await api.post(
    "/api/doctor/queue/skip",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const endClinic = async (token: string) => {
  const res = await api.post(
    "/api/doctor/queue/end",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const getDailyReport = async (token: string, date?: string) => {
  const res = await api.get("/api/doctor/reports/daily", {
    params: date ? { date } : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};
