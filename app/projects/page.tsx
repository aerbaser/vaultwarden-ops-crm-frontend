'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './projects.module.css';

type Project = { id: string; name: string; description?: string; createdAt: string };
type Team = { id: string; name: string; projectId: string; createdAt: string };
type Member = { id: string; userId: string; role: string; createdAt: string };

const ROLES = ['owner', 'editor', 'viewer'];
const roleColor = (r: string) => r === 'owner' ? 'amber' : r === 'editor' ? 'teal' : 'muted';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [tab, setTab] = useState<'overview' | 'teams' | 'members'>('overview');
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // New project
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pSaving, setPSaving] = useState(false);

  // New team (inline)
  const [tName, setTName] = useState('');
  const [tSaving, setTSaving] = useState(false);

  // New member
  const [mUserId, setMUserId] = useState('');
  const [mRole, setMRole] = useState('viewer');
  const [mSaving, setMSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('vault_token')) { router.push('/login'); return; }
    apiGet('/api/projects').then(setProjects).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selected) return;
    setTeams([]); setMembers([]);
    apiGet(`/api/teams?projectId=${selected.id}`).then(setTeams).catch(() => {});
    apiGet(`/api/projects/${selected.id}/members`).then(setMembers).catch(() => {});
  }, [selected]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault(); setPSaving(true);
    try {
      const p = await apiPost('/api/projects', { name: pName, description: pDesc || undefined });
      setProjects(prev => [p, ...prev]);
      setShowCreate(false); setPName(''); setPDesc('');
    } finally { setPSaving(false); }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault(); if (!selected || !tName.trim()) return;
    setTSaving(true);
    try {
      const t = await apiPost('/api/teams', { projectId: selected.id, name: tName });
      setTeams(prev => [...prev, t]); setTName('');
    } finally { setTSaving(false); }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault(); if (!selected || !mUserId.trim()) return;
    setMSaving(true);
    try {
      const m = await apiPost(`/api/projects/${selected.id}/members`, { userId: mUserId, role: mRole });
      setMembers(prev => [...prev, m]); setMUserId('');
    } finally { setMSaving(false); }
  }

  const sidebar = (
    <div className={styles.sidebar}>
      <div className={styles.sideHeader}>
        <span className={styles.sideLabel}>Projects</span>
        <button className={styles.addBtn} onClick={() => setShowCreate(true)}>+</button>
      </div>
      {loading && <div className={styles.sideEmpty}>Loading…</div>}
      {!loading && projects.length === 0 && <div className={styles.sideEmpty}>No projects</div>}
      {projects.map(p => (
        <button key={p.id}
          className={`${styles.sideItem} ${selected?.id === p.id ? styles.sideItemActive : ''}`}
          onClick={() => { setSelected(p); setTab('overview'); }}>
          {p.name}
        </button>
      ))}
    </div>
  );

  return (
    <AppShell nav="projects" sidebar={sidebar}>
      {!selected ? (
        <div className={styles.emptyMain}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '15px' }}>
            Select or create a project
          </span>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <div>
              <div className={styles.projectName}>{selected.name}</div>
              {selected.description && <div className={styles.projectDesc}>{selected.description}</div>}
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {(['overview', 'teams', 'members'] as const).map(t => (
              <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className={styles.overview}>
              <div className={styles.statRow}>
                <div className={styles.stat}><span className={styles.statVal}>{teams.length}</span><span className={styles.statLabel}>Teams</span></div>
                <div className={styles.stat}><span className={styles.statVal}>{members.length}</span><span className={styles.statLabel}>Members</span></div>
              </div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Created</span><span className={styles.infoVal}>{new Date(selected.createdAt).toLocaleDateString()}</span></div>
              {selected.description && <div className={styles.descBlock}>{selected.description}</div>}
            </div>
          )}

          {/* Teams */}
          {tab === 'teams' && (
            <div className={styles.tabContent}>
              <form onSubmit={createTeam} className={styles.inlineForm}>
                <Input placeholder="New team name…" value={tName} onChange={e => setTName(e.target.value)} />
                <Button variant="primary" type="submit" loading={tSaving}>Add Team</Button>
              </form>
              {teams.length === 0 && <div className={styles.tabEmpty}>No teams yet</div>}
              {teams.map(t => (
                <div key={t.id} className={styles.listRow}>
                  <span className={styles.listName}>{t.name}</span>
                  <span className={styles.listMeta}>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Members */}
          {tab === 'members' && (
            <div className={styles.tabContent}>
              <form onSubmit={addMember} className={styles.inlineForm}>
                <Input placeholder="User ID or email…" value={mUserId} onChange={e => setMUserId(e.target.value)} />
                <select className={styles.roleSelect} value={mRole} onChange={e => setMRole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <Button variant="primary" type="submit" loading={mSaving}>Invite</Button>
              </form>
              {members.length === 0 && <div className={styles.tabEmpty}>No members yet</div>}
              {members.map(m => (
                <div key={m.id} className={styles.listRow}>
                  <span className={styles.listName}>{m.userId}</span>
                  <Badge color={roleColor(m.role) as 'amber' | 'teal' | 'muted'}>{m.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create project modal */}
      {showCreate && (
        <div className={styles.backdrop} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>New Project</div>
            <form onSubmit={createProject} className={styles.modalForm}>
              <Input label="Name" value={pName} onChange={e => setPName(e.target.value)} required />
              <Input label="Description (optional)" value={pDesc} onChange={e => setPDesc(e.target.value)} />
              <div className={styles.modalFooter}>
                <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" type="submit" loading={pSaving}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
