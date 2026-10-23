// src/utils/reportApi.js
import { getAccessToken } from "./auth";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export const fetchAttendanceGrid = async (year, month) => {
    const token = getAccessToken();
    const res = await fetch(
        `${BASE}/api/reports/attendance/?year=${year}&month=${month}`,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        }
    );
    if (!res.ok) throw new Error("فشل تحميل التقرير");
    return res.json();
};

export const fetchWorkLogDetail = async (userId, dateStr) => {
    const token = getAccessToken();
    const res = await fetch(
        `${BASE}/api/reports/worklog/${userId}/${dateStr}/`,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("فشل تحميل التفاصيل");
    return res.json();
};

export const addWorkLogComment = async (logId, text) => {
    const token = getAccessToken();
    const res = await fetch(
        `${BASE}/api/reports/worklog/${logId}/comments/`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text }),
        }
    );
    if (!res.ok) throw new Error("فشل إضافة التعليق");
    return res.json();
};