import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../providers/UserProvider';
import { Header } from '../templates/Header';
import { Footer } from '../templates/Footer';
import { useSetup } from '../hooks/useSetup';
import { MemoCard } from '../elements/MemoCard';
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
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; 

const apiUrl = process.env.REACT_APP_API_URL;

// ==========================================================
// 定数とヘルパー関数
// ==========================================================
const GRADUATION_KEY = 'graduation_required_units';
const ACQUIRED_KEY = 'accumulated_acquired_units';
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

const getLectureMemoTitle = (lectureId) => {
  try {
    const storageKey = `memo_${lectureId}`;
    const savedData = JSON.parse(localStorage.getItem(storageKey));
    return savedData?.title;
  } catch (e) {
    return undefined;
  }
};
// ==========================================================
// Home コンポーネント開始
// ==========================================================

export const Home = () => {
  const { isLogined } = useContext(UserContext);
  const { defCalendarInfo, lectureInfo, refetch } = useSetup();
  const navigate = useNavigate();
  
  // 必修科目を自動登録する処理
  const handleRegisterRequiredCourses = async () => {
     if (!defCalendarInfo) {
      alert("カレンダーが選択されていません。");
      return;
    }

    const gradeInput = window.prompt("登録する学年を半角数字で入力してください (例: 1)", "1");
    const grade = parseInt(gradeInput, 10);
    
    if (isNaN(grade) || grade < 1 || grade > 4) {
        if (gradeInput !== null) alert("正しい学年を入力してください。");
        return;
    }

    try {
        const response = await axios.post(
            `${apiUrl}/kougi/register_required`,
            null,
            {
                params: { 
                    calendar_id: defCalendarInfo.id,
                    grade: grade
                },
                withCredentials: true 
            }
        );

        const { registered, skipped } = response.data;
        if (response.data.message) {
            alert(`処理が完了しました。\n登録数: ${registered}\nスキップ(重複): ${skipped}`);
            refetch(); // 画面更新
        } else {
            alert("登録処理に失敗した可能性があります。");
        }

    } catch (error) {
        console.error("登録失敗:", error);
        alert("必修科目の登録に失敗しました。" + (error.response?.data?.detail || error.message));
    }
  };

  // 🟢 HOOKS: 常にトップレベルで呼び出す
  const [graduationUnits, setGraduationUnits] = useState(0);
  const [inputUnits, setInputUnits] = useState('');
  const [accumulatedUnits, setAccumulatedUnits] = useState(0);
  const [inputAccumulatedUnits, setInputAccumulatedUnits] = useState('');

  // 🟢 現在のカレンダーの単位数合計の計算
  const currentCalendarUnits = useMemo(() => {
    if (!lectureInfo?.results) return 0;

    return lectureInfo.results.reduce((total, lecture) => {
      const unit = parseFloat(lecture.単位) || 0;
      return total + unit;
    }, 0);
  }, [lectureInfo]);
  // 🟢 既取得単位数と現在のカレンダーの単位数を合わせた合計単位数
  const totalPlannedUnits = useMemo(() => {
      return currentCalendarUnits + accumulatedUnits;
  }, [currentCalendarUnits, accumulatedUnits]);
  // 🟢 残り必要単位数の計算
  const remainingUnits = useMemo(() => {
    const remaining = graduationUnits > totalPlannedUnits ? graduationUnits - totalPlannedUnits : 0;
    return remaining;
  }, [graduationUnits, totalPlannedUnits]);
  // 🟢 初期読み込み（ローカルストレージから要件と既取得単位を取得）
  useEffect(() => {
    const savedGradUnits = localStorage.getItem(GRADUATION_KEY);
    if (savedGradUnits) {
      const parsedUnits = parseFloat(savedGradUnits);
      setGraduationUnits(parsedUnits);
      setInputUnits(savedGradUnits);
    }
    
    const savedAcquiredUnits = localStorage.getItem(ACQUIRED_KEY);
    if (savedAcquiredUnits) {
      const parsedAcquiredUnits = parseFloat(savedAcquiredUnits);
      setAccumulatedUnits(parsedAcquiredUnits);
      setInputAccumulatedUnits(savedAcquiredUnits);
    }
  }, []);
// ------------------------------------------------------------------

  // useMemo を使用して、時間割のレンダリング結果をメモ化
  const calendarRows = useMemo(() => {
    // 🟢 条件チェックをロジックの最上部に移動 (Hooksの外)
    if (!defCalendarInfo) return []; 
    
    const days = ['月', '火', '水', '木', '金'];
    if (defCalendarInfo?.sat_flag) days.push('土');
    const maxPeriods = defCalendarInfo?.sixth_period_flag ? 6 : 5;

    const lectureMap =
      lectureInfo?.registered_user_kougi.reduce((map, lecture) => {
        map[lecture.period] = lecture.kougi_id;
        return map;
      }, {}) || {};

    const lectureDetails = lectureInfo?.results.reduce((map, lecture) => {
      map[lecture.id] = lecture;
      return map;
    }, {});

    let rows = [];
    for (let i = 1; i <= maxPeriods; i++) {
      let cells = [];
      for (let j = 0; j <= days.length; j++) {
        let content = '';
        let lecture = null;
        let memoTitle = null; 
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
                maxWidth: '180px',
                maxHeight: '80px'
              }}
            >
              <Typography>{content}</Typography>
            </TableCell>
          );
        } else {
          // 曜日・時限セル
          const day = days[j - 1];
          const period = i.toString();
          const buttonId = `${day}${period}`.replace(/\d/, (d) =>
            String.fromCharCode(d.charCodeAt(0) + 0xfee0)
          );
          const lectureId = lectureMap[buttonId];
          lecture = lectureDetails?.[lectureId];
          content = lecture?.科目 || '－';
          if (lecture) {
            memoTitle = getLectureMemoTitle(lecture.id);
            // 🟢 ハイライトカラー決定ロジック
            const department = lecture.開講 || '';
            const timeSlot = lecture.時限 || '';

            // 優先度1: 学部別カラーをデフォルトとする
            backgroundColor = DEPARTMENT_COLORS[department] || PRIMARY_LECTURE_COLOR;
            
            // 優先度2: キャンパス別ハイライト (背景色を調整)
            let campusHighlight = null;
            if (timeSlot.includes('相模原')) {
                campusHighlight = CAMPUS_HIGHLIGHTS['相模原'];
            } else if (timeSlot.includes('青山')) {
                campusHighlight = CAMPUS_HIGHLIGHTS['青山'];
            }
            
            // キャンパスハイライトがあれば適用
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
                maxWidth: '180px',
                maxHeight: '80px',
                overflow: 'hidden'
              }}
            >
              <Button
                fullWidth
                sx={{
                  height: '100%',
                  padding: 0,
                  maxWidth: '180px',
                  minHeight: '80px',
                  lineHeight: 1.2,
                  // 🟢 ハイライトカラーを背景色に直接適用
                  backgroundColor: backgroundColor,
                  color: lecture ? (['#ffeb3b', '#ffc107', 'rgba(255, 255, 255, 0.9)', '#e0f7fa'].includes(backgroundColor) ? 'black' : 'white') : 'white',
                  '&:hover': {
                    backgroundColor: backgroundColor,
                    opacity: 0.8,
                  },
                }}
                variant="contained"
                onClick={() =>
                  lecture
                    ? navigate('/register-lecture', { state: { lecture } })
                    : navigate('/search', {
                        state: { days: [day], periods: [period.toUpperCase()] }
                      })
                }
              >
                <Box sx={{ p: 0.5, overflow: 'hidden' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '13px' }}>
                    {content}
                  </Typography>
                  {/* メモがある場合に表示 */}
                  {memoTitle && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        mt: 0.5, 
                        color: 'text.secondary', 
                        overflow: 'hidden', 
                        whiteSpace: 'nowrap', 
                        textOverflow: 'ellipsis',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: 1,
                        px: 0.5,
                      }}
                    >
                      📝 {memoTitle}
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
  }, [defCalendarInfo, lectureInfo, navigate]);

  // 🟢 useMemo をトップレベルに維持
  const unmatchedLectures = useMemo(() => {
    // 🟢 条件チェックをロジックの最上部に移動 (Hooksの外)
    if (!lectureInfo?.registered_user_kougi) return [];

    return lectureInfo.registered_user_kougi
      .filter((registered) => {
        const isOtherLecture =
          registered.period.includes('曜') || registered.period.includes('不定');
        return isOtherLecture;
      })
      .map((unmatched) => {
        const lecture = lectureInfo?.results.find(
          (lecture) => lecture.id === unmatched.kougi_id
        );
        return lecture;
      })
      .filter(Boolean);
  }, [lectureInfo]);
