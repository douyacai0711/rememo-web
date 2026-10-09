import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, BookOpen, ChevronRight, House, Menu, Plus, Search, Settings, X } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'rememo-state-v1';
const DAY = 86400000;

const seedDecks = [
  {
    id: 'english', name: '英语词汇', short: 'EN', color: 'blue', streak: 12,
    cards: [
      { id: 1, front: "What does ‘serendipity’ mean?", back: '意外发现美好事物的运气或机缘。', interval: 0, due: 0 },
      { id: 2, front: 'ubiquitous', back: '无处不在的；普遍存在的。', interval: 0, due: 0 },
      { id: 3, front: 'meticulous', back: '一丝不苟的；极其仔细的。', interval: 2, due: Date.now() - DAY },
      { id: 4, front: 'ephemeral', back: '短暂的；转瞬即逝的。', interval: 3, due: Date.now() + DAY }
    ]
  },
  { id: 'design', name: '产品设计', short: 'PD', color: 'coral', streak: 5, cards: [
    { id: 5, front: '什么是可供性（Affordance）？', back: '物体特征向用户暗示其使用方式的属性。', interval: 0, due: 0 },
    { id: 6, front: '雅各布定律', back: '用户大部分时间使用其他产品，因此期待你的产品按熟悉方式工作。', interval: 4, due: Date.now() + DAY * 2 }
  ]},
  { id: 'history', name: '世界历史', short: '史', color: 'green', streak: 3, cards: [
    { id: 7, front: '文艺复兴发源于哪里？', back: '14 世纪的意大利城邦，尤其是佛罗伦萨。', interval: 0, due: 0 },
    { id: 8, front: '《威斯特伐利亚和约》签订于哪一年？', back: '1648 年。', interval: 7, due: Date.now() + DAY * 3 }
  ]}
];

function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return value?.version === 1 && Array.isArray(value.decks) ? value.decks : seedDecks;
  } catch { return seedDecks; }
}

