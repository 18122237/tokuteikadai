import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Fade,
} from "@mui/material";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useLogin } from "../hooks/useLogin";

export const Login = () => {
  const { login } = useLogin();
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(true);
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    const username = searchParams.get("username");
    const password = searchParams.get("password");
    setUser({
      username: username || "",
      password: password || "",
    });
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const onClickLogin = async () => {
    try {
      await login(user);
      setFadeIn(false);
      setTimeout(() => {
        navigate("/");
      }, 300);
    } catch (err) {
      console.error("ログイン失敗", err);
    }
  };

  return (
    <Fade in={fadeIn} timeout={300}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #7fb77e, #4a8f7b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={10}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "#2f5d50" }}
              gutterBottom
            >
              履修登録・時間割管理システム
            </Typography>

            <Typography
              variant="subtitle1"
              sx={{ color: "text.secondary", mb: 3 }}
            >
              AGU Course Scheduler
            </Typography>

            <TextField
              margin="normal"
              required
              fullWidth
              name="username"
              label="ユーザー名"
              value={user.username}
              onChange={handleChange}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="パスワード"
              type="password"
              value={user.password}
              onChange={handleChange}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, py: 1.2, fontWeight: "bold" }}
              onClick={onClickLogin}
            >
              ログイン
            </Button>

            <Typography sx={{ mt: 3 }}>
              はじめての方は{" "}
              <Link
                to="/register"
                style={{ color: "#1976d2", fontWeight: "bold" }}
              >
                新規登録はこちら
              </Link>
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Fade>
  );
};
