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

const grade = [
    "1年","2年","3年","4年"
];

export const CalendarCreate = () => {
    const navigate = useNavigate();
    const location = useLocation(); // 編集用のデータを受け取る
    const { userId } = useSetup();

    // 初期データ (編集モードか作成モードか判断)
    const isEditMode = location.state?.calendarData ? true : false;
    const [formData, setFormData] = useState({
        id: isEditMode ? location.state.calendarData.id : 0,
        calendar_name: location.state?.calendarData?.calendar_name || '',
        campus: location.state?.calendarData?.campus[0] || '',
        department: location.state?.calendarData?.department || [],
        semester: location.state?.calendarData?.semester[0] || '',
        grade: location.state?.calendarData?.grade
          ? `${location.state.calendarData.grade}年`  // ← ここ超重要！
          : "",
        sat_flag: location.state?.calendarData?.sat_flag || false,
        sixth_period_flag: location.state?.calendarData?.sixth_period_flag || false,
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

    const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
        alert('ユーザー情報が取得できませんでした。');
        return;
    }

    // --- ★ 学年（grade）の安全変換処理 ★ ---
    let gradeNumber = null;

    if (formData.grade) {
        // formData.grade が "1年" "2年" の場合 → 数字に変換
        if (typeof formData.grade === "string") {
            gradeNumber = Number(formData.grade.replace("年", ""));
        } 
        // 編集画面で DB から 1,2,3 の数字が来た場合
        else if (typeof formData.grade === "number") {
            gradeNumber = formData.grade;
        }
    }

        const mode = isEditMode ? 'u' : 'c'; // 作成か編集か
        // リクエストボディの作成
        const requestBody = {
            id: isEditMode ? formData.id : 0, // 編集時は既存のカレンダーIDを使用
            user_id: userId, // ユーザー ID を設定
            calendar_name: formData.calendar_name.trim() || "", // 必須フィールド（空白をトリム）
            campus: formData.campus ? [formData.campus] : [], // 単一値をリストに変換
            semester: formData.semester ? [formData.semester] : [], // 単一値をリストに変換
            department: formData.department.length > 0 ? formData.department : [], // 空リスト対応
            grade: gradeNumber,   // ← これ追加！
            sat_flag: Boolean(formData.sat_flag), // ブール値に変換
            sixth_period_flag: Boolean(formData.sixth_period_flag), // ブール値に変換
        };
    
        console.log('送信するリクエストボディ:', requestBody); // デバッグ用ログ
    
        try {
            await axios.post(
                `${apiUrl}/calendar/c-u/${mode}`,
                requestBody, // リクエストボディ
                { headers: { "Content-Type": "application/json" }, withCredentials: true }
            );
            alert(isEditMode ? 'カレンダーが更新されました。' : 'カレンダーが作成されました。');
            navigate(isEditMode ? '/calendar/list' : '/'); // 成功後にリダイレクト
        } catch (error) {
            console.error('カレンダー作成失敗:', error.response?.data || error)
    
            // APIからのエラー詳細を表示
            if (error.response?.data?.detail) {
                console.error('エラー詳細:', error.response.data.detail);
                alert(`カレンダー作成に失敗しました: ${error.response.data.detail.map(d => d.msg).join(', ')}`);
            } else {
                alert('カレンダー作成に失敗しました');
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
                                        {grade.map((g) => {
                                           const yearNumber = Number(g.replace("年", ""));
                                           return (
                                              <MenuItem key={yearNumber} value={yearNumber}>
                                                 {g}
                                              </MenuItem>
                                           );
                                        })}
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
                            <Grid item xs={12} style={{ textAlign: 'center' }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    style={{ width: '200px' }}
                                >
                                    {isEditMode ? '更新' : '作成'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                </form>
            </Container>
        </Box>
    );
};