function IconButton({ label, children, onClick, className = '' }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function Sidebar({ active, setActive, open, onClose, onCreate }) {
  const nav = [
    ['today', House, '今日学习'], ['decks', BookOpen, '所有牌组'], ['stats', BarChart3, '统计']
  ];
  return <aside className={`sidebar ${open ? 'is-open' : ''}`}>
    <div className="brand-row"><a className="brand" href="#today" onClick={() => setActive('today')}>Rememo</a><IconButton label="关闭菜单" className="mobile-close" onClick={onClose}><X /></IconButton></div>
    <nav aria-label="主导航">
      {nav.map(([key, Icon, label]) => <button key={key} className={`nav-item ${active === key ? 'active' : ''}`} onClick={() => { setActive(key); onClose(); }}><Icon /><span>{label}</span></button>)}
    </nav>
    <button className="create-button" onClick={onCreate}><Plus />新建卡片</button>
    <button className="nav-item settings"><Settings /><span>设置</span></button>
  </aside>;
}

function DeckRow({ deck, selected, onClick }) {
  const due = deck.cards.filter(card => card.due <= Date.now()).length;
  const learned = deck.cards.filter(card => card.interval > 0).length;
  const progress = Math.round((learned / Math.max(deck.cards.length, 1)) * 100);
  return <button className={`deck-row ${selected ? 'selected' : ''}`} onClick={onClick}>
    <span className={`deck-mark ${deck.color}`}>{deck.short}</span>
    <span className="deck-info"><strong>{deck.name}</strong><span className="deck-meta">待复习 <em>{due}</em><i />{deck.cards.length} 张卡片<i />{progress}%</span><span className="progress"><span style={{ width: `${progress}%` }} /></span></span>
    <ChevronRight className="row-chevron" />
  </button>;
}

function StudyCard({ card, flipped, onFlip, onRate, position, total }) {
  if (!card) return <section className="study-panel"><div className="study-empty"><span>✓</span><h2>今天完成了</h2><p>做得很好。新的复习会在到期后出现在这里。</p></div></section>;
  return <section className="study-panel">
    <div className="study-heading"><div><span>正在复习</span><strong>{position.deckName}</strong></div><b>{position.index + 1} / {total}</b></div>
    <div className="study-progress"><span style={{ width: `${((position.index + 1) / total) * 100}%` }} /></div>
    <button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={onFlip} aria-label={flipped ? '查看问题' : '查看答案'}>
      <span className="card-side">{flipped ? '答案' : '问题'}</span>
      <span className="card-content">{flipped ? card.back : card.front}</span>
      <span className="flip-hint">{flipped ? '点击返回问题' : '点击卡片查看答案'}</span>
    </button>
    <div className={`rating-row ${flipped ? 'visible' : ''}`} aria-hidden={!flipped}>
      {[['again','重来','1 分钟'],['hard','困难','2 天'],['good','良好','4 天'],['easy','简单','8 天']].map(([key,label,time]) => <button key={key} className={key} tabIndex={flipped ? 0 : -1} onClick={() => onRate(key)}><span>{label}</span><small>{time}</small></button>)}
    </div>
  </section>;
}

function CreateModal({ decks, onSave, onClose }) {
  const [front, setFront] = useState(''); const [back, setBack] = useState(''); const [deckId, setDeckId] = useState(decks[0]?.id);
  const submit = e => { e.preventDefault(); if (!front.trim() || !back.trim()) return; onSave({ front: front.trim(), back: back.trim(), deckId }); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}><div className="modal-head"><div><h2>新建卡片</h2><p>清晰的问题，简短的答案。</p></div><IconButton label="关闭" onClick={onClose}><X /></IconButton></div>
      <label>牌组<select value={deckId} onChange={e => setDeckId(e.target.value)}>{decks.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
      <label>正面<textarea autoFocus value={front} onChange={e => setFront(e.target.value)} placeholder="输入问题或提示词" rows="3" /></label>
      <label>背面<textarea value={back} onChange={e => setBack(e.target.value)} placeholder="输入答案" rows="4" /></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>取消</button><button className="primary" disabled={!front.trim() || !back.trim()}>添加卡片</button></div>
    </form>
  </div>;
}

function App() {
  const [decks, setDecks] = useState(readState);
  const [active, setActive] = useState('today'); const [selectedId, setSelectedId] = useState('english');
  const [query, setQuery] = useState(''); const [flipped, setFlipped] = useState(false); const [cardIndex, setCardIndex] = useState(0);
  const [modal, setModal] = useState(false); const [menu, setMenu] = useState(false); const [toast, setToast] = useState('');
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, decks })), [decks]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2200); return () => clearTimeout(id); }, [toast]);

  const selectedDeck = decks.find(deck => deck.id === selectedId) || decks[0];
  const dueCards = useMemo(() => selectedDeck.cards.filter(card => card.due <= Date.now()), [selectedDeck]);
  const currentCard = dueCards[cardIndex % Math.max(dueCards.length, 1)];
  const filteredDecks = useMemo(() => decks.filter(deck => deck.name.toLowerCase().includes(query.toLowerCase()) || deck.cards.some(c => `${c.front} ${c.back}`.toLowerCase().includes(query.toLowerCase()))), [decks, query]);
  const dueTotal = decks.reduce((sum, d) => sum + d.cards.filter(c => c.due <= Date.now()).length, 0);
  const newTotal = decks.reduce((sum, d) => sum + d.cards.filter(c => c.interval === 0).length, 0);

  const selectDeck = id => { setSelectedId(id); setCardIndex(0); setFlipped(false); setActive('today'); };
  const rate = rating => {
    const days = { again: 0, hard: 2, good: 4, easy: 8 }[rating];
    setDecks(current => current.map(deck => deck.id !== selectedId ? deck : { ...deck, cards: deck.cards.map(card => card.id !== currentCard.id ? card : { ...card, interval: days, due: rating === 'again' ? Date.now() + 60000 : Date.now() + days * DAY }) }));
    setFlipped(false); setToast(rating === 'again' ? '已安排 1 分钟后重看' : `已安排 ${days} 天后复习`);
  };
  const addCard = ({ front, back, deckId }) => {
    setDecks(current => current.map(deck => deck.id === deckId ? { ...deck, cards: [{ id: Date.now(), front, back, interval: 0, due: 0 }, ...deck.cards] } : deck));
    setSelectedId(deckId); setCardIndex(0); setModal(false); setFlipped(false); setToast('卡片已添加');
  };

  return <div className="app-shell">
    <Sidebar active={active} setActive={setActive} open={menu} onClose={() => setMenu(false)} onCreate={() => setModal(true)} />
    {menu ? <button className="sidebar-scrim" aria-label="关闭菜单" onClick={() => setMenu(false)} /> : null}
    <main className="dashboard">
      <header className="mobile-header"><IconButton label="打开菜单" onClick={() => setMenu(true)}><Menu /></IconButton><span className="brand">Rememo</span><button className="mobile-add" onClick={() => setModal(true)}><Plus /> 新建</button></header>
      <div className="welcome"><p>{new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好'}，继续保持</p></div>
      <section className="summary" aria-label="今日学习概览"><div><span>今日待复习</span><strong className="coral">{dueTotal}</strong></div><div><span>新卡片</span><strong>{newTotal}</strong></div><div><span>连续学习</span><strong>{Math.max(...decks.map(d => d.streak))}<small> 天</small></strong></div></section>
      <section className="decks-section"><div className="section-title"><h1>你的牌组</h1><label className="search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索卡片" /></label></div>
        <div className="deck-list">{filteredDecks.length ? filteredDecks.map(deck => <DeckRow key={deck.id} deck={deck} selected={deck.id === selectedId} onClick={() => selectDeck(deck.id)} />) : <div className="no-results">没有找到相关牌组或卡片</div>}</div>
      </section>
    </main>
    <StudyCard card={currentCard} flipped={flipped} onFlip={() => setFlipped(v => !v)} onRate={rate} position={{ index: 0, deckName: selectedDeck.name }} total={Math.max(dueCards.length, 1)} />
    {modal ? <CreateModal decks={decks} onSave={addCard} onClose={() => setModal(false)} /> : null}
    {toast ? <div className="toast" role="status">{toast}</div> : null}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
