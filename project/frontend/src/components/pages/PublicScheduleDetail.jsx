import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * 公開カレンダー詳細（時間割表）表示
 * 使うAPI: GET /calendar/public/{id}
 */
export default function PublicScheduleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:8000/calendar/public/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("データ取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        // backend はオブジェクトを返す: { calendar_id, calendar_name, campus, department, semester, lectures: [...] }
        setCalendar(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-center mt-8">読み込み中...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">エラー: {error}</p>;
  if (!calendar) return <p className="text-center mt-8">データが存在しません。</p>;

  // テーブル軸
  const days = ["月", "火", "水", "木", "金", "土"];
  const periods = ["1", "2", "3", "4", "5", "6"]; // "1限" などの表示はUIで付ける

  // lectures 配列を map にして検索を高速化
  // backend の lecture.period が例: "月1" や "火2" などで返ってくる前提
  // ここで "月","1" に分解して key を作る
  // 全角 → 半角変換関数
const toHalfWidth = (str) => {
  return str.replace(/[！-～]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
  );
};

// lectures 配列を map にして検索を高速化
const lectureMap = {};
(calendar.lectures || []).forEach((lec) => {
  if (!lec || !lec.period) return;

  // 全角数字を半角に変換（例： "１" → "1"）
  const fixedPeriod = toHalfWidth(lec.period);

  // パターン抽出（例： "月1"）
  const m = fixedPeriod.match(/^(.{1})(\d+)/u);
  if (m) {
    const day = m[1]; // 月/火/...
    const p = m[2];   // 1/2/...
    lectureMap[`${day}-${p}`] = lec;
  } else {
    lectureMap[fixedPeriod] = lec;
  }
});


  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white shadow rounded-lg">
      <button
        onClick={() => navigate("/public-schedules")}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
      >
        ← 公開時間割一覧に戻る
      </button>

      <h1 className="text-2xl font-bold mb-2">{calendar.calendar_name || "名称未設定"}</h1>

      <div className="text-gray-700">
        <div>キャンパス：{Array.isArray(calendar.campus) ? calendar.campus.join(" / ") : (calendar.campus || "未設定")}</div>
        <div>学部：{Array.isArray(calendar.department) ? calendar.department.join(" / ") : (calendar.department || "未設定")}</div>
        <div>学期：{Array.isArray(calendar.semester) && calendar.semester.length ? calendar.semester.join(" / ") : "未設定"}</div>
      </div>

      {/* 時間割表 */}
      <div className="overflow-x-auto mt-6">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-100 w-20"></th>
              {days.map((d) => (
                <th key={d} className="border p-2 bg-gray-100 text-center">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <td className="border p-2 text-center bg-gray-50 font-semibold">{p}限</td>
                {days.map((d) => {
                  const key = `${d}-${p}`;
                  const lec = lectureMap[key];
                  return (
                    <td key={key} className="border p-2 align-top min-h-[60px]">
                      {lec ? (
                        <div className="text-sm">
                          <div className="font-bold">{lec.subject || lec.科目 || "名称不明"}</div>
                          <div className="text-gray-600 text-xs">{lec.teacher || lec.教員 || ""}</div>
                          {lec.url && (
                            <div className="text-xs mt-1">
                              <a href={lec.url} target="_blank" rel="noreferrer" className="text-sky-600 underline">シラバス</a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">―</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
