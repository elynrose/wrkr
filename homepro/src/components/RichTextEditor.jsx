import { useRef, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold, faItalic, faUnderline, faStrikethrough,
  faListUl, faListOl, faQuoteLeft, faLink, faUnlink,
  faAlignLeft, faAlignCenter, faAlignRight,
  faCode, faEraser, faRotateLeft, faRotateRight,
} from '@fortawesome/free-solid-svg-icons';

const HEADINGS = ['Normal', 'H1', 'H2', 'H3', 'H4'];
const HEADING_MAP = { Normal: 'p', H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4' };

export default function RichTextEditor({ value, onChange, darkMode, minHeight = 300 }) {
  const editorRef = useRef(null);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  }, []);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange?.(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleHeading = (e) => {
    const tag = HEADING_MAP[e.target.value];
    if (tag === 'p') {
      exec('formatBlock', '<p>');
    } else {
      exec('formatBlock', `<${tag}>`);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const border = darkMode ? '#334155' : '#d1d5db';
  const bg = darkMode ? '#0f172a' : '#fff';
  const toolbarBg = darkMode ? '#1e293b' : '#f8fafc';
  const btnColor = darkMode ? '#cbd5e1' : '#475569';

  const btnStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 8px', borderRadius: 4, color: btnColor,
    fontSize: 13, display: 'inline-flex', alignItems: 'center',
    transition: 'background 0.1s',
  };

  const sep = <div style={{ width: 1, height: 20, background: border, margin: '0 4px', flexShrink: 0 }} />;

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
        background: toolbarBg, borderBottom: `1px solid ${border}`,
        alignItems: 'center',
      }}>
        <select onChange={handleHeading} defaultValue="Normal" style={{
          padding: '4px 8px', fontSize: 12, fontWeight: 600, borderRadius: 4,
          border: `1px solid ${border}`, background: bg, color: btnColor,
          cursor: 'pointer', marginRight: 4,
        }}>
          {HEADINGS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        {sep}

        <Btn icon={faBold} title="Bold" onClick={() => exec('bold')} style={btnStyle} />
        <Btn icon={faItalic} title="Italic" onClick={() => exec('italic')} style={btnStyle} />
        <Btn icon={faUnderline} title="Underline" onClick={() => exec('underline')} style={btnStyle} />
        <Btn icon={faStrikethrough} title="Strikethrough" onClick={() => exec('strikethrough')} style={btnStyle} />

        {sep}

        <Btn icon={faListUl} title="Bullet List" onClick={() => exec('insertUnorderedList')} style={btnStyle} />
        <Btn icon={faListOl} title="Numbered List" onClick={() => exec('insertOrderedList')} style={btnStyle} />
        <Btn icon={faQuoteLeft} title="Blockquote" onClick={() => exec('formatBlock', '<blockquote>')} style={btnStyle} />

        {sep}

        <Btn icon={faAlignLeft} title="Align Left" onClick={() => exec('justifyLeft')} style={btnStyle} />
        <Btn icon={faAlignCenter} title="Align Center" onClick={() => exec('justifyCenter')} style={btnStyle} />
        <Btn icon={faAlignRight} title="Align Right" onClick={() => exec('justifyRight')} style={btnStyle} />

        {sep}

        <Btn icon={faLink} title="Insert Link" onClick={insertLink} style={btnStyle} />
        <Btn icon={faUnlink} title="Remove Link" onClick={() => exec('unlink')} style={btnStyle} />
        <Btn icon={faCode} title="Code Block" onClick={() => exec('formatBlock', '<pre>')} style={btnStyle} />

        {sep}

        <Btn icon={faEraser} title="Clear Formatting" onClick={() => exec('removeFormat')} style={btnStyle} />
        <Btn icon={faRotateLeft} title="Undo" onClick={() => exec('undo')} style={btnStyle} />
        <Btn icon={faRotateRight} title="Redo" onClick={() => exec('redo')} style={btnStyle} />
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={emitChange}
        onBlur={emitChange}
        style={{
          minHeight,
          padding: 16,
          outline: 'none',
          background: bg,
          color: darkMode ? '#e2e8f0' : '#1e293b',
          fontSize: 14,
          lineHeight: 1.7,
          overflowY: 'auto',
          maxHeight: 600,
          fontFamily: 'inherit',
        }}
        suppressContentEditableWarning
      />

      {/* Inline styles for editor content */}
      <style>{`
        [contenteditable] h1 { font-size: 28px; font-weight: 800; margin: 16px 0 8px; }
        [contenteditable] h2 { font-size: 22px; font-weight: 700; margin: 14px 0 6px; }
        [contenteditable] h3 { font-size: 18px; font-weight: 700; margin: 12px 0 6px; }
        [contenteditable] h4 { font-size: 16px; font-weight: 600; margin: 10px 0 4px; }
        [contenteditable] p { margin: 8px 0; }
        [contenteditable] ul, [contenteditable] ol { margin: 8px 0; padding-left: 24px; }
        [contenteditable] li { margin: 4px 0; }
        [contenteditable] blockquote { border-left: 4px solid var(--color-primary); padding: 8px 16px; margin: 12px 0; opacity: 0.85; font-style: italic; }
        [contenteditable] pre { background: ${darkMode ? '#1e293b' : '#f1f5f9'}; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; overflow-x: auto; }
        [contenteditable] a { color: var(--color-primary); text-decoration: underline; }
        [contenteditable] strong { font-weight: 700; }
      `}</style>
    </div>
  );
}

function Btn({ icon, title, onClick, style }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={style}
      onMouseDown={e => e.preventDefault()}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,100,100,0.12)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
}
