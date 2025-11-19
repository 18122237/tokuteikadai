import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Header } from '../templates/Header';
import { useSetup } from '../hooks/useSetup';
import {
    Container,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button,
    Typography,
    Paper,
    Box,
} from '@mui/material';
const apiUrl = process.env.REACT_APP_API_URL;

const CAMPUS = ["青山", "相模原" ];

const DEPARTMENTS = [
    "指定なし", "青山スタンダード科目", "文学部共通", "文学部外国語科目", "英米文学科", "フランス文学科",
    "比較芸術学科", "教育人間　外国語科目", "教育人間　教育学科", "教育人間　心理学科", "経済学部",
    "法学部", "経営学部", "教職課程科目", "国際政治経済学部", "総合文化政策学部", "日本文学科",
    "史学科", "理工学部共通", "物理科学", "数理サイエンス", "物理・数理", "電気電子工学科",
    "機械創造", "経営システム", "情報テクノロジ－", "社会情報学部", "地球社会共生学部", "コミュニティ人間科学部",
    "化学・生命"
];
const SEMESTERS = [
    "指定なし", "前期", "通年", "後期"
];

const GRADE = [
    "1年","2年","3年","4年"
];

export const CalendarCreate = () => {
    const navigate = useNavigate();
    const location = useLocation(); // 編集用のデータを受け取る
    const { userId } = useSetup();

    const initialCalendar = location.state?.calendarData;
    const [calendarId, setCalendarId] = useState(initialCalendar?.id || null);
    const isEditMode = Boolean(calendarId);
    const [formData, setFormData] = useState({
        calendar_name: initialCalendar?.calendar_name || '',
        grade: initialCalendar?.grade || '',
        campus: initialCalendar?.campus?.[0] || '',
        department: initialCalendar?.department || [],
        semester: initialCalendar?.semester?.[0] || '',
        sat_flag: initialCalendar?.sat_flag || false,
        sixth_period_flag: initialCalendar?.sixth_period_flag || false,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === "department") {
            setFormData((prev) => {
                const departments = prev.department.includes(value)
                    ? prev.department.filter((dep) => dep !== value)
                    : [...prev.department, value];
                return { ...prev, department: departments };
            });
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            }));
        }
    };

    const buildCalendarRequestBody = () => ({
        id: calendarId || 0,
        user_id: userId,
        calendar_name: formData.calendar_name.trim() || "",
        campus: formData.campus ? [formData.campus] : [],
        semester: formData.semester ? [formData.semester] : [],
        department: formData.department.length > 0 ? formData.department : [],
        sat_flag: Boolean(formData.sat_flag),
        sixth_period_flag: Boolean(formData.sixth_period_flag),
    });

    const saveCalendar = async (navigateAfterSave = false) => {
        if (!userId) {
            throw new Error('ユーザー情報が取得できませんでした。');
        }

        const mode = calendarId ? 'u' : 'c';
        const requestBody = buildCalendarRequestBody();

        console.log('送信するリクエストボディ:', requestBody); // デバッグ用ログ

        const response = await axios.post(
            `${apiUrl}/calendar/c-u/${mode}`,
            requestBody,
            { headers: { "Content-Type": "application/json" }, withCredentials: true }
        );

        const savedId = response.data.calendar.id;
        setCalendarId(savedId);

        if (navigateAfterSave) {
            alert(mode === 'u' ? 'カレンダーが更新されました。' : 'カレンダーが作成されました。');
            navigate(mode === 'u' ? '/calendar/list' : '/');
        }

        return { savedId, mode };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await saveCalendar(true);
        } catch (error) {
            console.error('カレンダー作成失敗:', error.response?.data || error);

            if (error.response?.data?.detail) {
                console.error('エラー詳細:', error.response.data.detail);
                alert(`カレンダー作成に失敗しました: ${error.response.data.detail.map(d => d.msg).join(', ')}`);
            } else {
                alert('カレンダー作成に失敗しました');
            }
        }
    };

    const handleRegisterRequiredCourses = async () => {
        const selectedDepartments = formData.department.filter((dep) => dep !== '指定なし');
        const gradeNumber = parseInt(formData.grade?.replace('年', ''), 10);

        if (!userId) {
            alert('ユーザー情報が取得できませんでした。');
            return;
        }

        if (!formData.campus || !formData.semester || selectedDepartments.length === 0 || Number.isNaN(gradeNumber)) {
            alert('学年、学部、学期、キャンパスの情報を入力してください。');
            return;
        }

        let targetCalendarId = calendarId;

        try {
            if (!targetCalendarId) {
                const { savedId } = await saveCalendar(false);
                targetCalendarId = savedId;
            }

            const response = await axios.post(
                `${apiUrl}/required_courses/register`,
                {
                    calendar_id: targetCalendarId,
                    grade: gradeNumber,
                    campus: formData.campus || null,
                    semester: formData.semester || null,
                    departments: selectedDepartments,
                },
                { headers: { "Content-Type": "application/json" }, withCredentials: true }
            );

            const { registered = [], skipped = [], already_registered = [] } = response.data;
            const messages = [
                `登録した必修科目: ${registered.length}件`,
                `既に登録済み: ${already_registered.length}件`,
            ];

            if (skipped.length > 0) {
                messages.push(`時間割の重複などで登録できなかった科目: ${skipped.length}件`);
            }

            alert(messages.join('\n'));
        } catch (error) {
            console.error('必修科目登録失敗:', error.response?.data || error);

            if (error.response?.data?.detail) {
                alert(`必修科目登録に失敗しました: ${error.response.data.detail}`);
            } else {
                alert('必修科目登録に失敗しました');
            }
        }
    };

    return (
        <Box>
            <Header />
            <Container maxWidth="lg" style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                    <Paper style={{ padding: '20px' }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="カレンダー名"
                                    name="calendar_name"
                                    value={formData.calendar_name}
                                    onChange={handleChange}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>学年</InputLabel>
                                    <Select
                                        name="grade"
                                        value={formData.grade}
                                        onChange={handleChange}
                                        label="学年"
                                    >
                                        {GRADE.map((grade) => (
                                            <MenuItem key={grade} value={grade}>
                                                {grade}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>キャンパス</InputLabel>
                                    <Select
                                        name="campus"
                                        value={formData.campus}
                                        onChange={handleChange}
                                        label="キャンパス"
                                    >
                                        {CAMPUS.map((campus) => (
                                            <MenuItem key={campus} value={campus}>
                                                {campus}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>学期</InputLabel>
                                    <Select
                                        name="semester"
                                        value={formData.semester}
                                        onChange={handleChange}
                                        label="学期"
                                    >
                                        {SEMESTERS.map((semester) => (
                                            <MenuItem key={semester} value={semester}>
                                                {semester}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    学部
                                </Typography>
                                <FormGroup
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', // 自動調整
                                        gap: '10px',
                                    }}
                                >
                                    {DEPARTMENTS.map((department) => (
                                        <FormControlLabel
                                            key={department}
                                            control={
                                                <Checkbox
                                                    name="department"
                                                    value={department}
                                                    checked={formData.department.includes(department)}
                                                    onChange={handleChange}
                                                />
                                            }
                                            label={department}
                                        />
                                    ))}
                                </FormGroup>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    オプション設定
                                </Typography>

                                <FormGroup row>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                name="sat_flag"
                                                checked={formData.sat_flag}
                                                onChange={handleChange}
                                            />
                                        }
                                        label="土曜授業あり"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                name="sixth_period_flag"
                                                checked={formData.sixth_period_flag}
                                                onChange={handleChange}
                                            />
                                        }
                                        label="6時限目あり"
                                    />
                                </FormGroup>
                            </Grid>
                            <Grid
                                item
                                xs={12}
                                style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}
                            >
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    style={{ width: '200px' }}
                                >
                                    {isEditMode ? '更新' : '作成'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleRegisterRequiredCourses}
                                    style={{ width: '200px' }}
                                >
                                    必修科目を登録
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                </form>
            </Container>
        </Box>
    );
};
