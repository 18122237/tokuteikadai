import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import { useRegisterLecture } from '../hooks/useRegisterLecture';
import { useSetup } from '../hooks/useSetup';

export const RegisterLecture = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { defCalendarInfo } = useSetup();
  const { registerLecture, unregisterLecture, isLectureRegistered } =
    useRegisterLecture(defCalendarInfo); // Pass defCalendarInfo here if needed by the hook

  const lecture = location.state?.lecture;

  // Added check for lecture existence before calling the hook
  const registered = lecture ? isLectureRegistered(lecture.id) : false;

  const handleRegister = async () => {
    if (!lecture) return; // Add check if lecture is undefined
    try {
      const isFailure = await registerLecture(lecture.id);
      if (isFailure) {
        alert("この時限は他の講義が登録されています。");
      } else {
        alert(`「${lecture.科目}」を登録しました。`);
        navigate('/'); // 🟢 Navigate to Home screen
      }
    } catch (error) {
      console.error('登録失敗:', error);
      alert('登録に失敗しました。');
    }
  };

  const handleUnregister = async () => {
    if (!lecture) return; // Add check if lecture is undefined
    try {
      await unregisterLecture(lecture.id);
      alert(`「${lecture.科目}」を解除しました。`);
      navigate('/'); // 🟢 Navigate to Home screen
    } catch (error) {
      console.error('解除失敗:', error);
      alert('解除に失敗しました。');
    }
  };

  if (!lecture) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography>講義情報が見つかりません。</Typography>
        <Button variant="text" onClick={() => navigate('/')} sx={{ mt: 2 }}>
            ホームに戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Paper sx={{ padding: 2, marginBottom: 2 }}>
        <Typography variant="h5">{lecture.科目}</Typography>
        <Typography variant="body1">
          <strong>時限:</strong> {lecture.時限}
        </Typography>
        <Typography variant="body1">
          <strong>学部:</strong> {lecture.開講}
        </Typography>
        <Typography variant="body1">
          <strong>教員:</strong> {lecture.教員}
        </Typography>
        <Typography variant="body1">
          <strong>学年:</strong> {lecture.学年}
        </Typography>
        <Typography variant="body1">
          <strong>単位:</strong> {lecture.単位}
        </Typography>
        <Typography variant="body1">
          <a
            href={lecture.url} target="_blank" rel="noopener noreferrer" >
            詳細を見る
          </a>
        </Typography>
      </Paper>
      {registered ? (
        <Button variant="outlined" color="error" onClick={handleUnregister}>
          登録解除
        </Button>
      ) : (
        <Button variant="contained" color="primary" onClick={handleRegister}>
          登録
        </Button>
      )}
      {/* 🟢 Changed Cancel button to also go Home */}
      <Button variant="text" onClick={() => navigate('/')} sx={{ marginLeft: 2 }}>
        キャンセルしてホームへ
      </Button>
    </Box>
  );
};