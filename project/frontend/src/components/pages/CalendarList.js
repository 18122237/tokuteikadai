import React, { useState, useEffect, useContext } from 'react'; // 🟢 Import useContext
import axios from 'axios';
import { useSetup } from '../hooks/useSetup';
import { Header } from '../templates/Header';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../providers/UserProvider'; // 🟢 Import UserContext
import {
    Box,
    Button,
    Typography,
    Paper,
    Grid,
    CircularProgress,
} from '@mui/material';
const apiUrl = process.env.REACT_APP_API_URL;

export const CalendarList = () => {
    const navigate = useNavigate();

    // 🟢 Get userId directly from UserContext
    const { loginUser } = useContext(UserContext);
    const userId = loginUser?.id;

    // 🟢 Get refetch from useSetup
    const { refetch } = useSetup();

    const [calendarList, setCalendarList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch calendar list when component mounts or userId changes
    useEffect(() => {
        const fetchCalendars = async () => {
            if (!userId) {
                console.log("CalendarList: No user ID, cannot fetch list.");
                return; // Don't fetch if no user ID
            }
            console.log(`CalendarList: Fetching calendar list for user ID: ${userId}`);
            setLoading(true); // Indicate loading
            try {
                const response = await axios.get(`${apiUrl}/users/info`, {
                    withCredentials: true,
                });
                setCalendarList(response.data.calendar_info);
                console.log("CalendarList: Fetched list:", response.data.calendar_info);
            } catch (error) {
                console.error("CalendarList: Failed to fetch calendar list:", error);
            } finally {
                setLoading(false); // Finish loading
            }
        };

        fetchCalendars();
    }, [userId]); // Depend only on userId

    // Set a calendar as default
    const handleSetDefaultCalendar = async (calendarId) => {
        if (!userId) {
            alert("ユーザー情報が取得できていません。ログイン状態を確認してください。");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${apiUrl}/calendar/r-d/r?user_id=${encodeURIComponent(userId)}&calendar_id=${encodeURIComponent(calendarId)}`,
                null,
                { headers: { "Content-Type": "application/json" }, withCredentials: true } // Added withCredentials
            );
            if (response.data.calendar) {
                alert(`デフォルトカレンダーが "${response.data.calendar.calendar_name}" に設定されました。`);
                // Call refetch BEFORE navigating to ensure Home uses updated data
                if (refetch) {
                    console.log("CalendarList: Calling refetch after setting default.");
                    refetch();
                }
                navigate('/');
            } else {
                 // Handle cases where the backend might not return the calendar object as expected
                 console.warn("CalendarList: Set default response did not contain calendar data.", response.data);
                 alert("デフォルトカレンダーの設定リクエストは送信されましたが、応答が予期した形式ではありませんでした。");
                 // Still refetch and navigate as the backend state likely changed
                 if (refetch) refetch();
                 navigate('/');
            }
        } catch (error) {
            console.error("CalendarList: Failed to set default calendar:", error.response?.data || error);
            alert("デフォルトカレンダーの設定に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    // Delete a calendar
    const handleDeleteCalendar = async (calendarId) => {
        if (!userId) {
            alert("ユーザー情報が取得できていません。ログイン状態を確認してください。");
            return;
        }

        const confirmDelete = window.confirm("本当にこのカレンダーを削除しますか？");
        if (!confirmDelete) return;

        setLoading(true);
        try {
            const response = await axios.post(
                `${apiUrl}/calendar/r-d/d?user_id=${encodeURIComponent(userId)}&calendar_id=${encodeURIComponent(calendarId)}`,
                null,
                { headers: { "Content-Type": "application/json" }, withCredentials: true } // Added withCredentials
            );
            // Check specifically if the backend confirms deletion, usually indicated by calendar being null
            if (response.data && response.data.calendar === null) {
                alert("カレンダーを削除しました。");

                // Call refetch BEFORE navigating to ensure Home uses updated data
                if (refetch) {
                    console.log("CalendarList: Calling refetch after deletion.");
                    refetch();
                }
                navigate('/');
            } else {
                // If the response is not as expected, inform the user but maybe don't assume failure
                console.warn("CalendarList: Delete response was not calendar: null.", response.data);
                alert("カレンダーの削除リクエストは送信されましたが、応答が予期した形式ではありませんでした。ホーム画面で確認してください。");
                // Still refetch and navigate as the backend state likely changed
                if (refetch) refetch();
                navigate('/');
            }
        } catch (error) {
            console.error("CalendarList: Failed to delete calendar:", error.response?.data || error);
            alert("カレンダーの削除に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Header />
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    カレンダーリスト
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>

                ) : calendarList.length > 0 ? (
                    <Grid container spacing={3}>
                        {calendarList.map((calendar) => (
                            <Grid item xs={12} sm={6} md={4} key={calendar.id}>
                                <Paper elevation={3} sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        {calendar.calendar_name}
                                    </Typography>
                                    <Box sx={{ mt: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleSetDefaultCalendar(calendar.id)}
                                            disabled={loading}
                                            fullWidth
                                            sx={{ mb: 1 }}
                                        >
                                            デフォルトに設定
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => navigate('/calendar/create', { state: { calendarData: calendar } })}
                                            disabled={loading} // Disable during any loading operation
                                            fullWidth
                                            sx={{ mb: 1 }}
                                        >
                                            編集
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => handleDeleteCalendar(calendar.id)}
                                            disabled={loading}
                                            fullWidth
                                        >
                                            削除
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Typography variant="body1">
                        {userId ? "利用可能なカレンダーはありません。新規作成してください。" : "ユーザー情報を読み込み中です..."}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};