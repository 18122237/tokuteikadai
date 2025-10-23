import React, { useContext, useMemo } from 'react'; // useMemo を追加
import { Navigate, useNavigate } from 'react-router-dom';
import { UserContext } from '../providers/UserProvider';
import { Header } from '../templates/Header';
import { Footer } from '../templates/Footer';
import { useSetup } from '../hooks/useSetup';
import { MemoCard } from '../elements/MemoCard'; // MemoCard をインポート
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
  Paper
} from '@mui/material';

// 🟢 各講義のメモのタイトルを取得するヘルパー関数
const getLectureMemoTitle = (lectureId) => {
  const storageKey = `memo_${lectureId}`;
  const savedData = JSON.parse(localStorage.getItem(storageKey));
  return savedData?.title;
};

export const Home = () => {
  const { isLogined } = useContext(UserContext);
  const { defCalendarInfo, lectureInfo } = useSetup();
  const navigate = useNavigate();

  if (!isLogined) {
    return <Navigate to="/login" />;
  }

  // 🟢 単位数の合計を計算する useMemo
  const totalUnits = useMemo(() => {
    if (!lectureInfo?.results) return 0;

    return lectureInfo.results.reduce((total, lecture) => {
      // 講義の「単位」は文字列なので、parseFloatで数値に変換して合計
      const unit = parseFloat(lecture.単位) || 0;
      return total + unit;
    }, 0);
  }, [lectureInfo]);

  // 🟢 useMemo を使用して、時間割のレンダリング結果をメモ化
  const calendarRows = useMemo(() => {
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

          // 🟢 講義が登録されていればメモタイトルを取得
          if (lecture) {
            memoTitle = getLectureMemoTitle(lecture.id);
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
                }}
                variant="contained"
                color={lecture ? 'primary' : 'default'}
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
                  {/* 🟢 メモがある場合に表示 */}
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

  // 既存のunmatchedLecturesのロジックをuseMemoでラップ
  const unmatchedLectures = useMemo(() => {
    return lectureInfo?.registered_user_kougi
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

        {/* 🟢 単位数の合計表示のJSX */}
        <Typography
          variant="h6"
          align="center"
          sx={{ color: 'yellow', marginBottom: 3, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.2)', mx: 3, py: 1, borderRadius: 1 }}
        >
          合計取得予定単位数: {totalUnits.toFixed(1)} 単位
        </Typography>

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
          maxWidth: '800px',
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