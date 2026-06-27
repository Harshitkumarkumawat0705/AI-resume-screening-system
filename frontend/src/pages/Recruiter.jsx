import React, { useState, useEffect } from 'react';
import { fetchJobs, createJob, fetchApplicantsForJob, extractErrorMessage, downloadResume } from '../api/service';

const Recruiter = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  
  // Job Form state
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('');
  
  // UI states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Load jobs initially
  const loadJobs = async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0]);
      }
    } catch (error) {
      setStatusMessage(extractErrorMessage(error));
      setIsError(true);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Fetch applicants when selectedJob changes
  useEffect(() => {
    const loadApplicants = async () => {
      if (!selectedJob) return;
      setLoadingApplicants(true);
      try {
        const data = await fetchApplicantsForJob(selectedJob.id);
        // Pre-sorted by match score (re-enforced here on frontend)
        const sorted = [...data].sort((a, b) => b.match_score - a.match_score);
        setApplicants(sorted);
      } catch (error) {
        console.error('Failed to load applicants:', error);
      } finally {
        setLoadingApplicants(false);
      }
    };
    loadApplicants();
  }, [selectedJob]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    setIsError(false);

    if (!newJobTitle.trim() || !newJobDesc.trim() || !newJobSkills.trim()) {
      setStatusMessage('Please fill in all job creation fields.');
      setIsError(true);
      return;
    }

    try {
      const jobData = {
        title: newJobTitle,
        description: newJobDesc,
        required_skills: newJobSkills.split(',').map(s => s.trim()).filter(Boolean)
      };

      const newJob = await createJob(jobData);
      setJobs(prevJobs => [...prevJobs, newJob]);
      setSelectedJob(newJob);
      
      // Clear inputs and collapse form
      setNewJobTitle('');
      setNewJobDesc('');
      setNewJobSkills('');
      setIsFormOpen(false);
      
      setStatusMessage('Job posting created successfully!');
    } catch (error) {
      setStatusMessage(extractErrorMessage(error));
      setIsError(true);
    }
  };

  const handleDownloadResume = async (applicationId) => {
    try {
      await downloadResume(applicationId);
    } catch (error) {
      setStatusMessage(extractErrorMessage(error));
      setIsError(true);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const getSkillsList = (skillsStr) => {
    if (!skillsStr) return [];
    return skillsStr.split(',').map(s => s.trim()).filter(Boolean);
  };

  // Color code scores helper
  const getScoreClass = (score) => {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-mid';
    return 'score-low';
  };

  return (
    <div className="recruiter-dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>Resume <span>RMS</span></h1>
          <span className="badge">Recruiter Portal</span>
        </div>
        <button onClick={handleLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="dashboard-layout">
        {/* Left Side Panel - Jobs List and Create Button */}
        <aside className="jobs-panel">
          <div className="panel-actions">
            <h2 className="panel-title">Active Positions ({jobs.length})</h2>
            <button
              onClick={() => {
                setIsFormOpen(!isFormOpen);
                setStatusMessage('');
              }}
              className="add-job-btn"
            >
              {isFormOpen ? 'View Positions' : '+ Post a Job'}
            </button>
          </div>

          {statusMessage && (
            <div className={`status-banner ${isError ? 'banner-error' : 'banner-success'}`}>
              {statusMessage}
            </div>
          )}

          {isFormOpen ? (
            // Job posting form
            <form onSubmit={handleCreateJob} className="job-form">
              <h3>Post a New Job Opening</h3>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  placeholder="e.g., Senior Full Stack Engineer"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Summarize the core roles, requirements, and background expectations..."
                  rows="4"
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Required Skills (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., Python, FastAPI, React, SQL"
                  value={newJobSkills}
                  onChange={(e) => setNewJobSkills(e.target.value)}
                  required
                />
                <small className="help-text">Separate skills with commas</small>
              </div>

              <button type="submit" className="submit-job-btn">Publish Opening</button>
            </form>
          ) : (
            // Active jobs list
            <div className="jobs-list">
              {jobs.length === 0 ? (
                <p className="no-jobs">No jobs posted yet. Click "+ Post a Job" to start.</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedJob(job);
                      setStatusMessage('');
                    }}
                  >
                    <h3>{job.title}</h3>
                    <div className="skills-tags-preview">
                      {getSkillsList(job.required_skills).slice(0, 3).map((skill, index) => (
                        <span key={index} className="skill-tag-micro">{skill}</span>
                      ))}
                      {getSkillsList(job.required_skills).length > 3 && (
                        <span className="skill-tag-micro-more">+{getSkillsList(job.required_skills).length - 3}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>

        {/* Right Side Panel - Application Pipeline */}
        <main className="detail-panel">
          {selectedJob ? (
            <div className="pipeline-workspace">
              <div className="workspace-header">
                <div className="job-meta">
                  <h2>{selectedJob.title}</h2>
                  <p className="job-desc-preview">{selectedJob.description}</p>
                </div>
                <div className="applicant-count">
                  <span className="count-num">{applicants.length}</span>
                  <span className="count-label">Applicants</span>
                </div>
              </div>

              {loadingApplicants ? (
                <div className="workspace-loader">Loading candidate profiles...</div>
              ) : applicants.length === 0 ? (
                <div className="empty-pipeline">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <h3>No Applicants Yet</h3>
                  <p>No candidates have applied to this position. Active candidate filings will appear here ranked by their AI match score.</p>
                </div>
              ) : (
                <div className="pipeline-table-container">
                  <table className="pipeline-table">
                    <thead>
                      <tr>
                        <th>Candidate Email</th>
                        <th>AI Match Score</th>
                        <th>Identified Skill Gaps</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.map((applicant) => (
                        <tr key={applicant.id}>
                          <td className="candidate-email">{applicant.candidate_email}</td>
                          <td>
                            <span className={`score-badge ${getScoreClass(applicant.match_score)}`}>
                              {applicant.match_score}%
                            </span>
                          </td>
                          <td className="candidate-gaps">
                            {applicant.missing_skills ? (
                              <div className="gaps-tags-list">
                                {applicant.missing_skills.split(',').map((skill, i) => (
                                  <span key={i} className="gap-tag-micro">{skill}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="match-perfect">No Gaps! Perfect Match</span>
                            )}
                          </td>
                          <td>
                            <span className="status-label">{applicant.status}</span>
                          </td>
                          <td>
                            {applicant.resume_path ? (
                              <button
                                onClick={() => handleDownloadResume(applicant.id)}
                                className="download-resume-btn"
                                title="Download Resume PDF"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 3v12"/>
                                </svg>
                                <span>Resume</span>
                              </button>
                            ) : (
                              <span className="no-resume">No Resume</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="select-job-prompt">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <h3>No Position Selected</h3>
              <p>Select an active job posting on the left panel to inspect the AI-ranked applicant funnel and run review pipelines.</p>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        .recruiter-dashboard {
          min-height: 100vh;
          background: #09090b;
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 0;
        }

        .recruiter-dashboard * {
          box-sizing: border-box;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(9, 9, 11, 0.8);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-brand h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .header-brand h1 span {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-brand .badge {
          background: rgba(168, 85, 247, 0.1);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.2);
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
        }

        .logout-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #d4d4d8;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: inherit;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .dashboard-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          flex: 1;
          height: calc(100vh - 73px);
          overflow: hidden;
        }

        /* Left Side Panel */
        .jobs-panel {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.01);
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow-y: auto;
        }

        .panel-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #e4e4e7;
        }

        .add-job-btn {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-job-btn:hover {
          background: #6366f1;
          color: #ffffff;
        }

        .status-banner {
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .banner-success {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .banner-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .no-jobs {
          color: #71717a;
          text-align: center;
          font-size: 13px;
          margin-top: 40px;
        }

        .job-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .job-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .job-card.active {
          background: rgba(168, 85, 247, 0.08);
          border-color: #a855f7;
        }

        .job-card h3 {
          margin: 0 0 10px 0;
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
        }

        .skills-tags-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .skill-tag-micro {
          background: rgba(255, 255, 255, 0.03);
          color: #a1a1aa;
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .skill-tag-micro-more {
          color: #a855f7;
          font-size: 10px;
          padding: 1px 3px;
          font-weight: 600;
        }

        /* Job creation form */
        .job-form {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .job-form h3 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
        }

        .job-form .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .job-form label {
          color: #a1a1aa;
          font-size: 12px;
          font-weight: 500;
        }

        .job-form input[type="text"],
        .job-form textarea {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .job-form input:focus,
        .job-form textarea:focus {
          outline: none;
          border-color: #a855f7;
          background: rgba(255, 255, 255, 0.06);
        }

        .help-text {
          font-size: 11px;
          color: #71717a;
          margin-top: 2px;
        }

        .submit-job-btn {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: #ffffff;
          border: none;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 6px;
        }

        .submit-job-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);
        }

        /* Right Side Panel */
        .detail-panel {
          padding: 32px 40px;
          overflow-y: auto;
          background: #09090b;
        }

        .select-job-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #71717a;
          text-align: center;
        }

        .select-job-prompt svg {
          margin-bottom: 16px;
          color: #27272a;
        }

        .select-job-prompt h3 {
          color: #e4e4e7;
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .select-job-prompt p {
          max-width: 400px;
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .pipeline-workspace {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 20px;
        }

        .job-meta {
          flex: 1;
          padding-right: 20px;
        }

        .job-meta h2 {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 10px 0;
          letter-spacing: -0.5px;
        }

        .job-desc-preview {
          font-size: 14px;
          color: #a1a1aa;
          line-height: 1.6;
          margin: 0;
        }

        .applicant-count {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 100px;
        }

        .count-num {
          font-size: 24px;
          font-weight: 700;
          color: #a855f7;
        }

        .count-label {
          font-size: 10px;
          color: #71717a;
          text-transform: uppercase;
          margin-top: 2px;
          font-weight: 600;
        }

        .workspace-loader {
          color: #a1a1aa;
          font-size: 14px;
          text-align: center;
          padding: 40px;
        }

        .empty-pipeline {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 60px 40px;
          color: #71717a;
        }

        .empty-pipeline svg {
          color: #27272a;
          margin-bottom: 16px;
        }

        .empty-pipeline h3 {
          color: #e4e4e7;
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .empty-pipeline p {
          max-width: 440px;
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        /* Pipeline Table */
        .pipeline-table-container {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          overflow: hidden;
        }

        .pipeline-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .pipeline-table th,
        .pipeline-table td {
          padding: 16px 24px;
          font-size: 14px;
        }

        .pipeline-table th {
          background: rgba(255, 255, 255, 0.02);
          font-weight: 600;
          color: #a1a1aa;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .pipeline-table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: #e4e4e7;
        }

        .pipeline-table tr:last-child td {
          border-bottom: none;
        }

        .candidate-email {
          font-weight: 500;
        }

        /* Score Badges */
        .score-badge {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          display: inline-block;
        }

        .score-high {
          background: rgba(16, 185, 129, 0.08);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.05);
        }

        .score-mid {
          background: rgba(251, 191, 36, 0.08);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.15);
        }

        .score-low {
          background: rgba(239, 68, 68, 0.08);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }

        .candidate-gaps {
          max-width: 300px;
        }

        .gaps-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .gap-tag-micro {
          background: rgba(239, 68, 68, 0.05);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.1);
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .match-perfect {
          color: #34d399;
          font-size: 12px;
          font-weight: 500;
        }

        .status-label {
          background: rgba(255, 255, 255, 0.04);
          color: #d4d4d8;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .download-resume-btn {
          background: rgba(168, 85, 247, 0.1);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .download-resume-btn:hover {
          background: #a855f7;
          color: #ffffff;
          border-color: #a855f7;
          transform: translateY(-1px);
        }

        .no-resume {
          color: #71717a;
          font-size: 12px;
          font-style: italic;
        }
      `}} />
    </div>
  );
};

export default Recruiter;
