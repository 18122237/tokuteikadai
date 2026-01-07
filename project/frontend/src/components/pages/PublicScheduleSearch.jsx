import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// API URLを取得（環境変数がない場合はデフォルト値を使用）
const getApiUrl = () => {
  try {
    return process.env.REACT_APP_API_URL || "http://localhost:8000";
  } catch {
    return "http://localhost:8000";
  }
};

const apiUrl = getApiUrl();

export default function PublicScheduleSearch() {
  const navigate = useNavigate(); // ← この行を追加
  
  // 検索条件
  const [department, setDepartment] = useState("");
  const [campus, setCampus] = useState("");
  const [semester, setSemester] = useState("");
  const [keyword, setKeyword] = useState("");
  
  // 検索結果
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  
  // 統計情報
  const [stats, setStats] = useState(null);

  // 初期表示で全件取得
  useEffect(() => {
    handleSearch();
    fetchStats();
  }, []);

// 統計情報取得
  const fetchStats = async () => {
    try {
      const res = await fetch(`${apiUrl}/calendar/public/stats`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log("取得した統計情報:", data);
      setStats(data);
    } catch (err) {
      console.error("統計情報の取得に失敗:", err);
      // エラーが発生してもUIは表示し続ける
    }
  };

  // 検索実行
  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    
    try {
      const res = await fetch(`${apiUrl}/calendar/public/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department: department || null,
          campus: campus || null,
          semester: semester || null,
          keyword: keyword || null,
        }),
      });
      
      const data = await res.json();
      setCalendars(data.calendars || []); // デフォルト値を設定
      console.log("検索結果:", data);
    } catch (err) {
      console.error("検索エラー:", err);
      setCalendars([]); // エラー時は空配列を設定
      alert("検索に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 検索条件クリア
  const handleClear = () => {
    setDepartment("");
    setCampus("");
    setSemester("");
    setKeyword("");
    setSearched(false);
  };

// カレンダー詳細へ遷移
  const handleViewDetail = (calendarId) => {
    navigate(`/public-schedules/${calendarId}`);
  };

// ホームへ遷移(ログイン画面ではない)
  const handleGoHome = () => {
    navigate('/');
  };

  const styles = {
    container: {
      padding: '32px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
    },
    header: {
      fontSize: '2rem',
      textAlign: 'center',
      marginBottom: '32px',
      color: '#333',
    },
    statsPanel: {
      padding: '16px',
      marginBottom: '24px',
      backgroundColor: '#e3f2fd',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    statsTitle: {
      fontSize: '1.25rem',
      marginBottom: '12px',
      fontWeight: 'bold',
    },
    statsContent: {
      display: 'flex',
      gap: '24px',
      flexWrap: 'wrap',
      fontSize: '0.875rem',
    },
    searchPanel: {
      padding: '24px',
      marginBottom: '32px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    searchTitle: {
      fontSize: '1.25rem',
      marginBottom: '16px',
      fontWeight: 'bold',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '16px',
    },
    formControl: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#555',
    },
    select: {
      padding: '10px',
      fontSize: '1rem',
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
    },
    input: {
      padding: '10px',
      fontSize: '1rem',
      border: '1px solid #ccc',
      borderRadius: '4px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '16px',
      marginTop: '16px',
    },
    button: {
      padding: '10px 24px',
      fontSize: '1rem',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    primaryButton: {
      backgroundColor: '#1976d2',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: 'white',
      color: '#1976d2',
      border: '1px solid #1976d2',
    },
    resultsHeader: {
      fontSize: '1.25rem',
      marginBottom: '16px',
      fontWeight: 'bold',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '24px',
      marginTop: '16px',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    cardTitle: {
      fontSize: '1.125rem',
      fontWeight: 'bold',
      marginBottom: '12px',
      color: '#333',
    },
    chipContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '12px',
    },
    chip: {
      padding: '4px 12px',
      borderRadius: '16px',
      fontSize: '0.75rem',
      fontWeight: '500',
    },
    primaryChip: {
      backgroundColor: '#1976d2',
      color: 'white',
    },
    secondaryChip: {
      backgroundColor: '#dc004e',
      color: 'white',
    },
    cardText: {
      fontSize: '0.875rem',
      color: '#666',
      marginTop: '8px',
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px',
    },
    spinner: {
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #1976d2',
      borderRadius: '50%',
      width: '50px',
      height: '50px',
      animation: 'spin 1s linear infinite',
    },
    emptyMessage: {
      textAlign: 'center',
      marginTop: '32px',
      fontSize: '1rem',
      color: '#666',
    },
    centerButton: {
      textAlign: 'center',
      marginTop: '32px',
    },
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .card:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          }
          .button:hover {
            opacity: 0.9;
          }
          .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}
      </style>

      {/* ヘッダー */}
      <h1 style={styles.header}>📚 先輩の履修例を探す</h1>

     {/* 統計情報 */}
      {stats && (
        <div style={styles.statsPanel}>
          <div style={styles.statsTitle}>📊 公開中の時間割統計</div>
          <div style={styles.statsContent}>
            <div>
              <strong>総数:</strong> {stats.total_public || 0}件
            </div>
            {stats.by_department && Object.keys(stats.by_department).length > 0 && (
              <div>
                <strong>学部別:</strong>{" "}
                {Object.entries(stats.by_department)
                  .slice(0, 5) // 最初の5件のみ表示
                  .map(([dept, count]) => `${dept}(${count})`)
                  .join(", ")}
                {Object.keys(stats.by_department).length > 5 && " ..."}
              </div>
            )}
            {stats.by_campus && Object.keys(stats.by_campus).length > 0 && (
              <div>
                <strong>キャンパス別:</strong>{" "}
                {Object.entries(stats.by_campus)
                  .map(([campus, count]) => `${campus}(${count})`)
                  .join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 検索フォーム */}
      <div style={styles.searchPanel}>
        <div style={styles.searchTitle}>🔍 検索条件</div>
        
        <div style={styles.formGrid}>
          {/* 学部選択 */}
          <div style={styles.formControl}>
            <label style={styles.label}>学部</label>
            <select
              style={styles.select}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">すべて</option>
              <option value="経済学部">経済学部</option>
              <option value="法学部">法学部</option>
              <option value="経営学部">経営学部</option>
              <option value="文学部">文学部</option>
              <option value="国際政治経済学部">国際政治経済学部</option>
              <option value="社会情報学部">社会情報学部</option>
              <option value="理工学部">理工学部</option>
              <option value="地球社会共生学部">地球社会共生学部</option>
              <option value="コミュニティ人間科学部">コミュニティ人間科学部</option>
            </select>
          </div>

          {/* キャンパス選択 */}
          <div style={styles.formControl}>
            <label style={styles.label}>キャンパス</label>
            <select
              style={styles.select}
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
            >
              <option value="">すべて</option>
              <option value="青山">青山</option>
              <option value="相模原">相模原</option>
            </select>
          </div>

          {/* 学期選択 */}
          <div style={styles.formControl}>
            <label style={styles.label}>学期</label>
            <select
              style={styles.select}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="">すべて</option>
              <option value="前期">前期</option>
              <option value="後期">後期</option>
              <option value="通年">通年</option>
            </select>
          </div>

          {/* キーワード検索 */}
          <div style={styles.formControl}>
            <label style={styles.label}>キーワード</label>
            <input
              style={styles.input}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="学年（半角数字のみ）、またはカレンダー名で検索"
            />
          </div>
        </div>

        {/* ボタン */}
        <div style={styles.buttonGroup}>
          <button
            className="button"
            style={{...styles.button, ...styles.primaryButton}}
            onClick={handleSearch}
            disabled={loading}
          >
            🔍 検索
          </button>
          <button
            className="button"
            style={{...styles.button, ...styles.secondaryButton}}
            onClick={handleClear}
          >
            ✕ クリア
          </button>
        </div>
      </div>

      {/* 検索結果 */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : searched ? (
        <>
          <div style={styles.resultsHeader}>
            検索結果: {calendars?.length || 0}件
          </div>

          {!calendars || calendars.length === 0 ? (
            <div style={styles.emptyMessage}>
              条件に一致する時間割が見つかりませんでした。
            </div>
          ) : (
            <div style={styles.grid}>
              {calendars.map((cal) => (
                <div
                  key={cal.id}
                  className="card"
                  style={styles.card}
                  onClick={() => handleViewDetail(cal.id)}
                >
                  <div style={styles.cardTitle}>
                    📘 {cal.calendar_name}
                  </div>
                  
                  <div style={styles.chipContainer}>
                    {cal.department && cal.department.length > 0 && (
                      <span style={{...styles.chip, ...styles.primaryChip}}>
                        {cal.department.join("・")}
                      </span>
                    )}
                    {cal.campus && cal.campus.length > 0 && (
                      <span style={{...styles.chip, ...styles.secondaryChip}}>
                        {cal.campus.join("・")}
                      </span>
                    )}
                  </div>

                  <div style={styles.cardText}>
                    📅 学期:{" "}
                    {cal.semester && cal.semester.length > 0
                      ? cal.semester.join("・")
                      : "未設定"}
                  </div>
                  <div style={styles.cardText}>
                    👤 ユーザーID: {cal.user_id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* ホームへ戻るボタン */}
      <div style={styles.centerButton}>
        <button
          className="button"
          style={{...styles.button, ...styles.primaryButton}}
          onClick={handleGoHome}
        >
          ← ホームに戻る
        </button>
      </div>
    </div>
  );
}