import React, { useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UserContext } from '../providers/UserProvider';
import { Header } from '../templates/Header';
import { Footer } from '../templates/Footer';
import { useSetup } from '../hooks/useSetup';
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

export const Home = () => {
    const { isLogined } = useContext(UserContext);
    const { defCalendarInfo, lectureInfo } = useSetup();
    const navigate = useNavigate();

    if (!isLogined) {
        return <Navigate to="/login" />;
    }

    const createCalendar = () => {
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

                // 最初の列（時限列）の場合
                if (j === 0) {
                    content = `${i}限`; // 時限表記
                    cells.push(
                        <TableCell
                            key={`${i}-${j}`}
                            align="center"
                            sx={{
                                backgroundColor: '#e0f7fa', // 薄い水色
                                border: '1px solid #ddd',
                                fontWeight: 'bold',
                                padding: 0,
                                maxWidth: '180px',
                                maxHeight: '80px',
                            }}
                        >
                            <Typography>{content}</Typography>
                        </TableCell>
                    );
                } else {
                    // 曜日・時限セルの場合
                    const day = days[j - 1];
                    const period = i.toString();
                    const buttonId = `${day}${period}`.replace(/\d/, (d) =>
                        String.fromCharCode(d.charCodeAt(0) + 0xfee0)
                    );
                    const lectureId = lectureMap[buttonId];
                    lecture = lectureDetails?.[lectureId];
                    content = lecture?.科目 || '－';

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
                                overflow: 'hidden',
                            }}
                        >
                            <Button
                                fullWidth
                                sx={{
                                    height: '100%',
                                    padding: 0,
                                    maxWidth: '180px',
                                    minHeight: '80px',
                                }}
                                variant="contained"
                                color={lecture ? 'primary' : 'default'}
                                onClick={() =>
                                    lecture
                                        ? navigate('/register-lecture', { state: { lecture } })
                                        : navigate('/search', {
                                            state: { days: [day], periods: [period.toUpperCase()] },
                                        })
                                }
                            >
                                {content}
                            </Button>
                        </TableCell>
                    );
                }
            }
            rows.push(<TableRow key={i}>{cells}</TableRow>);
        }
        return rows;
    };

    const unmatchedLectures = lectureInfo?.registered_user_kougi
        .filter((registered) => {
            const isOtherLecture = registered.period.includes('曜') || registered.period.includes('不定');
            return isOtherLecture;
        })
        .map((unmatched) => {
            const lecture = lectureInfo?.results.find(
                (lecture) => lecture.id === unmatched.kougi_id
            );
            return lecture;
        })
        .filter(Boolean);

    return (
        <Box>
            <Box sx={{ top: 0, left: 0, width: '100%', zIndex: 1000 }}>
                <Header />
            </Box>
            <Box sx={{ backgroundColor: '#8fbc8f', minHeight: '100vh', padding: 0, paddingTop: '30px' }}>
                <Typography variant="h4" align="center" sx={{ color: 'white', marginBottom: 3 }}>
                    {defCalendarInfo?.calendar_name || 'ホーム画面'}
                </Typography>

                <Box
                sx={{
                    margin: 3,
                    display: 'flex', // 横並びにする
                    flexWrap: 'nowrap', // 折り返しを防止
                    justifyContent: 'center', // 水平方向中央寄せ
                    alignItems: 'center', // 垂直方向中央寄せ
                    gap: 2, // ボタン間のスペース
                }}
            >
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/calendar/create')}
                    sx={{
                        flex: '1 0 auto', // サイズを調整
                        minWidth: '150px', // ボタンの最低幅
                        maxWidth: '200px',
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
                        maxWidth: '200px',
                    }}
                >
                    保存済みのカレンダー
                </Button>
                <Button
    variant="contained"
    color="secondary"
    onClick={() => navigate('/public-schedules')}
    sx={{
        flex: '1 0 auto',
        minWidth: '150px',
        maxWidth: '200px',
    }}
>
    公開中の時間割を見る
</Button>

            </Box>

                {defCalendarInfo ? (
                    <Box
                        sx={{
                            mt: 4,
                            maxWidth: '1200px',
                            margin: '0 auto',
                            overflowX: 'auto',
                            borderRadius: 2,
                        }}
                    >
                        <TableContainer
                            component={Paper}
                            sx={{
                                width: '100%',
                                margin: { xs: 0, sm: '0 auto' },
                                borderRadius: 2,
                                overflow: 'hidden',
                            }}
                        >
                            <Table
                                sx={{
                                    tableLayout: 'fixed',
                                    width: '100%',
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#008080', color: 'white' }}>
                                        </TableCell>
                                        {['月', '火', '水', '木', '金', defCalendarInfo?.sat_flag && '土']
                                            .filter(Boolean)
                                            .map((day) => (
                                                <TableCell key={day} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#008080', color: 'white' }}>
                                                    {day}
                                                </TableCell>
                                            ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>{createCalendar()}</TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ) : (
                    <Typography variant="h4" align="center" sx={{ color: 'white', mt: 4 }}>
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
                    margin: '0 auto',
                }}
                >
                <Typography variant="h5" sx={{ margin: 3, textAlign: 'center', color: 'white' }}>
                    その他の講義
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                    {unmatchedLectures?.length > 0 ? (
                    unmatchedLectures.map((lecture) => (
                        <Box
                        key={lecture.id}
                        sx={{
                            backgroundColor: '#f5f5f5',
                            border: '1px solid #ddd',
                            borderRadius: 2,
                            padding: 0,
                            width: '180px', // 時間割ボタンと同じ幅
                            height: '80px', // 時間割ボタンと同じ高さ
                            textAlign: 'center',
                        }}
                        >
                        <Button
                            fullWidth
                            sx={{
                            height: '100%', // ボタンがセル内に完全フィット
                            padding: 0, // ボタン内の余白を統一
                            fontSize: '12px', // ボタン内のフォントサイズを調整
                            lineHeight: '1.2', // 行間を狭める
                            textAlign: 'center', // テキストを中央揃え
                            wordWrap: 'break-word', // テキストを折り返す
                            whiteSpace: 'normal', // テキストの折り返しを有効化
                            overflow: 'hidden', // コンテンツのはみ出しを防止
                            }}
                            variant="contained"
                            color="primary"
                            onClick={() =>
                            navigate('/register-lecture', {
                                state: { lecture },
                            })
                            }
                        >
                            {lecture.科目}
                        </Button>
                        </Box>
                    ))
                    ) : (
                    <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center' }}>
                        登録されているその他の講義がありません。
                    </Typography>
                    )}
                </Box>
                </Box>
            </Box>
            <Footer />
        </Box>
    );
};
