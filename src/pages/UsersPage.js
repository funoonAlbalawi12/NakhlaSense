import { useEffect, useMemo, useState } from "react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../auth/permissions";
import {
  recordActivity,
  subscribeToActivityLogs,
} from "../firebase/services/activityLogService";
import {
  deleteRecommendation,
  saveRecommendation,
  subscribeToRecommendations,
} from "../firebase/services/recommendationsService";
import { subscribeToUsers, updateUserRecord } from "../firebase/services/usersService";
import "./UsersPage.css";

const emptyRecommendation = {
  condition: "",
  title: "",
  description: "",
  priority: "Medium",
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [draft, setDraft] = useState(emptyRecommendation);

  useEffect(() => {
    const unsubscribeUsers = subscribeToUsers(user, setUsers);
    const unsubscribeRecommendations = subscribeToRecommendations(user, setRecommendations);
    const unsubscribeLogs = subscribeToActivityLogs(user, setActivityLogs);
    return () => {
      unsubscribeUsers?.();
      unsubscribeRecommendations?.();
      unsubscribeLogs?.();
    };
  }, [user]);

  const activeUsers = useMemo(() => users.filter((item) => item.active !== false).length, [users]);

  const handleRoleChange = async (targetUser, role) => {
    await updateUserRecord(user, targetUser.id || targetUser.uid, { role });
    await recordActivity(user, {
      type: "user_role_updated",
      entity: "user",
      entityId: targetUser.id || targetUser.uid,
      message: `Changed ${targetUser.email} role to ${role}`,
    });
  };

  const handleToggleActive = async (targetUser) => {
    const nextActive = targetUser.active === false;
    await updateUserRecord(user, targetUser.id || targetUser.uid, { active: nextActive });
    await recordActivity(user, {
      type: "user_status_updated",
      entity: "user",
      entityId: targetUser.id || targetUser.uid,
      message: `${nextActive ? "Activated" : "Deactivated"} ${targetUser.email}`,
    });
  };

  const handleRecommendationSave = async () => {
    if (!draft.condition || !draft.title || !draft.description) {
      return;
    }

    await saveRecommendation(user, draft);
    await recordActivity(user, {
      type: "recommendation_saved",
      entity: "recommendation",
      message: `Saved recommendation ${draft.title}`,
    });
    setDraft(emptyRecommendation);
  };

  const handleRecommendationDelete = async (recommendationId) => {
    await deleteRecommendation(user, recommendationId);
    await recordActivity(user, {
      type: "recommendation_deleted",
      entity: "recommendation",
      entityId: recommendationId,
      message: `Deleted recommendation ${recommendationId}`,
    });
  };

  return (
    <>
      <Navigation />
      <div className="dashboard-page container-fluid">
        <div className="container py-5 users-page">
          <div className="app-page-header">
            <div className="app-page-header-copy">
              <h1 className="page-title mb-2">Users and Recommendations</h1>
              <p className="users-subtitle">
                Admin workspace for role assignment, account activation, and action-library updates.
              </p>
            </div>
          </div>

          <div className="users-stats">
            <div className="users-stat-card">
              <small>Total Users</small>
              <strong>{users.length}</strong>
            </div>
            <div className="users-stat-card">
              <small>Active Users</small>
              <strong>{activeUsers}</strong>
            </div>
            <div className="users-stat-card">
              <small>Recommendations</small>
              <strong>{recommendations.length}</strong>
            </div>
          </div>

          <div className="users-grid">
            <section className="users-card">
              <div className="users-card-head">
                <h3>System Users</h3>
              </div>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id || item.uid}>
                      <td>{item.email}</td>
                      <td>
                        <select
                          value={item.role || ROLES.OPERATOR}
                          onChange={(e) => handleRoleChange(item, e.target.value)}
                        >
                          <option value={ROLES.ADMIN}>Admin</option>
                          <option value={ROLES.OPERATOR}>Operator</option>
                          <option value={ROLES.FARMER}>Farmer</option>
                        </select>
                      </td>
                      <td>{item.active === false ? "Inactive" : "Active"}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleToggleActive(item)}
                        >
                          {item.active === false ? "Activate" : "Deactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="users-card">
              <div className="users-card-head">
                <h3>Recommended Actions Library</h3>
              </div>
              <div className="recommendation-form">
                <input
                  type="text"
                  placeholder="Condition"
                  value={draft.condition}
                  onChange={(e) => setDraft((prev) => ({ ...prev, condition: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Action title"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
                <textarea
                  rows="3"
                  placeholder="Describe the action"
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                />
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <button className="btn btn-success" onClick={handleRecommendationSave}>
                  Save Recommendation
                </button>
              </div>

              <div className="recommendation-list">
                {recommendations.map((item) => (
                  <article key={item.id} className="recommendation-card">
                    <div className="recommendation-top">
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.condition}</p>
                      </div>
                      <span>{item.priority}</span>
                    </div>
                    <p>{item.description}</p>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleRecommendationDelete(item.id)}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="users-card mt-4">
            <div className="users-card-head">
              <h3>Recent Activity</h3>
            </div>
            <div className="recommendation-list">
              {activityLogs.length ? (
                activityLogs.slice(0, 8).map((log) => (
                  <article key={log.id} className="recommendation-card">
                    <div className="recommendation-top">
                      <div>
                        <h4>{log.type}</h4>
                        <p>{log.actorEmail}</p>
                      </div>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{log.message}</p>
                  </article>
                ))
              ) : (
                <div className="text-muted">No activity records yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
