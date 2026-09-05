'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Search, ShieldCheck, UserRound } from 'lucide-react';

type User = { id: string; name: string; role: 'user' | 'admin'; created_at: string };

type Activity = { user_id: string; progress: number; status: string; completed: number; enrolled: number; tests: number; solved: number; certs: number };

export function UserManager({ initialUsers = [] }: { initialUsers?: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [activity, setActivity] = useState<Record<string, Activity>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!initialUsers.length);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load users.');
      setUsers(data.users ?? []);
      setActivity(data.activity ?? {});
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load users.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter((item) => {
    const q = query.toLowerCase().trim();
    return (!q || `${item.name} ${item.role}`.toLowerCase().includes(q)) && (filter === 'all' || item.role === filter);
  }), [users, query, filter]);

  function beginEdit(item: User) { setEditing(item); setName(item.name || ''); setRole(item.role); setMessage(''); }

  async function save() {
    if (!editing) return;
    const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: editing.id, name, role }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || 'Unable to update user.'); return; }
    setUsers(current => current.map(user => user.id === editing.id ? data.user : user));
    setEditing(null);
    setMessage('User updated.');
  }

  return <div className="admin-users-page">
    <div className="section-head">
      <div><h1 className="title">Learners</h1></div>
    </div>

    <div className="admin-filterbar surface card">
      <div className="search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by learner name or role..."/></div>
      <div className="admin-segmented" role="tablist" aria-label="Filter users">
        {(['all','user','admin'] as const).map(value => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All users' : value === 'user' ? 'Learners' : 'Admins'}</button>)}
      </div>
    </div>

    <div className="surface card">
      <div className="table-wrap"><table className="table admin-users-table"><thead><tr><th>Learner</th><th>Access</th><th>Joined</th><th>Activity</th><th>Actions</th></tr></thead><tbody>
        {filtered.map(user => { const stats = activity[user.id]; return <tr key={user.id}>
          <td><div className="user-cell"><span className="avatar-sm"><UserRound size={14}/></span><div><strong>{user.name || 'Learner'}</strong><div className="small muted">{user.id.slice(0, 8)}…</div></div></div></td>
          <td><span className={`chip ${user.role === 'admin' ? 'active' : ''}`}><ShieldCheck size={12}/>{user.role === 'admin' ? 'Administrator' : 'Learner'}</span></td>
          <td>{new Date(user.created_at).toLocaleDateString()}</td>
          <td>{stats ? `${stats.completed} topics · ${stats.solved} DSA · ${stats.tests} tests` : <span className="small muted">Profile data loaded</span>}</td>
          <td><button className="btn secondary small" type="button" onClick={() => beginEdit(user)}><Pencil size={13}/> Edit</button></td>
        </tr>; })}
      </tbody></table></div>
      {loading ? <div className="empty">Loading learner accounts…</div> : !filtered.length ? <div className="empty">No accounts match your filters.</div> : null}
    </div>

    {message ? <div className="notice" style={{ marginTop: 12 }}>{message}</div> : null}

    {editing ? <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.currentTarget === e.target) setEditing(null); }}><section className="surface card modal-card" role="dialog" aria-modal="true" aria-label="Edit learner">
      <div className="section-head"><div><div className="eyebrow">Account settings</div><h2 className="title" style={{ fontSize: 24 }}>Edit learner</h2></div><button className="icon-btn" type="button" onClick={() => setEditing(null)} aria-label="Close editor">×</button></div>
      <div className="form-grid" style={{ marginTop: 16 }}><div className="field full"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} maxLength={120}/></div><div className="field full"><label>Role</label><select value={role} onChange={e => setRole(e.target.value as 'user' | 'admin')}><option value="user">Learner</option><option value="admin">Administrator</option></select></div></div>
      <div className="form-actions"><button className="btn secondary" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="btn primary" type="button" onClick={save}>Save changes</button></div>
    </section></div> : null}
  </div>;
}
