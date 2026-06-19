export default function SearchBar({ value, onChange }) {
  return (
    <div style={s.wrap}>
      <input
        style={s.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="모델명 검색..."
      />
    </div>
  );
}

const s = {
  wrap: { padding: '10px 14px', borderBottom: '1px solid var(--border)' },
  input: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid var(--border2)',
    borderRadius: 7,
    fontSize: 12,
    background: 'var(--bg3)',
    color: 'var(--text)',
    outline: 'none',
  },
};
