import React, { useState, useEffect } from "react";

export const MemoCard = ({ lectureId, lectureName }) => {
  const [memo, setMemo] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`memo_${lectureId}`);
    if (saved) setMemo(saved);
  }, [lectureId]);

  const handleChange = (e) => {
    const value = e.target.value;
    setMemo(value);
    localStorage.setItem(`memo_${lectureId}`, value);
  };

  return (
    <div style={{ marginTop: "8px" }}>
      <textarea
        value={memo}
        onChange={handleChange}
        placeholder={`${lectureName} を入力`}
        rows={3}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          fontSize: "0.9rem",
        }}
      />
    </div>
  );
};
