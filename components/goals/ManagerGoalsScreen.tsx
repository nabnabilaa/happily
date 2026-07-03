"use client";

import React, { useState, useMemo } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import ScreenHeader from "@/components/ui/ScreenHeader";
import HRAttendanceView from "@/components/goals/HRAttendanceView";
import ManagerTeamKPIView from "@/components/goals/ManagerTeamKPIView";
import ManagerPersonalView from "@/components/goals/ManagerPersonalView";
import ManagerMembersView from "@/components/goals/ManagerMembersView";
import ManagerDailyTasksView from "@/components/goals/ManagerDailyTasksView";
import { useManagerGoals } from "@/hooks/useManagerGoals";

interface Props { openModal: (name: string, props?: any) => void; }

export default function ManagerGoalsScreen({ openModal }: Props) {
  const { state, user, updateState, notify } = useHP();
  const [activeTab, setActiveTab] = useState<'kpi' | 'dailytasks' | 'members' | 'attendance' | 'personal'>('kpi');
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | number | null>(null);

  const {
    loadingKpis,
    combinedMyGoals,
    assignedGoals,
    topLevelGoals,
    handleVerifyTask,
    handleRejectTask,
    handleManagerVerifyKpiTask,
    handleManagerRejectKpiTask,
    executeDeleteGoal,
    handleEditProgress,
    handleApproveGoal,
    handleRejectGoal,
    handleRevisionGoal
  } = useManagerGoals(state, user, updateState, notify);

  const membersList = useMemo(() => {
    return state?.managerData?.members || [];
  }, [state?.managerData?.members]);

  if (!state || !user) return null;

  const teamTasks = state.managerData?.teamTasks || [];
  const personalTasks = state.priorities || [];

  const performDeleteGoal = () => {
    if (goalToDelete) executeDeleteGoal(goalToDelete);
    setGoalToDelete(null);
  };

  const executeDeleteTask = () => {
    if (!taskToDelete) return;
    const tId = taskToDelete;
    updateState((s: any) => {
      const newPriorities = s.priorities.filter((p: any) => p.id !== tId);
      const taskObj = s.priorities.find((p: any) => p.id === tId);
      const targetId = taskObj?.goal_id || taskObj?.kpi_id;
      const updatedGoals = s.goals.map((goal: any) => {
        if (targetId && String(goal.id) === String(targetId)) {
          const todayTasks = newPriorities.filter((p: any) => 
            (p.goal_id && String(p.goal_id) === String(goal.id)) || 
            (p.kpi_id && String(p.kpi_id) === String(goal.id))
          );
          const total = todayTasks.length;
          const completed = todayTasks.filter((p: any) => p.done).length;
          const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { 
            ...goal, 
            progress: newProgress, 
            metric: total > 0 ? `${completed}/${total} task selesai` : `0/0 task selesai`
          };
        }
        return goal;
      });

      const extraState: any = {};
      if (s.focusTaskId === tId) {
        extraState.focusTaskId = null;
        extraState.focusProgress = 0;
        extraState.intention = "";
      }

      return {
        ...s,
        priorities: newPriorities,
        goals: updatedGoals,
        ...extraState
      };
    });
    setTaskToDelete(null);
  };

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Tim, Target & KPI" subtitle="Pantau goal tim dan performa anggota" />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {([
          { key: 'kpi', label: 'Target & KPI Tim' },
          { key: 'dailytasks', label: 'Tugas Harian' },
          { key: 'personal', label: 'Personal' },
          { key: 'members', label: 'Anggota' },
          { key: 'attendance', label: 'Absensi' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className="hp-tap" style={{
            flex: '0 0 auto', padding: '10px 16px', borderRadius: 14,
            background: activeTab === t.key ? HP_TOKENS.blue : HP_TOKENS.lineSoft,
            color: activeTab === t.key ? '#fff' : HP_TOKENS.inkSoft,
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'kpi' && (
        <ManagerTeamKPIView
          topLevelGoals={topLevelGoals}
          assignedGoals={assignedGoals}
          teamTasks={teamTasks}
          state={state}
          user={user}
          openModal={openModal}
          setGoalToDelete={setGoalToDelete}
          handleEditProgress={handleEditProgress}
          handleVerifyTask={handleVerifyTask}
          handleRejectTask={handleRejectTask}
          handleManagerVerifyKpiTask={handleManagerVerifyKpiTask}
          handleManagerRejectKpiTask={handleManagerRejectKpiTask}
          handleApproveGoal={handleApproveGoal}
          handleRevisionGoal={handleRevisionGoal}
          handleRejectGoal={handleRejectGoal}
        />
      )}

      {activeTab === 'dailytasks' && (
        <ManagerDailyTasksView
          teamTasks={teamTasks}
          membersList={membersList}
          handleVerifyTask={handleVerifyTask}
          handleRejectTask={handleRejectTask}
        />
      )}

      {activeTab === 'personal' && (
        <ManagerPersonalView
          personalTasks={personalTasks}
          combinedMyGoals={combinedMyGoals}
          loadingKpis={loadingKpis}
          updateState={updateState}
          openModal={openModal}
          setTaskToDelete={setTaskToDelete}
        />
      )}

      {activeTab === 'members' && (
        <ManagerMembersView membersList={membersList} />
      )}

      {activeTab === 'attendance' && (
        <HRAttendanceView currentUser={user} openModal={openModal} />
      )}

      {/* Delete Goal Modal */}
      {goalToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 32,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <HPGlyph name="target" size={32} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, marginBottom: 8 }}>Hapus Goal?</div>
            <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 24 }}>
              Goal ini akan dihapus dari sistem.
            </div>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button onClick={performDeleteGoal} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.coral, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Ya, Hapus
              </button>
              <button onClick={() => setGoalToDelete(null)} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Modal */}
      {taskToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 32,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <HPGlyph name="trash" size={32} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, marginBottom: 8 }}>Hapus Task Harian?</div>
            <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 24 }}>
              Task ini akan dihapus dari prioritas Anda.
            </div>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button onClick={executeDeleteTask} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.coral, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Ya, Hapus
              </button>
              <button onClick={() => setTaskToDelete(null)} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
