import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
} from "@mui/material";
import axios from "axios";

export default function PublicScheduleList() {
  const [calendars, setCalendars] = useState([]);
  const navigate = useNavigate();

  // ページ読み込み時にデータ取得
  useEffect(() => {
    axios
      .get("http://localhost:8000/calendar/public")
      .then((res) => {
        console.log(res.data);
        setCalendars(res.data.public_calendars);
      })
      .catch((err) => console.error("Error fetching calendars:", err));
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        公開中の時間割一覧
      </Typography>

      {calendars.length === 0 ? (
        <Typography variant="h6" align="center" sx={{ mt: 4 }}>
          現在、公開中の時間割はありません。
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {calendars.map((cal) => (
            <Grid item xs={12} sm={6} md={4} key={cal.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "0.2s",
                  "&:hover": { boxShadow: 6, transform: "scale(1.02)" },
                }}
                onClick={() => navigate(`/public-schedules/${cal.id}`)}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    📘 {cal.calendar_name}
                  </Typography>
                  <Typography variant="body2">
                    🏫 キャンパス:{" "}
                    {cal.campus && cal.campus.length > 0
                      ? cal.campus.join("・")
                      : "未設定"}
                  </Typography>
                  <Typography variant="body2">
                    🎓 学部:{" "}
                    {cal.department && cal.department.length > 0
                      ? cal.department.join("・")
                      : "未設定"}
                  </Typography>
                  <Typography variant="body2">
                    📅 学期:{" "}
                    {cal.semester && cal.semester.length > 0
                      ? cal.semester.join("・")
                      : "未設定"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    👤 ユーザーID: {cal.user_id}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box textAlign="center" mt={4}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/")}
        >
          ← ホームに戻る
        </Button>
      </Box>
    </Box>
  );
}
