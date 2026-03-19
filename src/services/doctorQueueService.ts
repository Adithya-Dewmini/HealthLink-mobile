import axios from "axios";

const API_URL = "http://172.20.10.4:5050/api";

export const getQueueDashboard = async (token: string) => {
  const res = await axios.get(`${API_URL}/doctor/queue/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const startQueue = async (token: string) => {
  const res = await axios.post(
    `${API_URL}/doctor/queue/start`,
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
  const res = await axios.post(
    `${API_URL}/doctor/queue/next`,
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
  const res = await axios.post(
    `${API_URL}/doctor/queue/skip`,
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
  const res = await axios.post(
    `${API_URL}/doctor/queue/end`,
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
  const res = await axios.get(`${API_URL}/doctor/reports/daily`, {
    params: date ? { date } : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};