// ------------------------------------------------------------------

  // 卒業要件の保存処理
  const handleSaveRequirement = () => {
    const parsedUnits = parseFloat(inputUnits);
    if (!isNaN(parsedUnits) && parsedUnits >= 0) {
      localStorage.setItem(GRADUATION_KEY, parsedUnits.toString());
      setGraduationUnits(parsedUnits);
      alert(`卒業要件単位数を ${parsedUnits} 単位に設定しました。`);
    } else {
      alert('無効な単位数です。数値を入力してください。');
      setInputUnits(graduationUnits.toString()); 
    }
  };
  // 既取得単位数の保存処理
  const handleSaveAcquiredUnits = () => {
    const parsedUnits = parseFloat(inputAccumulatedUnits);
    if (!isNaN(parsedUnits) && parsedUnits >= 0) {
      localStorage.setItem(ACQUIRED_KEY, parsedUnits.toString());
      setAccumulatedUnits(parsedUnits);
      alert(`既取得単位数を ${parsedUnits} 単位に設定しました。`);
    } else {
      alert('無効な単位数です。数値を入力してください。');
      setInputAccumulatedUnits(accumulatedUnits.toString()); 
    }
  };
  // 🟢 ログインチェック（Hooksの後に配置）
  if (!isLogined) {
    return <Navigate to="/login" />;
  }

  return (
    <Box>
      <Box sx={{ top: 0, left: 0, width: '100%', zIndex: 1000 }}>
        <Header />
      </Box>

      <Box
        sx={{
          backgroundColor: '#8fbc8f',
          minHeight: '100vh',
          padding: 0,
          paddingTop: '30px'
        }}
      >
        <Typography
          variant="h4"
          align="center"
          sx={{ color: 'white', marginBottom: 3 }}
        >
          {defCalendarInfo?.calendar_name || 'ホーム画面'}
        </Typography>

        {/* 単位数管理パネル（アコーディオン） */}
        <Box sx={{ mx: 'auto', maxWidth: '600px', mb: 3 }}>
          <Accordion 
            defaultExpanded={remainingUnits > 0} 
            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 2 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="unit-content"
              id="unit-header"
              sx={{ borderBottom: '1px solid #ddd' }}
            >
              <Box sx={{ flexGrow: 1, textAlign: 'center', py: 0.5 }}>
                {/* 1. 残り必要単位数の表示（通常時） */}
                <Typography
                  variant="h5"
                  sx={{ 
                    fontWeight: 'bold',
                    color: remainingUnits > 0 ? '#d32f2f' : '#388e3c', 
                  }}
                >
                  🎓 残り必要単位数: {remainingUnits.toFixed(1)} 単位
                </Typography>
                {/* 2. 合計取得予定単位数と要件のサマリ */}
                <Typography variant="caption" color="textSecondary">
                  (予定 {totalPlannedUnits.toFixed(1)} / 要件 {graduationUnits.toFixed(1)} 単位)
                </Typography>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3, backgroundColor: '#f5f5f5' }}>
                {/* 3. 単位数の内訳 */}
                <Typography variant="subtitle1" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                    単位数内訳: {accumulatedUnits.toFixed(1)} (既取得) + {currentCalendarUnits.toFixed(1)} (カレンダー予定)
                </Typography>

                {/* 4. 既取得単位数設定 UI */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TextField
                        label="既取得単位数 (累計)"
                        variant="outlined"
                        size="small"
                        type="number"
                        value={inputAccumulatedUnits}
                        onChange={(e) => setInputAccumulatedUnits(e.target.value)}
                        sx={{ flexGrow: 1, mr: 1, backgroundColor: 'white' }}
                        inputProps={{ min: "0", step: "0.5" }} 
                    />
                    <Button variant="contained" color="secondary" onClick={handleSaveAcquiredUnits}>
                      設定
                    </Button>
                </Box>
                
                {/* 5. 卒業要件設定 UI */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TextField
                        label="卒業要件単位数"
                        variant="outlined"
                        size="small"
                        type="number"
                        value={inputUnits}
                        onChange={(e) => setInputUnits(e.target.value)}
                        sx={{ flexGrow: 1, mr: 1, backgroundColor: 'white' }}
                        inputProps={{ min: "0", step: "0.5" }} 
                    />
                    <Button variant="contained" color="primary" onClick={handleSaveRequirement}>
                        卒業要件設定
                    </Button>
                </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
        {/* 単位数管理パネル終わり */}
        
        <Box
          sx={{
            margin: 3,
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/calendar/create')}
            sx={{
              flex: '1 0 auto',
              minWidth: '150px',
              maxWidth: '200px'
            }}
          >
            新規カレンダー作成
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/calendar/list')}
            sx={{
              flex: '1 0 auto',
              minWidth: '150px',
              maxWidth: '200px'
            }}
          >
            保存済みのカレンダー
          </Button>
<Button
  variant="contained"
  color="secondary"
  onClick={() => navigate('/public-schedules/search')}  // ← URLを変更
  sx={{
    flex: '1 0 auto',
    minWidth: '150px',
    maxWidth: '200px',
  }}
>
  先輩の履修例を探す  {/* ← テキストを変更 */}
</Button>

        </Box>

        {defCalendarInfo ? (
          <Box
            sx={{
              mt: 4,
              maxWidth: '1200px',
              margin: '0 auto',
              overflowX: 'auto',
              borderRadius: 2
            }}
          >
            <TableContainer
              component={Paper}
              sx={{
                width: '100%',
                margin: { xs: 0, sm: '0 auto' },
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 'bold',
                        backgroundColor: '#008080',
                        color: 'white'
                      }}
                    ></TableCell>
                    {['月', '火', '水', '木', '金', defCalendarInfo?.sat_flag && '土']
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
          </Box>
        ) : (
          <Typography
            variant="h4"
            align="center"
            sx={{ color: 'white', mt: 4 }}
          >
            未設定
          </Typography>
        )}
        <Button
           variant="contained"
           color="primary"
           sx={{ mt: 2 }}
           onClick={handleRegisterRequiredCourses}
      >
            必修科目を自動登録する
        </Button>


        <Box
          sx={{
            mt: 6,
            mb: 6,
            padding: 2,
            borderRadius: 2,
            maxWidth: '1200px',
            margin: '0 auto'
          }}
        >
          <Typography
            variant="h5"
            sx={{ margin: 3, textAlign: 'center', color: 'white' }}
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
            {unmatchedLectures?.length > 0 ? (
              unmatchedLectures.map((lecture) => (
                <Box
                  key={lecture.id}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    padding: 0,
                    width: '180px',
                    height: '80px',
                    textAlign: 'center'
                  }}
                >
                  <Button
                    fullWidth
                    sx={{
                      height: '100%',
                      padding: 0,
                      fontSize: '12px',
                      lineHeight: '1.2',
                      textAlign: 'center',
                      wordWrap: 'break-word',
                      whiteSpace: 'normal',
                      overflow: 'hidden'
                    }}
                    variant="contained"
                    color="primary"
                    onClick={() =>
                      navigate('/register-lecture', {
                        state: { lecture }
                      })
                    }
                  >
                    {lecture.科目}
                  </Button>
                </Box>
              ))
            ) : (
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ textAlign: 'center' }}
              >
                登録されているその他の講義がありません。
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* メモ欄を追加 */}
      <Box
        sx={{
          mt: 4,
          mb: 6,
          maxWidth: '2000px',
          margin: '0 auto',
          padding: 3,
          backgroundColor: '#f5f5f5',
          borderRadius: 2,
          boxShadow: 2
        }}
      >
        <Typography
          variant="h5"
          sx={{ marginBottom: 2, textAlign: 'center', color: '#333' }}
        >
          📝 メモ
        </Typography>
        <MemoCard lectureId="personal_note" lectureName="個人メモ" />
      </Box>
      
      <Footer />
    </Box>
  );
};