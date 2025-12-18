import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Fade,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../hooks/useRegister";

export const Register = () => {
  const { register } = useRegister();
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(true);

  const [user, setUser] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const onClickRegister = async () => {
    try {
      await register(user);

      // フェードアウト → ログイン画面へ
      setFadeIn(false);
      setTimeout(() => {
        navigate("/login");
      }, 300);
    } catch (err) {
      console.error("登録失敗", err);
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
            {/* タイトル */}
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "#2f5d50" }}
              gutterBottom
            >
              新規ユーザー登録
            </Typography>

            <Typography
              variant="subtitle1"
              sx={{ color: "text.secondary", mb: 3 }}
            >
              AGU Course Scheduler
            </Typography>

            {/* フォーム */}
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
              color="success"
              sx={{
                mt: 3,
                py: 1.2,
                fontWeight: "bold",
              }}
              onClick={onClickRegister}
            >
              登録する
            </Button>

            {/* ログインリンク */}
            <Typography sx={{ mt: 3 }}>
              すでに登録済みの方は{" "}
              <Link
                to="/login"
                style={{ color: "#1976d2", fontWeight: "bold" }}
              >
                ログインはこちら
              </Link>
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Fade>
  );
};
