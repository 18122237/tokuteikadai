import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';

// ==========================================================
// 定数（Home.jsと同じ配色設定）
// ==========================================================
const DEPARTMENT_COLORS = {
  '経済学部': '#2196f3',
  '法学部': '#ff9800',
  '経営学部': '#4caf50',
  '青山スタンダード科目': '#9c27b0',
  '文学部共通': '#f44336',
  '国際政治経済学部': '#00bcd4',
  '社会情報学部': '#8bc34a',
  '理工学部共通': '#ffeb3b',
};
const CAMPUS_HIGHLIGHTS = {
  '青山': 'rgba(255, 255, 255, 0.9)',
  '相模原': '#e0f7fa',
};

const NO_LECTURE_COLOR = '#bdbdbd';
const PRIMARY_LECTURE_COLOR = '#1976d2';

// 全角→半角変換ユーティリティ
const toHalfWidth = (str) => {
  if (!str) return "";
  return str.replace(/[！-～]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
  );
};

export default function PublicScheduleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // データ取得
  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/calendar/public/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("データ取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setCalendar(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // 講義データのマッピング（Home.jsのロジックを適応）
  const { lectureMap, unmatchedLectures } = useMemo(() => {
    if (!calendar || !calendar.lectures) return { lectureMap: {}, unmatchedLectures: [] };

    const map = {};
    const unmatched = [];

    calendar.lectures.forEach((lec) => {
      // period（例: "月1"）を正規化
      const fixedPeriod = toHalfWidth(lec.period);
      
      // 正規表現で "曜日+時限" の形式かチェック
      // Home.jsのロジックに合わせてキーを作成
      const m = fixedPeriod.match(/^([月火水木金土])(\d+)$/u);
      
      if (m) {
        // グリッドに表示できる講義
        const key = fixedPeriod; // そのままキーとして使用 ("月1"など)
        map[key] = lec;
      } else {
        // グリッド外（集中講義など）
        unmatched.push(lec);
      }
    });

    return { lectureMap: map, unmatchedLectures: unmatched };
  }, [calendar]);

  // カレンダーの行生成
  const calendarRows = useMemo(() => {
    if (!calendar) return [];

    const days = ['月', '火', '水', '木', '金'];
    if (calendar.sat_flag) days.push('土');
    const maxPeriods = calendar.sixth_period_flag ? 6 : 5;

    let rows = [];
    for (let i = 1; i <= maxPeriods; i++) {
      let cells = [];
      for (let j = 0; j <= days.length; j++) {
        let content = '';
        let lecture = null;
        let backgroundColor = NO_LECTURE_COLOR;

        if (j === 0) {
          // 時限列
          content = `${i}限`;
          cells.push(
            <TableCell
              key={`${i}-${j}`}
              align="center"
              sx={{
                backgroundColor: '#e0f7fa',
                border: '1px solid #ddd',
                fontWeight: 'bold',
                padding: 0,
                width: '60px', // 幅を固定
                maxWidth: '80px',
              }}
            >
              <Typography variant="body2">{content}</Typography>
            </TableCell>
          );
        } else {
          // 曜日・時限セル
          const day = days[j - 1];
          const period = i.toString();
          const key = `${day}${period}`; // マップのキー
          
          lecture = lectureMap[key];
          content = lecture ? (lecture.subject || lecture.科目) : '－';

          if (lecture) {
            // 色分けロジック
            // APIのレスポンス構造により、開講（学部）情報は lecture.semester に入っている場合があるため注意
            // backend/main.py: "semester": kougi.開講 となっているので lecture.semester を見る
            const department = lecture.semester || ''; 
            const timeSlot = lecture.period || ''; // 相模原/青山判定用

            // 優先度1: 学部別カラー
            backgroundColor = DEPARTMENT_COLORS[department] || PRIMARY_LECTURE_COLOR;
            
            // 優先度2: キャンパス別ハイライト
            let campusHighlight = null;
            if (timeSlot.includes('相模原')) {
                campusHighlight = CAMPUS_HIGHLIGHTS['相模原'];
            } else if (timeSlot.includes('青山')) {
                campusHighlight = CAMPUS_HIGHLIGHTS['青山'];
            }
            backgroundColor = campusHighlight || backgroundColor;
          }

          cells.push(
            <TableCell
              key={`${i}-${j}`}
              align="center"
              sx={{
                backgroundColor: 'white',
                border: '1px solid #ddd',
                padding: 0,
                height: '80px',
                width: '120px', // 幅を設定
              }}
            >
              <Button
                fullWidth
                sx={{
                  height: '100%',
                  minHeight: '80px',
                  padding: 0.5,
                  lineHeight: 1.2,
                  backgroundColor: backgroundColor,
                  color: lecture ? (['#ffeb3b', '#ffc107', 'rgba(255, 255, 255, 0.9)', '#e0f7fa'].includes(backgroundColor) ? 'black' : 'white') : 'white',
                  '&:hover': {
                    backgroundColor: backgroundColor,
                    opacity: 0.8,
                  },
                  textTransform: 'none', // 勝手な大文字変換を防ぐ
                }}
                variant="contained"
                disabled={!lecture || !lecture.url} // URLがない場合はクリック不可にするか、アラート出すなど
                onClick={() => {
                  if (lecture && lecture.url) {
                    window.open(lecture.url, '_blank');
                  }
                }}
              >
                <Box sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12px', mb: 0.5 }}>
                    {content}
                  </Typography>
                  {lecture && (
                    <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.9 }}>
                      {lecture.teacher || lecture.教員}
                    </Typography>
                  )}
                </Box>
              </Button>
            </TableCell>
          );
        }
      }
      rows.push(<TableRow key={i}>{cells}</TableRow>);
    }
    return rows;
  }, [calendar, lectureMap]);


  // ローディング・エラー表示
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 5 }}>
        <Typography color="error">エラー: {error}</Typography>
        <Button onClick={() => navigate("/public-schedules")} sx={{ mt: 2 }}>
          一覧に戻る
        </Button>
      </Box>
    );
  }

  if (!calendar) {
    return <Typography align="center" sx={{ mt: 5 }}>データが存在しません。</Typography>;
  }

  return (
    <Box
      sx={{
        backgroundColor: '#8fbc8f', // Homeと同じ背景色
        minHeight: '100vh',
        padding: 3,
      }}
    >
      <Button
        variant="contained"
        onClick={() => navigate("/public-schedules")}
        sx={{ mb: 2, backgroundColor: 'white', color: 'black', '&:hover': { backgroundColor: '#eee' } }}
      >
        ← 一覧に戻る
      </Button>

      <Paper sx={{ p: 3, borderRadius: 2, mb: 4, maxWidth: '1200px', mx: 'auto', backgroundColor: 'rgba(255,255,255,0.9)' }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
          {calendar.calendar_name || "名称未設定"}
        </Typography>
        
        <Box sx={{ textAlign: 'center', mb: 2, color: '#555' }}>
          <Typography variant="body1" display="inline" sx={{ mr: 2 }}>
            🏫 キャンパス: {Array.isArray(calendar.campus) ? calendar.campus.join("・") : (calendar.campus || "未設定")}
          </Typography>
          <Typography variant="body1" display="inline" sx={{ mr: 2 }}>
            🎓 学部: {Array.isArray(calendar.department) ? calendar.department.join("・") : (calendar.department || "未設定")}
          </Typography>
          <Typography variant="body1" display="inline">
            📅 学期: {Array.isArray(calendar.semester) && calendar.semester.length ? calendar.semester.join("・") : "未設定"}
          </Typography>
        </Box>

        {/* 時間割テーブル */}
        <TableContainer
          component={Paper}
          sx={{
            width: '100%',
            margin: '0 auto',
            borderRadius: 2,
            overflowX: 'auto', // 横スクロール対応
            boxShadow: 3
          }}
        >
          <Table sx={{ tableLayout: 'fixed', minWidth: '600px' }}>
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: '#008080',
                    color: 'white',
                    width: '60px'
                  }}
                ></TableCell>
                {['月', '火', '水', '木', '金', calendar.sat_flag && '土']
                  .filter(Boolean)
                  .map((day) => (
                    <TableCell
                      key={day}
                      align="center"
                      sx={{
                        fontWeight: 'bold',
                        backgroundColor: '#008080',
                        color: 'white'
                      }}
                    >
                      {day}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>{calendarRows}</TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* その他の講義（集中講義など） */}
      <Box
          sx={{
            padding: 2,
            borderRadius: 2,
            maxWidth: '1200px',
            margin: '0 auto',
            backgroundColor: 'rgba(255,255,255,0.1)' // 背景を少し透過
          }}
        >
          <Typography
            variant="h5"
            sx={{ margin: 2, textAlign: 'center', color: 'white', fontWeight: 'bold' }}
          >
            その他の講義
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {unmatchedLectures.length > 0 ? (
              unmatchedLectures.map((lecture, index) => (
                <Box
                  key={index}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    width: '180px',
                    height: '80px',
                    textAlign: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <Button
                    fullWidth
                    sx={{
                      height: '100%',
                      padding: 0.5,
                      fontSize: '12px',
                      lineHeight: '1.2',
                      textTransform: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        if (lecture.url) window.open(lecture.url, '_blank');
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {lecture.subject || lecture.科目}
                    </Typography>
                    <Typography variant="caption">
                        {lecture.teacher || lecture.教員}
                    </Typography>
                  </Button>
                </Box>
              ))
            ) : (
              <Typography variant="body1" sx={{ color: 'white', opacity: 0.8 }}>
                その他の講義はありません。
              </Typography>
            )}
          </Box>
      </Box>
    </Box>
  );
}